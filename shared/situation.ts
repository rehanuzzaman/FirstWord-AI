/**
 * Situation engine. A situation is a small, voice-only story with a goal, a
 * need for the pet, steps, and a success condition. The story moves only when
 * the child speaks. Silence only changes Mithu's mood and offers help; it never
 * advances the plot and never punishes the child.
 */

/** Silence timings in milliseconds. Change them here, nowhere else. */
export const SILENCE_TIMES = {
  worried: 8000,
  hint: 16000,
  choice: 24000,
} as const;

export type SilenceStage = "none" | "worried" | "hint" | "choice";

/** Which silence reaction applies after `ms` of child silence. */
export function silenceStage(ms: number): SilenceStage {
  if (ms >= SILENCE_TIMES.choice) return "choice";
  if (ms >= SILENCE_TIMES.hint) return "hint";
  if (ms >= SILENCE_TIMES.worried) return "worried";
  return "none";
}

export interface SituationState {
  /** Names of dishes the child has offered in this situation (from valid actions). */
  servedDishes: string[];
  /** Turns the child spoke in this situation. */
  childTurns: number;
}

export interface Situation {
  id: "restaurant";
  title: string;
  goal: string;
  petNeed: string;
  steps: { id: string; label: string }[];
  success: (s: SituationState) => boolean;
}

export const RESTAURANT: Situation = {
  id: "restaurant",
  title: "রেস্টুরেন্ট",
  goal: "শিশু ওয়েটার বা শেফ হয়ে মিঠুকে খাবার দেবে।",
  petNeed: "মিঠু খুব ক্ষুধার্ত, তাকে খাবার অর্ডার নিতে হবে।",
  steps: [
    { id: "greet", label: "মিঠু খিদের কথা বলে" },
    { id: "offer", label: "শিশু বলে কী খাবার দেবে" },
    { id: "serve", label: "খাবার পরিবেশন হয়" },
    { id: "enjoy", label: "মিঠু খুশি হয়ে খায়" },
  ],
  success: (s) => s.servedDishes.length >= 1,
};

/**
 * Scripted Mithu lines for silence. These are fixed on purpose: they are not
 * answers to the child and are labelled "scripted" on screen.
 */
export const SILENCE_LINES: Record<Exclude<SilenceStage, "none">, string> = {
  worried: "আমার খুব খিদে পেয়েছে... আমি কী করব?",
  hint: "ভাত বা মাছ দিতে পারো, অথবা তোমার পছন্দের কিছু বলো।",
  choice: "ভাত, মাছ নাকি পিৎজা? যেটা ইচ্ছে বলো, আমি শুনছি।",
};

/** Dish names taken from a turn's actions (object or imagined item). */
export function dishesFromActions(
  actions: { type: string; value?: unknown }[],
): string[] {
  const out: string[] = [];
  for (const a of actions) {
    if (a.type === "object" && typeof a.value === "string") out.push(a.value);
    if (a.type === "imagine" && a.value && typeof a.value === "object") {
      const name = (a.value as { name?: unknown }).name;
      if (typeof name === "string") out.push(name);
    }
  }
  return out;
}

export function advance(
  s: SituationState,
  actions: { type: string; value?: unknown }[],
): SituationState {
  return {
    servedDishes: [...s.servedDishes, ...dishesFromActions(actions)].slice(0, 20),
    childTurns: s.childTurns + 1,
  };
}
