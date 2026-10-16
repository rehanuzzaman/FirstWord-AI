import { buildMessages, type ChatContext } from "./roleplay.js";
import { validateReply, type ChatReply } from "./groq.js";

/**
 * Optional Google Gemini provider (chat + text-to-speech). OFF unless
 * GEMINI_API_KEY is set on the server. The key is never written to disk,
 * returned to the browser, or logged. Chat uses the same role-play brief and
 * validator as Groq, so the two providers behave the same way.
 */
function getKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY || "";
  return raw
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);
}

export const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
export const geminiEnabled = getKeys().length > 0;

/** Tracks quota cooldown per API key. */
const keyCooldowns = new Map<string, number>();

export function cloudCooling(): boolean {
  const keys = getKeys();
  if (!keys.length) return true;
  return keys.every((k) => (keyCooldowns.get(k) ?? 0) > Date.now());
}

export function noteKeyQuota(key: string, retryDelaySec = 1800) {
  keyCooldowns.set(key, Date.now() + retryDelaySec * 1000);
}

function getAvailableKeys(): string[] {
  const now = Date.now();
  return getKeys().filter((k) => (keyCooldowns.get(k) ?? 0) <= now);
}

/** Tries the configured model, then a backup if the first is busy (503/429). */
async function generate(model: string, body: unknown) {
  const available = getAvailableKeys();
  if (!available.length) throw new Error("Gemini cooling down");
  const models = [model, "gemini-3.1-flash-lite"].filter(
    (m, i, a) => a.indexOf(m) === i,
  );
  let lastError = "";
  for (const key of available) {
    for (const m of models) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (r.ok) return r.json();
      lastError = `Gemini HTTP ${r.status}`;
      if (r.status === 429) {
        noteKeyQuota(key);
        break; // try next key
      }
      if (r.status !== 503) break;
    }
  }
  throw new Error(lastError);
}

export async function converse(ctx: ChatContext): Promise<ChatReply | null> {
  if (!getKeys().length) return null;
  const m = buildMessages(ctx);
  const contents = [
    ...m.examples.flatMap((e) => [
      { role: "user", parts: [{ text: e.user }] },
      { role: "model", parts: [{ text: e.assistant }] },
    ]),
    ...m.history.flatMap((h) => [
      { role: "user", parts: [{ text: h.user }] },
      { role: "model", parts: [{ text: h.assistant }] },
    ]),
    { role: "user", parts: [{ text: m.current }] },
  ];
  const data = await generate(geminiModel, {
    systemInstruction: { parts: [{ text: m.system }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 400,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  });
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== "string") throw new Error("Gemini empty response");
  return validateReply(raw, ctx.language);
}

export const geminiTtsModel = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
export const geminiVoice = process.env.GEMINI_TTS_VOICE || "Kore";
/** Short English delivery cue; Gemini TTS reads it as direction, not speech. Set to "" to disable. */
export const geminiStyle =
  process.env.GEMINI_TTS_STYLE ?? "Say cheerfully and warmly, like a friendly storyteller:";

/** Google Gemini text-to-speech. Returns a WAV buffer, or throws. */
export async function speakGemini(text: string): Promise<Buffer> {
  const available = getAvailableKeys();
  if (!available.length) throw new Error("Gemini cooling down or not configured");

  const models = [geminiTtsModel, "gemini-3.8-flash-lite-tts"].filter(
    (m, i, a) => a.indexOf(m) === i,
  );
  let lastError = "";

  for (const key of available) {
    for (const m of models) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: `${geminiStyle} ${text.slice(0, 400)}` }] },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: geminiVoice } },
              },
            },
          }),
          signal: AbortSignal.timeout(12000),
        },
      );
      if (r.ok) {
        const data = await r.json();
        const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!part?.data) throw new Error("Gemini TTS empty");
        const pcm = Buffer.from(part.data, "base64");
        const match = /rate=(\d+)/.exec(String(part.mimeType || ""));
        return wavFromPcm16(pcm, match ? Number(match[1]) : 24000);
      }
      lastError = `Gemini TTS HTTP ${r.status}`;
      if (r.status === 429) {
        noteKeyQuota(key);
        break; // try next key
      }
      if (r.status !== 503) break;
    }
  }
  throw new Error(lastError);
}

function wavFromPcm16(pcm: Buffer, rate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
