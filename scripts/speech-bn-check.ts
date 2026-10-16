/* Speech round-trip check on 10 simple Bangla restaurant sentences.
 *   1. Edge TTS (bn-BD) speaks each sentence to an audio file.
 *   2. Groq whisper-large-v3 (language "bn") transcribes that audio.
 *   3. Prints the expected sentence, the transcript, and word recall.
 * This uses a SYNTHETIC voice, not a child's voice. Results are for the speech
 * model on clear adult-TTS audio only. Writes artifacts/speech-bn-check.json.
 */
import "../server/env.js";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { transcribeGroq } from "../server/stt.js";
import { wordsOf } from "../shared/progress.js";

const SENTENCES = [
  "ভাত দাও",
  "আমি পিৎজা বানাব",
  "একটা আম দাও",
  "পানি দাও",
  "মাছ ভাজবো",
  "কেক দাও",
  "চা দাও",
  "আমি শেফ হব",
  "মিষ্টি দেব",
  "আমার মন খারাপ",
];

const outDir = new URL("../artifacts/speech-bn/", import.meta.url);
mkdirSync(outDir, { recursive: true });

async function main() {
  const results: {
    expected: string;
    transcript: string;
    recall: number;
    exact: boolean;
  }[] = [];
  for (let i = 0; i < SENTENCES.length; i++) {
    const text = SENTENCES[i];
    const file = new URL(`speech-${i + 1}.mp3`, outDir).pathname;
    execFileSync(
      "python3",
      ["-m", "edge_tts", "--voice", "bn-BD-NabanitaNeural", "--text", text, "--write-media", file],
      { stdio: "ignore", timeout: 60000 },
    );
    const transcript = await transcribeGroq(readFileSync(file), "audio/mpeg", "bn");
    const want = wordsOf(text);
    const got = new Set(wordsOf(transcript));
    const hit = want.filter((w) => got.has(w)).length;
    const recall = want.length ? Math.round((100 * hit) / want.length) : 0;
    const exact = wordsOf(transcript).join(" ") === want.join(" ");
    results.push({ expected: text, transcript, recall, exact });
    console.log(`${i + 1}. expected:   ${text}\n   transcript: ${transcript || "(nothing)"}\n   word recall ${recall}% · exact ${exact ? "yes" : "no"}`);
  }
  const avg = Math.round(results.reduce((a, r) => a + r.recall, 0) / results.length);
  const exactCount = results.filter((r) => r.exact).length;
  console.log(`\nAverage word recall: ${avg}% · exact matches ${exactCount}/${results.length}`);
  writeFileSync(
    new URL("../artifacts/speech-bn-check.json", import.meta.url),
    JSON.stringify(
      {
        time: new Date().toISOString(),
        model: "whisper-large-v3 (Groq)",
        voice: "bn-BD-NabanitaNeural (Edge TTS, synthetic, not a child)",
        averageWordRecall: avg,
        exactMatches: exactCount,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error("speech check failed:", (e as Error).message);
  process.exit(1);
});
