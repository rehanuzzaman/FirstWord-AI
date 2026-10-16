import { useEffect, useRef, useState } from "react";
import { MicOff, Mic, X, ShieldCheck } from "lucide-react";
import {
  fetchSpeech,
  playBlob,
  useVoiceSession,
} from "../speech";
import {
  RESTAURANT,
  SILENCE_LINES,
  SILENCE_TIMES,
  advance,
  silenceStage,
  type SilenceStage,
  type SituationState,
} from "../../shared/situation";

type Mood = "happy" | "worried" | "sad" | "neutral";
type Line = { who: "mithu" | "child"; text: string; tag?: string };
type Phase = "idle" | "opening" | "listening" | "thinking" | "mithu";

const OPENING = "স্বাগতম! আমি খুব ক্ষুধার্ত অতিথি। তুমি আজ কী খাওয়াবে?";
const REPEAT = "আবার বলবে?";
const SAD_WORDS = /মন খারাপ|কষ্ট|কাঁদ|দুঃখ|ভালো লাগছে না/u;

const MODE_LABEL: Record<string, string> = {
  groq: "Groq (AI) উত্তর",
  gemini: "Gemini (AI) উত্তর",
  ollama: "লোকাল মডেল উত্তর",
  "local-model": "লোকাল মডেল উত্তর",
  "trained-classifier": "লোকাল শ্রেণিবিন্যাস",
  rules: "অফলাইন নিয়ম (তৈরি উত্তর)",
};

export interface TurnResult {
  profile: unknown;
  reply: string;
  mode: string;
  providerNote: string;
  actions: { type: string; value?: unknown }[];
  fallback?: boolean;
  metrics?: { words: number; newWords: number; sentenceWords: number; responseMs: number };
}

interface Props {
  /** Guardian consent and microphone permission are on for this profile. */
  allowed: boolean;
  onTurn: (result: TurnResult) => void;
  onExit: () => void;
  onOpenParent: () => void;
  /** Sends a child's phrase through the same /api/turn path as typed text. */
  postTurn: (text: string) => Promise<TurnResult>;
}

async function postTranscribe(blob: Blob, mime: string) {
  const r = await fetch("/api/transcribe?language=bn", {
    method: "POST",
    headers: { "Content-Type": mime || "audio/webm" },
    body: blob,
  });
  const data = (await r.json()) as { text?: string; repeat?: boolean; error?: string };
  if (!r.ok) throw new Error(data.error || "transcription failed");
  return String(data.text || "").trim();
}

export default function RestaurantVoice({
  allowed,
  onTurn,
  onExit,
  onOpenParent,
  postTurn,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [mood, setMood] = useState<Mood>("neutral");
  const [silence, setSilence] = useState<SilenceStage>("none");
  const [served, setServed] = useState<SituationState>({ servedDishes: [], childTurns: 0 });
  const [last, setLast] = useState<{ label: string; fallback: boolean; words: number; newWords: number; sentenceWords: number; responseMs: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(false);
  const token = useRef(0);
  const lastActivity = useRef(Date.now());
  const firedStage = useRef<SilenceStage>("none");
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const stopPlayback = useRef<(() => void) | null>(null);

  const voice = useVoiceSession((blob, mime) => {
    if (phaseRef.current !== "listening") return;
    void handlePhrase(blob, mime);
  });

  function addLine(line: Line) {
    setLines((prev) => [...prev.slice(-11), line]);
  }

  /** Mithu speaks. The mic is paused for this and the silence clock restarts afterwards. */
  async function speakMithu(text: string, tag: string, nextMood: Mood, reaction = false) {
    const my = ++token.current;
    setMood(nextMood);
    setPhase("mithu");
    addLine({ who: "mithu", text, tag });
    voice.setSpeaking(true);
    try {
      const { blob, source } = await fetchSpeech(text);
      if (my !== token.current) return;
      const player = playBlob(blob);
      stopPlayback.current = player.stop;
      await player.done;
      void source;
    } catch {
      // Voice output unavailable: the text is still on screen.
      setNotice("মিঠুর কণ্ঠ এখন পাওয়া যাচ্ছে না। লেখা পড়ো।");
    } finally {
      voice.setSpeaking(false);
      if (my === token.current) {
        setPhase("listening");
        // A silence reaction must not restart the silence clock, or the 16 s and 24 s steps would drift.
        if (!reaction) {
          lastActivity.current = Date.now();
          firedStage.current = "none";
        }
      }
    }
  }

  async function handlePhrase(blob: Blob, mime: string) {
    setPhase("thinking");
    lastActivity.current = Date.now();
    firedStage.current = "none";
    setSilence("none");
    let text = "";
    try {
      text = await postTranscribe(blob, mime);
    } catch {
      await speakMithu(REPEAT, "scripted", "neutral");
      return;
    }
    if (!text) {
      // Nothing understood: never invent a transcript.
      await speakMithu(REPEAT, "scripted", "neutral");
      return;
    }
    addLine({ who: "child", text });
    const sad = SAD_WORDS.test(text);
    try {
      const result = await postTurn(text);
      onTurn(result);
      const label = MODE_LABEL[result.mode] || "উত্তর";
      const m = result.metrics;
      setLast({
        label,
        fallback: Boolean(result.fallback),
        words: m?.words ?? 0,
        newWords: m?.newWords ?? 0,
        sentenceWords: m?.sentenceWords ?? 0,
        responseMs: m?.responseMs ?? 0,
      });
      setServed((s) => advance(s, result.actions));
      await speakMithu(result.reply, result.fallback ? "অফলাইন নিয়ম" : label, sad ? "sad" : "happy");
    } catch {
      await speakMithu(REPEAT, "scripted", "neutral");
    }
  }

  // Silence reactions: fixed, scripted, and they never move the story forward.
  useEffect(() => {
    if (phase !== "listening" || muted) return;
    const id = setInterval(() => {
      if (voice.status === "hearing") {
        lastActivity.current = Date.now();
        firedStage.current = "none";
        setSilence("none");
        return;
      }
      const elapsed = Date.now() - lastActivity.current;
      setSilence(silenceStage(elapsed));
      // Reactions fire strictly in order: worried, then hint, then choice. A late line
      // never skips a step, and each step waits for its own time.
      const next: SilenceStage =
        firedStage.current === "none" ? "worried" : firedStage.current === "worried" ? "hint" : firedStage.current === "hint" ? "choice" : "none";
      if (next !== "none" && elapsed >= SILENCE_TIMES[next]) {
        firedStage.current = next;
        void speakMithu(SILENCE_LINES[next], "নীরবতার প্রতিক্রিয়া", "worried", true);
      }
    }, 250);
    return () => clearInterval(id);
    // speakMithu reads refs only; the interval is restarted when phase or mute changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, muted, voice.status]);

  async function begin() {
    if (!allowed) return;
    setNotice("");
    // Fetch the three fixed silence lines now, so they are cached before the first silence.
    for (const line of Object.values(SILENCE_LINES)) void fetchSpeech(line).catch(() => {});
    setPhase("opening");
    await voice.start();
    await speakMithu(OPENING, "শুরুর কথা (লেখা)", "happy");
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    voice.setMuted(next);
    if (!next) lastActivity.current = Date.now();
  }

  useEffect(
    () => () => {
      token.current++;
      stopPlayback.current?.();
    },
    [],
  );

  // Stop the mic and any playing voice when the screen closes.
  function exit() {
    token.current++;
    stopPlayback.current?.();
    voice.stop();
    onExit();
  }

  const done = RESTAURANT.success(served);
  const micOn = phase !== "idle" && !muted && voice.status !== "error";
  const micText = muted
    ? "মাইক বন্ধ"
    : voice.status === "hearing"
      ? "শুনছি…"
      : phase === "listening"
        ? "মাইক চালু · তোমার কথার অপেক্ষায়"
        : phase === "thinking"
          ? "শুনে ভাবছি…"
          : phase === "mithu"
            ? "মিঠু কথা বলছে (মাইক বিরতিতে)"
            : "শুরু করলে মাইক চালু হবে";

  return (
    <section className="restaurant-voice" aria-label="রেস্টুরেন্ট ভয়েস খেলা">
      <header className="rv-head">
        <div>
          <strong>{RESTAURANT.title}</strong>
          <span className="rv-goal">{RESTAURANT.goal}</span>
        </div>
        <button className="rv-icon" onClick={exit} aria-label="খেলা বন্ধ করো">
          <X size={16} />
        </button>
      </header>

      <div className={`rv-mic ${micOn ? "on" : "off"}`} role="status" aria-live="polite">
        <span className={`rv-dot ${voice.status === "hearing" ? "hot" : ""}`} />
        <span>{micText}</span>
        <span className="rv-level" aria-hidden="true">
          <i style={{ transform: `scaleX(${muted ? 0 : Math.max(0.04, voice.level)})` }} />
        </span>
        <button className="rv-mute" onClick={toggleMute} disabled={phase === "idle"}>
          {muted ? <Mic size={14} /> : <MicOff size={14} />}
          {muted ? "মাইক চালু" : "মাইক বন্ধ"}
        </button>
      </div>

      <div className="rv-mood" data-mood={mood}>
        মিঠু: {mood === "happy" ? "খুশি" : mood === "worried" ? "একটু চিন্তায়" : mood === "sad" ? "মন খারাপ" : "অপেক্ষায়"}
        {silence !== "none" && <span className="rv-silence"> · নীরবতা {silence === "worried" ? `${SILENCE_TIMES.worried / 1000}s` : silence === "hint" ? `${SILENCE_TIMES.hint / 1000}s` : `${SILENCE_TIMES.choice / 1000}s`}</span>}
      </div>

      {phase === "idle" ? (
        <div className="rv-start">
          <p>
            মিঠু খুব খিদে পেয়ে এসেছে। তুমি ওয়েটার বা শেফ। শুধু কথা বলে খাবার
            অর্ডার নাও। কোনো বোতাম টিপতে হবে না।
          </p>
          {allowed ? (
            <button className="primary-button" onClick={begin}>
              শুরু করো
            </button>
          ) : (
            <div className="rv-consent">
              <ShieldCheck size={16} /> মাইক ব্যবহারের আগে অভিভাবকের অনুমতি লাগবে।
              <button className="text-button" onClick={onOpenParent}>
                অভিভাবক এলাকা
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rv-log" aria-live="polite">
          {lines.map((l, i) => (
            <p key={i} className={`rv-line ${l.who}`}>
              <b>{l.who === "mithu" ? "মিঠু" : "তুমি"}:</b> {l.text}
              {l.who === "mithu" && l.tag && <small className="rv-tag"> · {l.tag}</small>}
            </p>
          ))}
        </div>
      )}

      {last && (
        <div className="rv-meta" data-testid="rv-meta">
          উত্তর: {last.label}
          {last.fallback && <span className="rv-fallback"> · অফলাইন নিয়ম ব্যবহার হয়েছে</span>}
          <span className="rv-stats">
            {" "}· শব্দ {last.words} · নতুন {last.newWords} · বাক্য ~{last.sentenceWords} শব্দ · {last.responseMs} ms
          </span>
        </div>
      )}

      {served.servedDishes.length > 0 && (
        <div className="rv-served" data-testid="rv-served">
          অর্ডার: {served.servedDishes.join(", ")}
        </div>
      )}

      {done && (
        <div className="rv-done" role="status">
          খাবার পরিবেশন হয়েছে! মিঠু খুশি।
        </div>
      )}

      {(voice.error || notice) && <div className="rv-notice" role="alert">{voice.error || notice}</div>}
      <p className="rv-foot">
        শিশুর কথার অপেক্ষায় গল্প এগোয়। চুপ থাকলে চাপ দেওয়া হয় না।
      </p>
    </section>
  );
}

