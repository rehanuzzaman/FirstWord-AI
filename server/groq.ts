import { Action, type ActionType } from "../shared/engine.js";
import { buildMessages, type ChatContext } from "./roleplay.js";

/**
 * Chat provider: Groq (free tier, OpenAI-compatible).
 * Enabled only when GROQ_API_KEY is set. The key is read only from process.env,
 * never returned to the browser or logged. Output is validated action by action.
 */
const KEY = process.env.GROQ_API_KEY?.trim() || "";
export const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const groqEnabled = KEY.length > 0;
let cooldownUntil = 0;

export function groqCooling() {
  return Date.now() < cooldownUntil;
}

export interface ChatReply {
  reply: string;
  actions: ActionType[];
}

/** Validates a model reply against the chat contract. Shared by every provider. */
export function validateReply(raw: unknown, language: "bn" | "en"): ChatReply {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  // Keep each valid action; drop invalid ones instead of discarding the whole reply.
  const actions: ActionType[] = [];
  for (const a of Array.isArray(parsed?.actions) ? parsed.actions : []) {
    const ok = Action.safeParse(a);
    if (ok.success) actions.push(ok.data);
  }
  const reply = String(parsed?.reply ?? "").trim().slice(0, 400);
  if (!reply) throw new Error("empty reply");
  if (language === "bn" && !/[\u0980-\u09FF]/.test(reply))
    throw new Error("reply was not Bangla");
  if (/https?:\/\/|www\.|@/.test(reply)) throw new Error("Unsafe reply");
  return { reply, actions: actions.slice(0, 10) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGroq(messages: unknown[], maxTokens: number) {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.7,
      max_tokens: maxTokens,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages,
    }),
    signal: AbortSignal.timeout(15000),
  });
}

export async function converseGroq(ctx: ChatContext): Promise<ChatReply | null> {
  if (!KEY) return null;
  if (groqCooling()) throw new Error("Groq cooling down");
  const m = buildMessages(ctx);
  const messages = [
    { role: "system", content: m.system },
    ...m.examples.flatMap((e) => [
      { role: "user", content: e.user },
      { role: "assistant", content: e.assistant },
    ]),
    ...m.history.flatMap((h) => [
      { role: "user", content: h.user },
      { role: "assistant", content: h.assistant },
    ]),
    { role: "user", content: m.current },
  ];
  // Restaurant replies are two short sentences, so a smaller cap saves the free-tier token budget.
  const maxTokens = (ctx.world as { scene?: string })?.scene === "restaurant" ? 200 : 300;
  let r = await callGroq(messages, maxTokens);
  if (r.status === 429) {
    // Brief wait and one retry, as the brief requires. The header decides the wait, capped at 4 s here.
    const wait = Number.parseFloat(r.headers.get("retry-after") || "") || 2;
    await sleep(Math.min(wait, 4) * 1000);
    r = await callGroq(messages, maxTokens);
  }
  if (!r.ok) {
    if (r.status === 429) {
      // Still limited: stop calling Groq for a while (max 90 s), then the chain uses Gemini or rules.
      const wait = Number.parseFloat(r.headers.get("retry-after") || "") || 60;
      cooldownUntil = Date.now() + Math.min(wait, 90) * 1000;
    }
    throw new Error(`Groq HTTP ${r.status}`);
  }
  const data = await r.json();
  return validateReply(data?.choices?.[0]?.message?.content, ctx.language);
}
