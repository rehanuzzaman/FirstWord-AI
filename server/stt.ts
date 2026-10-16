/**
 * Speech to text. Default: Groq whisper-large-v3 with language "bn" (free tier,
 * needs GROQ_API_KEY, read only from process.env). Fallback: the local Whisper
 * service on port 8001 (offline). Transcripts are never invented: an empty or
 * failed result is reported as "no speech" so Mithu can ask "আবার বলবে?".
 */
import { transcribe as localTranscribe } from "./providers.js";

const KEY = process.env.GROQ_API_KEY?.trim() || "";
export const sttModel = process.env.GROQ_STT_MODEL || "whisper-large-v3";

export interface SttResult {
  text: string;
  provider: "groq-whisper" | "local-whisper" | "none";
}

export async function transcribeGroq(
  audio: Buffer,
  mime: string,
  language: "bn" | "en",
): Promise<string> {
  if (!KEY) throw new Error("Groq key not set");
  const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "webm";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mime }), `speech.${ext}`);
  form.append("model", sttModel);
  form.append("language", language);
  form.append("response_format", "json");
  form.append("temperature", "0");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Groq STT HTTP ${r.status}`);
  const data = (await r.json()) as { text?: string };
  return String(data.text || "").trim().slice(0, 600);
}

/** Groq first, then the offline local Whisper. */
export async function transcribeSpeech(
  audio: Buffer,
  mime: string,
  language: "bn" | "en",
): Promise<SttResult> {
  if (KEY) {
    try {
      const text = await transcribeGroq(audio, mime, language);
      return { text, provider: "groq-whisper" };
    } catch {
      /* fall back to the offline model below */
    }
  }
  try {
    const text = await localTranscribe(audio, mime, language);
    return { text, provider: "local-whisper" };
  } catch {
    return { text: "", provider: "none" };
  }
}
