/**
 * Text to speech behind ONE function: speakLine(text).
 * Order: cached audio → Edge TTS (Bangla bn-BD, free, no key) → the existing
 * local chain in providers.ts (Gemini if configured, local MMS, eSpeak NG).
 * Pet lines are cached on disk so repeated lines cost no extra calls.
 * To swap the voice later, change only this file.
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { speak as legacySpeak } from "./providers.js";
import { speakGemini, geminiEnabled, cloudCooling } from "./gemini.js";

export const edgeVoice = process.env.EDGE_TTS_VOICE || "bn-BD-NabanitaNeural";
const cacheDir = path.resolve(process.cwd(), "data/tts-cache");
const MAX_CACHE_FILES = 300;

export type VoiceSource = "cache" | "gemini" | "edge-tts" | "local-fallback";
export interface SpeechLine {
  audio: Buffer;
  mime: string;
  source: VoiceSource;
}

function cacheKey(text: string) {
  return createHash("sha256").update(`${edgeVoice}|${text}`).digest("hex");
}

async function runEdgeTts(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(edgeVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: "-6%", pitch: "+0Hz" });
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => {
        tts.close();
        reject(new Error("Edge TTS timeout"));
      }, 15000);
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", () => {
        clearTimeout(timer);
        tts.close();
        resolve(Buffer.concat(chunks));
      });
      audioStream.on("error", (err) => {
        clearTimeout(timer);
        tts.close();
        reject(err);
      });
    });
  } catch (err) {
    tts.close();
    throw err;
  }
}

async function trimCache() {
  const { readdir, stat } = await import("node:fs/promises");
  const files = await readdir(cacheDir).catch(() => []);
  if (files.length <= MAX_CACHE_FILES) return;
  const stats = await Promise.all(
    files.map(async (f) => ({ f, t: (await stat(path.join(cacheDir, f))).mtimeMs })),
  );
  stats.sort((a, b) => a.t - b.t);
  for (const s of stats.slice(0, files.length - MAX_CACHE_FILES)) {
    await unlink(path.join(cacheDir, s.f)).catch(() => {});
  }
}

export async function speakLine(text: string): Promise<SpeechLine> {
  const clean = text.trim().slice(0, 400);
  if (!clean) throw new Error("empty text");
  await mkdir(cacheDir, { recursive: true });
  const base = path.join(cacheDir, cacheKey(clean));
  for (const [ext, mime] of [[".wav", "audio/wav"], [".mp3", "audio/mpeg"]] as const) {
    try {
      const audio = await readFile(base + ext);
      return { audio, mime, source: ext === ".wav" ? "gemini" : "cache" };
    } catch {
      /* not cached in this format */
    }
  }
  // Bengali first: Gemini's ultra-realistic Bangla voice when a key is configured and not in quota cooldown.
  if (geminiEnabled && !cloudCooling()) {
    try {
      const audio = await speakGemini(clean);
      await writeFile(base + ".wav", audio);
      await unlink(base + ".mp3").catch(() => {}); // remove any stale low-quality fallback
      void trimCache();
      return { audio, mime: "audio/wav", source: "gemini" };
    } catch {
      /* fall through to Edge TTS */
    }
  }
  const file = base + ".mp3";
  try {
    const audio = await runEdgeTts(clean);
    if (audio.length < 200) throw new Error("Edge TTS returned no audio");
    await writeFile(file, audio);
    void trimCache();
    return { audio, mime: "audio/mpeg", source: "edge-tts" };
  } catch {
    /* fall through to the local chain */
  }
  const wav = await legacySpeak(clean);
  return { audio: wav, mime: "audio/wav", source: "local-fallback" };
}
