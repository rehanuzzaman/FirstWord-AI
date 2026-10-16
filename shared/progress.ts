/**
 * Per-turn progress data. These are plain counts and timings. They are NOT a
 * diagnosis, not a pronunciation score, and not a developmental age.
 */
export interface TurnMetrics {
  words: number;
  newWords: number;
  sentenceWords: number;
  responseMs: number;
}

/** Splits Bangla or English text into lower-cased word tokens. */
export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[।!?,.;:"'()\-–—]/gu, " ")
    .split(/\s+/u)
    .filter((w) => w.length > 0);
}

export function turnMetrics(
  text: string,
  previousChildTexts: string[],
  startedAt: number,
  now = Date.now(),
): TurnMetrics {
  const words = wordsOf(text);
  const seen = new Set(previousChildTexts.flatMap((t) => wordsOf(t)));
  const newWords = new Set(words.filter((w) => !seen.has(w))).size;
  const sentences = text.split(/[।!?.]+/u).filter((s) => s.trim().length > 0).length;
  return {
    words: words.length,
    newWords,
    sentenceWords: sentences > 0 ? Math.round((words.length / sentences) * 10) / 10 : words.length,
    responseMs: Math.max(0, now - startedAt),
  };
}

/** Averages over a list of turns with metrics. Used by the parent dashboard. */
export function summarizeMetrics(list: TurnMetrics[]) {
  if (!list.length) return null;
  const avg = (f: (m: TurnMetrics) => number) =>
    Math.round((list.reduce((a, m) => a + f(m), 0) / list.length) * 10) / 10;
  return {
    turns: list.length,
    avgWords: avg((m) => m.words),
    avgNewWords: avg((m) => m.newWords),
    avgSentenceWords: avg((m) => m.sentenceWords),
    avgResponseMs: Math.round(avg((m) => m.responseMs)),
  };
}
