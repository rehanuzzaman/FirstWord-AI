import weights from "../training/intent-model.json";
import { Action, type ActionType } from "../shared/engine.js";
/** Portable inference for the model fitted by training/train_intents.py.
 * No Python process, remote API, or browser data is used during inference. */
export function classify(text: string): {
  action: ActionType | null;
  label: string;
  probability: number;
} {
  const t = text.toLowerCase().replace(/\s\s+/gu, " ");
  const counts = new Map<number, number>();
  const vocab = weights.vocabulary as Record<string, number>;
  for (let n = 2; n <= 4; n++)
    for (let i = 0; i <= t.length - n; i++) {
      const id = vocab[t.slice(i, i + n)];
      if (id !== undefined) counts.set(id, (counts.get(id) || 0) + 1);
    }
  const features = [...counts].map(
    ([id, n]) => [id, (1 + Math.log(n)) * weights.idf[id]] as const,
  );
  const norm = Math.sqrt(features.reduce((a, [, v]) => a + v * v, 0)) || 1;
  const logits = weights.coefficients.map((coef, c) =>
    features.reduce(
      (a, [id, v]) => a + (coef[id] * v) / norm,
      weights.intercepts[c],
    ),
  );
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const best = logits.indexOf(max),
    probability = exps[best] / sum,
    label = weights.classes[best];
  const [type, value] = label.split(":");
  const parsed = Action.safeParse({ type, value });
  return {
    label,
    probability,
    action:
      probability >= weights.threshold && parsed.success ? parsed.data : null,
  };
}
