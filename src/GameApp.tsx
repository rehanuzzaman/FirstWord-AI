import { useEffect, useRef, useState, lazy, Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Heart,
  Keyboard,
  Leaf,
  Map,
  Mic,
  MicOff,
  Minus,
  PawPrint,
  Play,
  Plus,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  initialWorld,
  labels,
  newProfile,
  type Profile,
  type Scene,
  type WorldObject,
} from "../shared/engine";
import { type z } from "zod";
import { PlayAction } from "../shared/play";
import { Pet, type Mood } from "./components/Pet";
import { ObjectArt, World } from "./components/World";
import { Dashboard } from "./components/Dashboard";
import { useSpeech } from "./speech";
import RestaurantVoice from "./components/RestaurantVoice";
import "./styles.css";
import "./game.css";
const GameWorld = lazy(() =>
  import("./components/GameWorld").then((m) => ({ default: m.GameWorld })),
);
type Health = {
  ai: boolean;
  localModel?: boolean;
  trainedClassifier?: boolean;
  stt: boolean;
  tts: boolean;
  sttModel?: string;
};
type Panel =
  | "map"
  | "collection"
  | "journal"
  | "parent-gate"
  | "parent"
  | "settings"
  | "consent"
  | null;
const trips: [Scene, string, string][] = [
  ["help", "ফুলবাগানের অভিযান", "মিঠুকে নদীর ওপারে নিয়ে চলো"],
  ["restaurant", "মিঠুর মজার রান্নাঘর", "তোমার মেনু, তোমার দোকান"],
  ["castle", "কল্পনার রাজ্য", "ড্রাগন, রাজা আর তোমার গল্প"],
  ["moon", "চাঁদে পিকনিক", "তারাদের মাঝে নতুন অভিযান"],
  ["meadow", "আমাদের সবুজ দ্বীপ", "আদর, খেলনা আর বন্ধুত্ব"],
  ["stage", "তোমার গল্পের মঞ্চ", "গল্পটার পরের অংশ তুমি বলো"],
];
const discoveries: Record<string, [string, string]> = {
  friend: ["ছোট্ট বন্ধু", "মিঠুকে প্রথম আদর"],
  "voice-story": ["গল্পের শুরু", "নিজের কথা দিয়ে গল্প শুরু"],
  dragon: ["টুনটুনের বন্ধু", "গল্পে ড্রাগন এনেছ"],
  bridge: ["সেতুর বুদ্ধি", "মিঠুকে পার হতে সাহায্য"],
  kindness: ["মিষ্টি একটা আম", "টুনটুনকে খেতে দিয়েছ"],
  chef: ["ছোট্ট রাঁধুনি", "অর্ডার তৈরি হয়েছে"],
  inventor: ["কল্পনার ডানা", "একেবারে নতুন একটা ভাবনা"],
  moon: ["তারার পথিক", "চাঁদে গিয়েছ"],
};
const demos = [
  "একটি বেগুনি প্রাসাদ বানাও, ড্রাগন আনো, আমি রাজা হব",
  "ড্রাগন আম খেতে চায়",
  "চলো রেস্তোরাঁ খুলি",
  "আমি দোকানদার হব",
  "ভাত",
  "মাছ",
];
async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "একটু পরে আবার চেষ্টা করি।");
  return data;
}
export default function GameApp() {
  const [profile, setProfile] = useState<Profile>(newProfile());
  const [health, setHealth] = useState<Health>({
    ai: false,
    stt: false,
    tts: false,
  });
  const [boot, setBoot] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState(
    "হ্যালো, আমি মিঠু! আমাকে ছুঁয়ে আদর করো। তারপর আমরা তোমার গল্পে খেলব!",
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [pending, setPending] = useState("");
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [sound, setSound] = useState(true);
  const [demo, setDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [gate, setGate] = useState("");
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState("");
  const [celebration, setCelebration] = useState("");
  const [bubble, setBubble] = useState(true);
  const [missionOpen, setMissionOpen] = useState(true);
  const [situation, setSituation] = useState<null | "restaurant">(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const speech = useSpeech((text) => {
    if (language === "bn") {
      setInput(text);
      setPending(text);
      setTyping(true);
      setReply(
        "তোমার কথাটা শুনেছি। ঠিক শুনলাম? নিচে দেখে পাঠাও, চাইলে শুধরেও দাও।",
      );
      setBubble(true);
    } else void send(text, "voice");
  });
  const ready = !boot && !busy;
  const current = profile.world;
  const stamps = profile.play?.discoveries || [];
  useEffect(() => {
    let active = true;
    Promise.all([api("/api/profile"), api<Health>("/api/status")])
      .then(([p, h]) => {
        if (active) {
          setProfile(p.profile);
          setHealth(h);
          if (p.profile.history.length) setReply(p.profile.history.at(-1).pet);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (active) setBoot(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(() => setCelebration(""), 3000);
    return () => clearTimeout(id);
  }, [celebration]);
  useEffect(() => {
    if (typing) inputRef.current?.focus();
  }, [typing]);
  useEffect(() => {
    if (!panel) return;
    speech.stop();
    const old = document.activeElement as HTMLElement;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
      if (e.key === "Tab") {
        const dialog = document.querySelector(".game-panel,.game-modal");
        const nodes = dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), summary, a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      old?.focus?.();
    };
  }, [panel]);
  function update(result: { profile: Profile; reply?: string }) {
    const earned = result.profile.play?.discoveries.find(
      (d) => !stamps.includes(d),
    );
    setProfile(result.profile);
    if (earned) setCelebration(discoveries[earned]?.[0] || "নতুন আবিষ্কার!");
    if (result.reply) {
      setReply(result.reply);
      setBubble(true);
      if (sound) void speech.say(result.reply, true);
    }
  }
  async function send(
    value = input,
    source: "text" | "voice" | "demo" = "text",
  ) {
    if (!value.trim() || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    speech.stop();
    setError("");
    setPending("");
    setBubble(true);
    try {
      const result = await api("/api/turn", "POST", {
        text: value,
        source: demo ? "demo" : source,
        demo,
      });
      update(result);
      setNote(result.providerNote);
      setInput("");
      setTyping(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  async function play(action: z.infer<typeof PlayAction>) {
    if (busyRef.current) return;
    busyRef.current = true;
    if (action.kind !== "move") speech.stop();
    setError("");
    try {
      const result = await api("/api/play", "POST", { action, demo });
      update(result);
      // A pet has no spoken reply from the server; show a short Mithu reaction so it is visible.
      if (action.kind === "pet" && !result.reply) {
        setReply("মিঠু খুশি হয়েছে! ছোট্ট আদর পেয়েছে।");
        setBubble(true);
      }
      if (action.kind === "travel") setPanel(null);
      setNote(
        action.kind === "move"
          ? "Touch movement · not a spoken turn"
          : "Touch play · not counted as language practice",
      );
    } catch (e) {
      setError(String(e));
    } finally {
      busyRef.current = false;
    }
  }
  function open(p: Panel) {
    speech.stop();
    setGate("");
    setPanel(p);
  }
  async function settings(data: Record<string, unknown>) {
    speech.stop();
    const previous = profile;
    setProfile((p) => ({
      ...p,
      ...data,
      ...(data.consent === false ? { microphone: false } : {}),
    }));
    try {
      const r = await api("/api/profile", "PATCH", data);
      setProfile(r.profile);
    } catch (e) {
      setProfile(previous);
      setError(String(e));
      throw e;
    }
  }
  async function remove() {
    speech.stop();
    try {
      const r = await api(
        demo ? "/api/reset" : "/api/profile",
        demo ? "POST" : "DELETE",
        demo ? { demo: true } : undefined,
      );
      setProfile(r.profile);
      setReply("আবার নতুন করে শুরু করি! আমি মিঠু, তোমার ছোট্ট বন্ধু।");
      setDemoStep(0);
      setInput("");
      setPending("");
    } catch (e) {
      setError(String(e));
    }
  }
  async function reset() {
    speech.stop();
    try {
      const r = await api("/api/reset", "POST", { demo, storyOnly: true });
      setProfile(r.profile);
      setDemoStep(0);
      setReply("নতুন একটা গল্পের দিন! আজ কী খেলবে?");
      setBubble(true);
    } catch (e) {
      setError(String(e));
    }
  }
  async function toggleDemo() {
    speech.stop();
    const next = !demo;
    try {
      const r = await api(`/api/profile?demo=${next}`);
      setDemo(next);
      setProfile(r.profile);
      setDemoStep(0);
      setPanel(null);
      setReply(
        next
          ? "ডেমোতে স্বাগতম! নিচের টেক্সট ধাপ দিয়ে জগৎ বদলাও।"
          : "মিঠু আবার তোমার গল্পের জন্য তৈরি!",
      );
      setBubble(true);
      setNote("");
    } catch (e) {
      setError(String(e));
    }
  }
  function microphone() {
    if (speech.state === "recording") {
      speech.finish();
      return;
    }
    if (!profile.consent || !profile.microphone) {
      setConsent(false);
      open("consent");
      return;
    }
    if (!health.stt) {
      setError(
        "স্থানীয় Whisper চালু নেই। আপাতত লিখে খেলি—মিঠু তোমার ভাবনা নেবে।",
      );
      setTyping(true);
      return;
    }
    setTyping(false);
    void speech.record(language);
  }
  const mood: Mood = busy
    ? "thinking"
    : speech.state === "recording"
      ? "listening"
      : speech.state === "speaking"
        ? "speaking"
        : celebration
          ? "celebrating"
          : current.activity === "rest"
            ? "comforting"
            : "idle";
  const target: [number, number] =
    current.scene === "help" && current.events.includes("pet_helped")
      ? [4, 1.5]
      : current.coordinates || [0, 1.8];
  const quest =
    current.scene === "help"
      ? {
          title: "ওপারে ফুলবাগান!",
          description: "মিঠু ফুল দেখতে চায়। কীভাবে নদী পার হবে?",
          steps: [
            [
              "একটা উপায় ভাবো",
              profile.history.some((t) => t.scene === "help"),
            ],
            [
              "সেতু, নৌকা বা নতুন পথ",
              current.objects.some((o) => ["bridge", "boat"].includes(o)) ||
                current.events.includes("safe_path"),
            ],
            ["মিঠুকে সাহায্য করো", stamps.includes("bridge")],
          ] as [string, boolean][],
          badge: "সাহায্যের অভিযান",
        }
      : current.scene === "restaurant" || current.scene === "shop"
        ? {
            title: "আজ তোমার দোকান!",
            description: "মিঠু তোমার প্রথম ক্রেতা। কী খেতে দেবে?",
            steps: [
              ["কে কোন ভূমিকায়?", current.role !== "friend"],
              [
                "নিজের মেনু বানাও",
                current.objects.some((o) =>
                  ["rice", "fish", "mango", "cake"].includes(o),
                ),
              ],
              ["অর্ডারটা তৈরি করো", stamps.includes("chef")],
            ] as [string, boolean][],
            badge: "মজার রান্নাঘর",
          }
        : {
            title: "একটা নতুন বন্ধুত্ব",
            description: "ছুঁয়ে দেখো, গল্প বলো, নিজের মতো খেলো।",
            steps: [
              ["মিঠুকে একটু আদর", stamps.includes("friend")],
              [
                "একটা খেলনা নিয়ে খেলো",
                (profile.play?.interactions || 0) > 1 &&
                  current.objects.length > 0,
              ],
              ["নিজের ভাবনা বলো", stamps.includes("voice-story")],
            ] as [string, boolean][],
            badge: "আজকের ছোট্ট অভিযান",
          };
  return (
    <div className="game-shell">
      <Suspense
        fallback={
          <div className="game-loading">
            <Pet mood="happy" />
            <p>তোমার 3D দ্বীপ তৈরি হচ্ছে…</p>
          </div>
        }
      >
        <GameWorld
          world={current}
          mood={mood}
          pat={profile.play?.pats || 0}
          target={target}
          zoom={zoom}
          onPet={() => play({ kind: "pet" })}
          onMove={(x, z) =>
            play({
              kind: "move",
              x: Math.max(-6.5, Math.min(6.5, x)),
              z: Math.max(-6.5, Math.min(6.5, z)),
            })
          }
          onItem={(item) => play({ kind: "item", item })}
          onCharacter={() => {
            setReply(
              current.events.includes("dragon_fed")
                ? "টুনটুন এখন তোমার বন্ধু। ওকে কোন অভিযানে নিয়ে যাবে?"
                : "আমি টুনটুন! একটা আম খেতে ইচ্ছে করছে। তুমি আমাকে সাহায্য করবে?",
            );
            setBubble(true);
          }}
          onImagine={(name) => {
            setReply(
              `“${name}”—এই খেলনাটা আমাদের সেই কল্পনার জিনিস। এবার এটা কী করবে?`,
            );
            setBubble(true);
          }}
        />
      </Suspense>
      <div className="island-vignette" />
      <header className="game-top">
        <button
          className="island-brand"
          onClick={() => setBubble(!bubble)}
          aria-label="Mithu island"
        >
          <span className="brand-paw">
            <PawPrint size={27} />
          </span>
          <span>
            <strong>মিঠুর দ্বীপ</strong>
            <small>FIRSTWORD · A LITTLE WORLD OF WORDS</small>
          </span>
          <span className="three-badge">3D</span>
        </button>
        <div className="game-top-tools">
          <button
            className="discovery-counter"
            onClick={() => open("collection")}
            title="Discoveries"
          >
            <Star size={20} fill="#f6cf73" />
            <span>
              {stamps.length}
              <small>আবিষ্কার</small>
            </span>
          </button>
          <button
            className="game-round"
            aria-label="Sound toggle"
            onClick={() => {
              if (sound) speech.stop();
              setSound(!sound);
            }}
          >
            {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button
            className="game-round"
            aria-label="Parent area"
            onClick={() => open("parent-gate")}
          >
            <ShieldCheck size={20} />
          </button>
          <button
            className="game-round"
            aria-label="Game settings"
            onClick={() => open("settings")}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>
      <div className="location-chip">
        <span className="location-leaf">
          <Leaf size={14} />
        </span>
        {labels[current.scene]}
        <i />
        তুমি · {labels[current.role]}
      </div>
      <aside className={`mission-card ${missionOpen ? "" : "collapsed"}`}>
        <button
          className="mission-top"
          onClick={() => setMissionOpen(!missionOpen)}
        >
          <span>
            <Compass size={15} />
            {quest.badge}
          </span>
          {missionOpen ? <Minus size={16} /> : <Plus size={16} />}
        </button>
        {missionOpen && (
          <>
            <h2>{quest.title}</h2>
            <p>{quest.description}</p>
            <div className="quest-steps">
              {quest.steps.map(([name, done], i) => (
                <div key={name} className={done ? "done" : ""}>
                  <span>{done ? <Check size={13} /> : i + 1}</span>
                  {name}
                </div>
              ))}
            </div>
            <span className="quest-note">
              <Heart size={11} /> কোনো তাড়া নেই, কোনো ভুল উত্তরও নেই
            </span>
          </>
        )}
      </aside>
      <nav className="game-side-tools" aria-label="Game navigation">
        <button onClick={() => open("map")} aria-label="Adventure map">
          <span>
            <Map size={23} />
          </span>
          কোথায় যাব?
        </button>
        <button
          onClick={() => open("collection")}
          aria-label="Discovery collection"
        >
          <span>
            <Star size={23} />
          </span>
          আমার আবিষ্কার
        </button>
        <button onClick={() => open("journal")} aria-label="Story journal">
          <span>
            <BookOpen size={22} />
          </span>
          গল্পের খাতা
        </button>
      </nav>
      <div className="game-zoom">
        <button aria-label="Zoom in" onClick={() => setZoom(2)}>
          <Plus size={17} />
        </button>
        <button aria-label="Zoom out" onClick={() => setZoom(0)}>
          <Minus size={17} />
        </button>
        <button aria-label="Reset camera" onClick={() => setZoom(1)}>
          <RotateCcw size={14} />
        </button>
      </div>
      {bubble && (
        <div className={`mithu-bubble ${busy ? "thinking" : ""}`} role="status">
          <span className="bubble-mithu">
            <PawPrint size={13} /> মিঠু
          </span>
          <button
            className="bubble-dismiss"
            onClick={() => setBubble(false)}
            aria-label="Hide speech bubble"
          >
            <X size={13} />
          </button>
          <p>{busy ? "তোমার ভাবনা নিয়ে একটু ভাবছি…" : reply}</p>
          <button
            className="game-replay"
            disabled={busy}
            onClick={() => speech.say(reply, true)}
            aria-label="Replay pet voice"
          >
            <Volume2 size={13} /> আবার শুনি
          </button>
          <span className="bubble-tail" />
        </div>
      )}
      {!bubble && (
        <button className="show-bubble" onClick={() => setBubble(true)}>
          <PawPrint size={16} /> মিঠু কী বলল?
        </button>
      )}
      {celebration && (
        <div className="discovery-toast">
          <span>
            <Star size={22} fill="currentColor" />
          </span>
          <div>
            <small>নতুন স্মৃতি জমা হলো!</small>
            <b>{celebration}</b>
          </div>
          <Sparkles size={22} />
        </div>
      )}
      {!situation && (
      <div className="pet-touch-hint">
        <Heart size={13} /> মিঠুকে ছুঁয়ে দেখো <span>·</span> মাটিতে ছুঁলে মিঠু
        হেঁটে যাবে
      </div>
      )}
      {situation === "restaurant" && (
        <RestaurantVoice
          allowed={profile.consent && profile.microphone}
          postTurn={(text) =>
            api("/api/turn", "POST", { text, source: "voice", demo: false })
          }
          onTurn={(r) => setProfile(r.profile as Profile)}
          onExit={() => setSituation(null)}
          onOpenParent={() => {
            setSituation(null);
            open("consent");
          }}
        />
      )}
      {!situation && (
      <section className="play-dock" aria-label="Play controls">
        <button
          className="primary-button situation-start"
          onClick={() => setSituation("restaurant")}
        >
          রেস্টুরেন্ট খেলো · শুধু কথা বলে
        </button>
        {demo && (
          <div className="game-demo-strip">
            <span>
              <Play size={13} /> DEMO · TEXT, NOT SPEECH
            </span>
            {demoStep < demos.length ? (
              <button
                disabled={busy}
                onClick={async () => {
                  await send(demos[demoStep], "demo");
                  setDemoStep((s) => s + 1);
                }}
              >
                ধাপ {demoStep + 1} / 6 <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={() => open("parent-gate")}>
                অগ্রগতি দেখি <ArrowRight size={14} />
              </button>
            )}
            <button aria-label="Reset demo" disabled={busy} onClick={reset}>
              <RotateCcw size={14} />
            </button>
          </div>
        )}
        {(error || speech.error) && (
          <div className="game-error" role="alert">
            <span>{error || speech.error}</span>
            <button
              onClick={() => {
                setError("");
                speech.stop();
                setTyping(true);
              }}
            >
              <Keyboard size={16} /> লিখে বলি
            </button>
            <button
              aria-label="Dismiss error"
              onClick={() => {
                setError("");
                speech.stop();
              }}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {typing && (
          <form
            className="game-text-box"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input, pending === input ? "voice" : "text");
            }}
          >
            {pending && (
              <small className="pending-transcript">
                Whisper শুনেছে · ভুল হলে শুধরে পাঠাও
              </small>
            )}
            <label htmlFor="game-input">
              {pending ? "তোমার কথাগুলো" : "তোমার ভাবনা · টেক্সট বিকল্প"}
            </label>
            <div>
              <input
                ref={inputRef}
                id="game-input"
                aria-label="Text fallback"
                value={input}
                maxLength={600}
                onChange={(e) => setInput(e.target.value)}
                placeholder="যেমন: মেঘের ওপর একটা চকলেটের শহর বানাই…"
                disabled={busy}
              />
              <button aria-label="Send text" disabled={busy || !input.trim()}>
                <Send size={19} />
              </button>
              <button
                type="button"
                aria-label="Close text input"
                onClick={() => setTyping(false)}
              >
                <X size={18} />
              </button>
            </div>
          </form>
        )}
        <div className="dock-main">
          <div className="toy-bag">
            <span className="dock-label">খেলনার ঝুলি</span>
            <div>
              {(["ball", "mango", "flower"] as WorldObject[]).map((item) => (
                <button
                  className="toy-slot"
                  key={item}
                  onClick={() =>
                    play(
                      current.objects.includes(item)
                        ? { kind: "item", item }
                        : { kind: "spawn", item },
                    )
                  }
                  disabled={!ready}
                  aria-label={`Play with ${item}`}
                >
                  <ObjectArt kind={item} />
                  <span>{labels[item]}</span>
                  {current.objects.includes(item) && <i />}
                </button>
              ))}
            </div>
          </div>
          <div className="central-mic">
            <button
              className={`game-mic ${speech.state === "recording" ? "recording" : ""} ${busy ? "busy" : ""}`}
              disabled={!ready || demo || speech.state === "processing"}
              onClick={microphone}
              aria-label={
                speech.state === "recording"
                  ? "Stop recording and transcribe"
                  : "Start microphone"
              }
            >
              {speech.state === "recording" ? (
                <Square size={27} fill="currentColor" />
              ) : busy ? (
                <Sparkles size={29} />
              ) : (
                <Mic size={33} />
              )}
            </button>
            <b>
              {speech.state === "recording"
                ? "শুনছি… শেষ হলে চাপ দাও"
                : busy
                  ? "একটু ভাবছি…"
                  : "বলো, এবার কী খেলব?"}
            </b>
            <small>
              {demo
                ? "ডেমোতে লেখা দিয়ে খেলা"
                : health.stt
                  ? "চাপ দিয়ে তোমার কথা বলো"
                  : "ভয়েস সেটআপ নেই · লিখেও খেলো"}
            </small>
          </div>
          <div className="dock-actions">
            <button
              className="write-idea"
              onClick={() => setTyping(!typing)}
              aria-label="Type your idea"
            >
              <Keyboard size={21} />
              <span>লিখে বলি</span>
            </button>
            <button
              className="pet-action"
              disabled={!ready}
              onClick={() => play({ kind: "pet" })}
              aria-label="Pet Mithu"
            >
              <Heart size={20} />
              <span>আদর করি</span>
            </button>
          </div>
        </div>
        {speech.state === "recording" && (
          <button className="game-stop" onClick={speech.stop}>
            <MicOff size={14} /> রেকর্ডিং বাতিল
          </button>
        )}
        {speech.state === "speaking" && (
          <button className="game-stop" onClick={speech.stop}>
            <Square size={12} /> কণ্ঠ থামাও
          </button>
        )}
      </section>
      )}
      <footer className="game-footer">
        <button onClick={() => open("settings")}>
          <i />
          {demo
            ? "Demo · rules"
            : note.startsWith("Live")
              ? "Live local model"
              : health.localModel
                ? "Local AI + trained intents"
                : "Trained intents + guided play"}
          <span>·</span>
          {health.tts ? "Local voice" : "Text voice fallback"}
        </button>
        <span>
          <ShieldCheck size={11} /> তোমার গতি, তোমার খেলা
        </span>
      </footer>
      {boot && (
        <div className="game-loading">
          <Pet mood="happy" />
          <p>মিঠু তোমার জন্য দ্বীপ সাজাচ্ছে…</p>
        </div>
      )}
      {panel && (
        <div
          className={`game-overlay ${panel === "parent" ? "parent-overlay" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPanel(null);
          }}
        >
          {panel === "parent" ? (
            <section
              className="game-panel parent-game-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Parent dashboard"
            >
              <Dashboard
                profile={profile}
                demo={demo}
                busy={busy}
                onBack={() => setPanel(null)}
                onUpdate={settings}
                onDelete={remove}
                onStart={(scene) => {
                  setPanel(null);
                  void play({ kind: "travel", scene });
                }}
              />
            </section>
          ) : (
            <section
              className={`game-modal panel-${panel}`}
              role="dialog"
              aria-modal="true"
              aria-label={panel}
            >
              <button
                className="game-close"
                aria-label="Close dialog"
                onClick={() => setPanel(null)}
              >
                <X size={20} />
              </button>
              {panel === "map" ? (
                <>
                  <div className="overlay-heading">
                    <Map size={28} />
                    <small>একটা শুরু বেছে নাও</small>
                    <h1>আজ কোথায় যাব?</h1>
                    <p>বাকি গল্পটা তোমার কল্পনায়!</p>
                  </div>
                  <div className="game-map-grid">
                    {trips.map(([scene, title, desc], i) => (
                      <button
                        className="map-card"
                        key={scene}
                        onClick={() => play({ kind: "travel", scene })}
                      >
                        <div className="map-mini">
                          <World world={{ ...initialWorld(), scene }} mini />
                          <span>0{i + 1}</span>
                        </div>
                        <div>
                          <h3>{title}</h3>
                          <p>{desc}</p>
                          <span className="map-go">
                            <ArrowRight size={16} />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <span className="map-note">
                    <Sparkles size={14} /> চাইলে শুধু বলো—“চলো চাঁদে যাই!”
                  </span>
                </>
              ) : null}
              {panel === "collection" ? (
                <>
                  <div className="overlay-heading">
                    <Star size={29} />
                    <small>ছোট ছোট খেলার স্মৃতি</small>
                    <h1>আমার আবিষ্কারের খাতা</h1>
                    <p>স্কোর নয়, চাপ নয়—একসঙ্গে খেলার সুন্দর মুহূর্ত।</p>
                  </div>
                  <div className="sticker-grid">
                    {Object.entries(discoveries).map(
                      ([key, [title, desc]], i) => (
                        <div
                          key={key}
                          className={`sticker ${stamps.includes(key) ? "earned" : ""}`}
                        >
                          <span className={`sticker-art sticker-${i}`}>
                            {i % 3 === 0 ? (
                              <PawPrint size={36} />
                            ) : i % 3 === 1 ? (
                              <Star size={36} />
                            ) : (
                              <Leaf size={36} />
                            )}
                          </span>
                          <h3>{title}</h3>
                          <p>
                            {stamps.includes(key)
                              ? desc
                              : "যখন ইচ্ছে, আবিষ্কার হবে"}
                          </p>
                          {stamps.includes(key) && <Check size={16} />}
                        </div>
                      ),
                    )}
                  </div>
                  <p className="collection-footnote">
                    ছোঁয়ার খেলাও স্মৃতি যোগ করে। এগুলো ভাষার দক্ষতা বা চিকিৎসার
                    স্কোর নয়।
                  </p>
                </>
              ) : null}
              {panel === "journal" ? (
                <>
                  <div className="overlay-heading">
                    <BookOpen size={28} />
                    <small>তোমার কথায় তৈরি</small>
                    <h1>আমাদের গল্পের খাতা</h1>
                    <p>কল্পনাগুলো এখানেই থাকুক।</p>
                  </div>
                  {!profile.history.length ? (
                    <div className="journal-empty">
                      <Pet mood="curious" />
                      <p>প্রথম গল্পটা তোমার অপেক্ষায়!</p>
                      <button
                        className="primary-button"
                        onClick={() => {
                          setPanel(null);
                          setTyping(true);
                        }}
                      >
                        গল্প শুরু করি
                      </button>
                    </div>
                  ) : (
                    <div className="game-journal">
                      {profile.history
                        .slice(-25)
                        .reverse()
                        .map((t) => (
                          <article key={t.id}>
                            <small>
                              {labels[t.scene]} ·{" "}
                              {t.source === "voice"
                                ? "Whisper audio"
                                : t.source === "demo"
                                  ? "Demo text"
                                  : "Text input"}
                            </small>
                            <h3>{t.child}</h3>
                            <p>{t.pet}</p>
                            <span>
                              {t.mode === "local-model"
                                ? "Local generative intent"
                                : t.mode === "trained-classifier"
                                  ? "Trained intent model"
                                  : "Guided game actions"}
                            </span>
                          </article>
                        ))}
                    </div>
                  )}
                </>
              ) : null}
              {panel === "parent-gate" ? (
                <>
                  <div className="overlay-heading">
                    <ShieldCheck size={29} />
                    <small>শুধু বড়দের জন্য</small>
                    <h1>অভিভাবকের আঙিনা</h1>
                    <p>একজন বড় মানুষকে বলো অঙ্কটা করতে।</p>
                  </div>
                  <form
                    className="game-gate"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (gate === "12") setPanel("parent");
                      else setError("৭ + ৫ = ১২। আবার চেষ্টা করুন।");
                    }}
                  >
                    <label htmlFor="parent-answer">৭ + ৫ = ?</label>
                    <input
                      id="parent-answer"
                      type="number"
                      value={gate}
                      onChange={(e) => setGate(e.target.value)}
                      placeholder="উত্তর"
                      autoFocus
                    />
                    <button className="primary-button" type="submit">
                      প্রবেশ করুন <ArrowRight size={17} />
                    </button>
                  </form>
                  <p className="technical-note">
                    Convenience gate, not secure parent authentication. Everyday
                    communication practice—not validated speech therapy.
                  </p>
                </>
              ) : null}
              {panel === "consent" ? (
                <>
                  <div className="overlay-heading">
                    <Mic size={29} />
                    <small>অভিভাবকের অনুমতি</small>
                    <h1>কথা বলার আগে</h1>
                    <p>মিঠুর সঙ্গে মাইক্রোফোনে কথা বলতে একটু অনুমতি চাই।</p>
                  </div>
                  <div className="guardian-copy">
                    <p>
                      অডিও এই সার্ভারের স্থানীয় Whisper-এ প্রক্রিয়া হবে। অডিও
                      ফাইল রাখা হয় না। কথার লেখা ও অগ্রগতি স্থানীয় প্রোফাইলে
                      সংরক্ষিত হবে।
                    </p>
                    <p>
                      অনলাইন প্রিভিউতে অডিও প্রিভিউ সার্ভারে যায়। নিজের
                      কম্পিউটারে চালালে সেখানেই থাকে। শিশুদের কথা মডেল
                      প্রশিক্ষণে ব্যবহার করা হয় না।
                    </p>
                    <label className="consent-check">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        আমি অভিভাবক। অডিও প্রক্রিয়া ও স্থানীয়ভাবে কথার লেখা
                        সংরক্ষণে সম্মতি দিচ্ছি।
                      </span>
                    </label>
                    <button
                      className="primary-button full"
                      disabled={!consent}
                      onClick={async () => {
                        try {
                          await settings({ consent: true, microphone: true });
                          setPanel(null);
                        } catch {
                          /* shown in game */
                        }
                      }}
                    >
                      অনুমতি দিন <Check size={17} />
                    </button>
                    <button
                      className="text-button centered"
                      onClick={() => {
                        setPanel(null);
                        setTyping(true);
                      }}
                    >
                      শুধু লিখে খেলি
                    </button>
                  </div>
                </>
              ) : null}
              {panel === "settings" ? (
                <>
                  <div className="overlay-heading">
                    <Settings2 size={29} />
                    <small>খেলার ছোট্ট সেটিংস</small>
                    <h1>মিঠুর পৃথিবী</h1>
                  </div>
                  <div className="game-settings-list">
                    <label>
                      কথার ভাষা{" "}
                      <select
                        aria-label="Speech language"
                        value={language}
                        onChange={(e) =>
                          setLanguage(e.target.value as "bn" | "en")
                        }
                      >
                        <option value="bn">বাংলা</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    <button
                      onClick={() => {
                        setSound(!sound);
                        speech.stop();
                      }}
                    >
                      <Volume2 size={19} /> মিঠুর কণ্ঠ{" "}
                      <b>{sound ? "চালু" : "বন্ধ"}</b>
                    </button>
                    <button onClick={toggleDemo}>
                      <Play size={18} /> স্পষ্টভাবে চিহ্নিত টেক্সট ডেমো{" "}
                      <b>{demo ? "বন্ধ করি" : "চালু করি"}</b>
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        void reset();
                        setPanel(null);
                      }}
                    >
                      <RotateCcw size={18} /> নতুন গল্প শুরু{" "}
                      <b>অগ্রগতি থাকবে</b>
                    </button>
                  </div>
                  <details open className="game-provider-info">
                    <summary>সত্যিকারের AI / voice অবস্থা</summary>
                    <p>
                      <b>3D:</b> Live Three.js / WebGL. Tap movement, petting
                      and object interactions.
                    </p>
                    <p>
                      <b>Language model:</b>{" "}
                      {health.localModel
                        ? "Local Qwen3 0.6B available · pretrained, not fine-tuned"
                        : health.ai
                          ? "Local Ollama available"
                          : "No local generative model running"}
                    </p>
                    <p>
                      <b>Trained intents:</b> Real fitted classifier · 668
                      synthetic authored examples. Not an LLM or clinical model.
                    </p>
                    <p>
                      <b>Speech:</b>{" "}
                      {health.stt
                        ? `Local Whisper ${health.sttModel || "tiny"}`
                        : "Whisper unavailable; text fallback"}{" "}
                      · Bangla experimental; confirm transcripts.
                    </p>
                    <p>
                      <b>Voice:</b>{" "}
                      {health.tts
                        ? "Real eSpeak NG Bengali; robotic voice"
                        : "Unavailable unless a local device voice exists"}
                      .
                    </p>
                    <p>
                      Generative actions are validated. Bangla replies are
                      guided templates because this tiny model's Bangla
                      generation was not reliable. New ideas may use labelled
                      pretend-play props, not exact new 3D models.
                    </p>
                    {note && (
                      <p>
                        <b>Last turn:</b> {note}
                      </p>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          setHealth(await api("/api/status"));
                        } catch (e) {
                          setError(String(e));
                        }
                      }}
                    >
                      <RotateCcw size={13} /> Refresh status
                    </button>
                  </details>
                  <p className="technical-note">
                    No paid API. No child data used for training. This supports
                    communication practice, not diagnosis or a replacement for a
                    qualified speech-language professional.
                  </p>
                  <button
                    className="text-button centered"
                    onClick={() => open("parent-gate")}
                  >
                    অভিভাবকের গোপনীয়তা নিয়ন্ত্রণ <ShieldCheck size={16} />
                  </button>
                </>
              ) : null}
            </section>
          )}
        </div>
      )}
      <span className="sr-only" data-testid="world-state">
        {JSON.stringify({
          scene: current.scene,
          role: current.role,
          objects: current.objects,
          characters: current.characters,
          imaginations: current.imaginations,
          coordinates: current.coordinates,
          pats: profile.play?.pats || 0,
          turns: profile.history.length,
        })}
      </span>
    </div>
  );
}
