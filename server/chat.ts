import { converse, geminiEnabled, cloudCooling as geminiCooling } from "./gemini.js";
import { converseGroq, groqEnabled, groqCooling, type ChatReply } from "./groq.js";
import type { ChatContext } from "./roleplay.js";

export type ChatProvider = "groq" | "gemini";
export type ChatResult = ChatReply & {
  provider: ChatProvider;
  /** True when a safety rule replaced or trimmed the model's answer. Shown on screen. */
  override?: boolean;
};

/**
 * One entry point for every chat provider. The choice is CHAT_PROVIDER
 * (groq or gemini). If none is set, Groq is preferred when its key exists,
 * then Gemini. If the chosen provider fails, the other one is tried.
 * Returns null when no provider is configured or both fail; the caller then
 * uses the offline rules.
 */
export const chatProviderSetting = (process.env.CHAT_PROVIDER || "").toLowerCase();

export function activeChatProviders(): ChatProvider[] {
  const order: ChatProvider[] =
    chatProviderSetting === "gemini" ? ["gemini", "groq"] : ["groq", "gemini"];
  return order.filter((p) => (p === "groq" ? groqEnabled : geminiEnabled));
}

const PAIN = /ব্যথা|জ্বর|অসুস্থ|পেট খারাপ|আঘাত|কেটে গেছে|রক্ত/u;
const SAD = /মন খারাপ|কষ্ট|কাঁদ|দুঃখ|ভালো লাগছে না/u;
const ADULT_HINT = /বড়|অভিভাবক|কাউকে|ডাক্তার/u;
const FOOD_ACTIONS = new Set(["object", "imagine"]);

/**
 * Deterministic safety and length rules for the restaurant only. They run after
 * the model and never replace a child's words with invented content, except for
 * the one fixed safety line for pain or illness.
 */
export function shapeRestaurant(
  childText: string,
  r: ChatReply,
): { reply: string; actions: ChatReply["actions"]; override: boolean } {
  let reply = r.reply.trim();
  let actions = r.actions;
  let override = false;
  // A sad child gets comfort, not food.
  if (SAD.test(childText)) {
    actions = actions.filter((a) => !FOOD_ACTIONS.has(a.type));
  }
  // Pain or illness: no food action, and point the child to a grown-up. Never medical advice.
  if (PAIN.test(childText)) {
    actions = actions.filter((a) => !FOOD_ACTIONS.has(a.type));
    if (!ADULT_HINT.test(reply)) {
      reply = "শরীর ভালো না লাগলে বড়দের কাছে যাও আর কাউকে বলো। তুমি কি এখন একটু ভালো আছো?";
      override = true;
    }
  }
  // Two sentences at most: keep the first and the last (usually the question to the child).
  const sentences = reply.split(/(?<=[।!?])\s*/u).filter((s) => s.trim().length > 0);
  if (sentences.length > 2) {
    reply = `${sentences[0]} ${sentences[sentences.length - 1]}`;
  }
  return { reply, actions, override };
}

export async function converseChat(ctx: ChatContext): Promise<ChatResult | null> {
  for (const provider of activeChatProviders()) {
    if (provider === "groq" && groqCooling()) continue;
    if (provider === "gemini" && geminiCooling()) continue;
    try {
      const r =
        provider === "groq" ? await converseGroq(ctx) : await converse(ctx);
      if (!r) continue;
      if ((ctx.world as { scene?: string })?.scene === "restaurant") {
        const shaped = shapeRestaurant(ctx.childText, r);
        return { ...r, ...shaped, provider };
      }
      return { ...r, provider };
    } catch {
      // Try the next configured provider; the caller falls back to rules if none works.
    }
  }
  return null;
}
