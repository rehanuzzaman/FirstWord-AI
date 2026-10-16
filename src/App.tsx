import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  Home,
  Keyboard,
  Leaf,
  Maximize2,
  Mic,
  MicOff,
  MoreHorizontal,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Sun,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import {
  initialWorld,
  labels,
  newProfile,
  recommendation,
  type Profile,
  type Scene,
} from "../shared/engine";
import { Pet, type Mood } from "./components/Pet";
import { World } from "./components/World";
import { Dashboard } from "./components/Dashboard";
import { useSpeech } from "./speech";
import "./styles.css";
interface Status {
  sttModel?: string;
  ai: boolean;
  stt: boolean;
  tts: boolean;
  model: string;
  aiLabel: string;
  sttLabel: string;
  ttsLabel: string;
}
const scenarios: [Scene, string, string, string][] = [
  [
    "help",
    "একটু সাহায্য, অনেক গল্প",
    "Help my pet",
    "নদীর ওপারে ফুলবাগান। কীভাবে যাবে মিঠু?",
  ],
  [
    "restaurant",
    "আজ তোমার রেস্তোরাঁ!",
    "Restaurant & shopping",
    "রাঁধুনি, ক্রেতা, নাকি দোকানদার—তুমি কে হবে?",
  ],
  [
    "castle",
    "তোমার নিজের পৃথিবী",
    "Create your own world",
    "একটা প্রাসাদ, একটা ড্রাগন… আর তোমার কল্পনা!",
  ],
];
const starter: Record<Scene, string> = {
  meadow: "চলো বাগানে যাই",
  help: "মিঠুকে সাহায্য করি",
  restaurant: "চলো রেস্তোরাঁ খুলি",
  shop: "চলো দোকান খুলি",
  castle: "একটি বেগুনি প্রাসাদ বানাও",
  moon: "চলো চাঁদে যাই",
  stage: "চলো গল্পের মঞ্চে যাই",
  hospital: "চলো যত্নের ঘরে যাই",
};
const demoLines = [
  "একটি বেগুনি প্রাসাদ বানাও, বন্ধু ড্রাগন আনো, আমি রাজা হব",
  "ড্রাগন আম খেতে চায়",
  "চলো রেস্তোরাঁ খুলি",
  "আমি দোকানদার হব",
  "ভাত",
  "মাছ",
];
const greeting =
  "হ্যালো! আমি মিঠু। আজ আমরা কী খেলব? তোমার ভাবনাটা বলো, একসঙ্গে নতুন একটা গল্প বানাই!";
async function api<T = any>(route: string, options?: RequestInit): Promise<T> {
  const r = await fetch(route, {
    ...options,
    headers:
      options?.body && typeof options.body === "string"
        ? { "Content-Type": "application/json", ...options.headers }
        : options?.headers,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Please retry");
  return j;
}
export default function App() {
  const [profile, setProfile] = useState<Profile>(newProfile());
  const [status, setStatus] = useState<Status>({
    ai: false,
    stt: false,
    tts: false,
    model: "",
    aiLabel: "Checking…",
    sttLabel: "Checking…",
    ttsLabel: "Checking…",
  });
  const [pendingVoice, setPendingVoice] = useState("");
  const [view, setView] = useState<"home" | "worlds" | "journal" | "parent">(
    "home",
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [boot, setBoot] = useState(true);
  const [error, setError] = useState("");
  const [demo, setDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [reply, setReply] = useState(greeting);
  const [providerNote, setProviderNote] = useState("");
  const [modal, setModal] = useState<"consent" | "parent" | "help" | null>(
    null,
  );
  const [consent, setConsent] = useState(false);
  const [gate, setGate] = useState("");
  const [autoVoice, setAutoVoice] = useState(true);
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [expanded, setExpanded] = useState(false);
  const [recentHappy, setRecentHappy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scenariosRef = useRef<HTMLElement>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const speech = useSpeech((text) => {
    setInput(text);
    if (language === "bn") setPendingVoice(text);
    else void send(text, "voice");
  });
  const text = (bn: string, en: string) => (language === "bn" ? bn : en);
  function load(data: { profile: Profile }) {
    setProfile(data.profile);
    setReply(data.profile.history.at(-1)?.pet || greeting);
  }
  useEffect(() => {
    mounted.current = true;
    Promise.all([api("/api/profile"), api<Status>("/api/status")])
      .then(([p, s]) => {
        if (mounted.current) {
          load(p);
          setStatus(s);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setBoot(false));
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!recentHappy) return;
    const t = setTimeout(() => setRecentHappy(false), 2400);
    return () => clearTimeout(t);
  }, [recentHappy]);
  async function send(
    value = input,
    source: "text" | "voice" | "demo" = "text",
  ) {
    if (busyRef.current || !value.trim()) return;
    busyRef.current = true;
    speech.stop();
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/turn", {
        method: "POST",
        body: JSON.stringify({
          text: value,
          source: demo ? "demo" : source,
          demo,
        }),
      });
      load(result);
      setReply(result.reply);
      setProviderNote(result.providerNote);
      setInput("");
      setPendingVoice("");
      setRecentHappy(true);
      if (autoVoice) void speech.say(result.reply, true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connection error. Please retry.",
      );
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  async function toggleDemo() {
    if (busy) return;
    speech.stop();
    const next = !demo;
    try {
      const data = await api(`/api/profile?demo=${next}`);
      setDemo(next);
      load(data);
      setDemoStep(0);
      setPendingVoice("");
      setInput("");
      setView("home");
      setProviderNote("");
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  async function reset() {
    speech.stop();
    try {
      load(
        await api("/api/reset", {
          method: "POST",
          body: JSON.stringify({ demo, storyOnly: true }),
        }),
      );
      setDemoStep(0);
      setPendingVoice("");
      setInput("");
      setError("");
      setProviderNote("");
    } catch (e) {
      setError(String(e));
    }
  }
  async function update(data: Record<string, unknown>) {
    speech.stop();
    const before = profile;
    setProfile((p) => ({
      ...p,
      ...data,
      ...(data.consent === false ? { microphone: false } : {}),
    }));
    setBusy(true);
    try {
      load(
        await api("/api/profile", {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      );
    } catch (e) {
      setProfile(before);
      setError(String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    speech.stop();
    try {
      if (demo) await reset();
      else load(await api("/api/profile", { method: "DELETE" }));
      setReply(greeting);
    } catch (e) {
      setError(String(e));
    }
  }
  function go(view: "home" | "worlds" | "journal" | "parent") {
    speech.stop();
    setExpanded(false);
    if (view === "parent") {
      setGate("");
      setModal("parent");
    } else setView(view);
  }
  async function start(scene: Scene) {
    setView("home");
    await send(starter[scene]);
  }
  function microphone() {
    if (speech.state === "recording") {
      speech.finish();
      return;
    }
    if (!profile.consent || !profile.microphone) {
      setConsent(false);
      setModal("consent");
      return;
    }
    if (!status.stt) {
      setError(
        "Local Whisper চালু নেই। লিখে কথা বলা যায়। সহায়তা থেকে বিনামূল্যে সেটআপ দেখো।",
      );
      return;
    }
    void speech.record(language);
  }
  const mood: Mood =
    speech.state === "recording"
      ? "listening"
      : busy
        ? "thinking"
        : speech.state === "speaking"
          ? "speaking"
          : speech.state === "error"
            ? "confused"
            : recentHappy
              ? "celebrating"
              : profile.world.activity === "rest"
                ? "comforting"
                : "idle";
  const rec = recommendation(profile);
  const last = profile.history.at(-1);
  const stateLabel = busy
    ? text("একটু ভাবছি…", "Thinking…")
    : speech.state === "recording"
      ? text("শুনছি… শেষ হলে আবার চাপ দাও", "Listening… tap again to finish")
      : speech.state === "processing"
        ? text("অডিও তৈরি বা প্রক্রিয়া হচ্ছে…", "Processing audio…")
        : speech.state === "speaking"
          ? text("মিঠু কথা বলছে…", "Mithu is speaking…")
          : speech.state === "error"
            ? text("আবার চেষ্টা করা যায়", "You can try again")
            : text("আমি শুনতে প্রস্তুত", "Ready when you are");
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
          aria-label="FirstWord AI home"
        >
          <span className="brand-symbol">
            <span />
            <span />
            <span />
          </span>
          <span>
            firstword<span className="brand-ai">AI</span>
            <small>A LITTLE FRIEND. A WORLD OF WORDS.</small>
          </span>
        </a>
        <div className="header-right">
          <span className="local-badge">
            <i /> {text("নিরাপদ ছোট্ট পৃথিবী", "A safe little world")}
          </span>
          <button
            className="language-button"
            onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
            aria-label="Switch interface language"
          >
            <span className={language === "bn" ? "selected" : ""}>বাংলা</span>
            <span className={language === "en" ? "selected" : ""}>EN</span>
          </button>
          <button className="parent-button" onClick={() => go("parent")}>
            <ShieldCheck size={17} />
            <span>{text("অভিভাবক", "Parents")}</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </header>
      <aside className="sidebar">
        <nav aria-label="Main navigation">
          {[
            {
              id: "home" as const,
              icon: Home,
              bn: "আমার বন্ধু",
              en: "My friend",
            },
            {
              id: "worlds" as const,
              icon: Compass,
              bn: "খেলার জগৎ",
              en: "Play worlds",
            },
            {
              id: "journal" as const,
              icon: BookOpen,
              bn: "গল্পের খাতা",
              en: "Our stories",
            },
          ].map(({ id, icon: Icon, bn, en }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => go(id)}
            >
              <Icon size={23} />
              <span>{text(bn, en)}</span>
              {view === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`demo-nav ${demo ? "on" : ""}`}
            onClick={toggleDemo}
            disabled={busy || boot}
          >
            <Play size={20} />
            <span>{text("ডেমো মোড", "Demo mode")}</span>
            <span className="switch-track">
              <i />
            </span>
          </button>
          <button
            className="nav-item help-nav"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={21} />
            <span>{text("একটু সাহায্য", "Need a hand?")}</span>
          </button>
          <div className="made-with">
            <Heart size={13} />
            <span>Made for little voices</span>
          </div>
        </div>
      </aside>
      <main className={`main-content ${expanded ? "world-expanded" : ""}`}>
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        {demo && (
          <div className="demo-banner">
            <div>
              <Play size={16} />
              <strong>DEMO · TEXT FALLBACK</strong>
              <span>
                {text(
                  "আসল দৃশ্য বদল · নিয়মভিত্তিক, AI বা কথার নমুনা নয়",
                  "Real world changes · rules, not live AI or speech",
                )}
              </span>
            </div>
            <button onClick={reset} disabled={busy}>
              <RotateCcw size={14} />
              {text("আবার শুরু", "Reset demo")}
            </button>
          </div>
        )}
        {view === "parent" ? (
          <Dashboard
            profile={profile}
            demo={demo}
            busy={busy}
            onBack={() => setView("home")}
            onUpdate={update}
            onDelete={remove}
            onStart={start}
          />
        ) : (
          <>
            <section className="welcome-row">
              <div>
                <div className="eyebrow">
                  <Sun size={16} />{" "}
                  {text(
                    "একটা নতুন গল্পের দিন",
                    "A GOOD DAY FOR A LITTLE ADVENTURE",
                  )}
                </div>
                <h1>
                  {view === "worlds"
                    ? text("কোথায় খেলতে যাবে?", "Where shall we play?")
                    : view === "journal"
                      ? text("আমাদের গল্পের খাতা", "Our book of little stories")
                      : text(
                          "তোমার কথায়, তোমার পৃথিবী।",
                          "Your words. Your little world.",
                        )}
                </h1>
                <p>
                  {text(
                    "একটু কথা, একটু খেলা—মিঠুর সঙ্গে অনেকটা কল্পনা।",
                    "A little talking, a little playing. A whole lot of imagination.",
                  )}
                </p>
              </div>
              <div className="friend-status">
                <div className="mini-avatar">
                  <Pet mood="happy" />
                </div>
                <div>
                  <b>
                    {text("মিঠু তোমার সঙ্গেই আছে", "Mithu is here for you")}
                  </b>
                  <span>
                    <i />
                    {text("তোমার ছোট্ট বন্ধু", "Your little companion")}
                  </span>
                </div>
                <Heart size={18} />
              </div>
            </section>
            {view === "journal" ? (
              <section className="panel journal">
                <div className="journal-heading">
                  <BookOpen size={24} />
                  <h2>
                    {text("তোমার ভাবনায় তৈরি", "Made with your imagination")}
                  </h2>
                  <span className="tag">{profile.history.length} turns</span>
                </div>
                {!last ? (
                  <div className="empty-story">
                    <Pet mood="curious" />
                    <h2>প্রথম গল্পটা এখনও বাকি!</h2>
                    <p>মিঠুকে তোমার ভাবনা বলো। গল্পটা এখানেই থাকবে।</p>
                    <button
                      className="primary-button"
                      onClick={() => go("home")}
                    >
                      গল্প শুরু করি <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  profile.history
                    .slice()
                    .reverse()
                    .map((t) => (
                      <article className="story-entry" key={t.id}>
                        <span className="story-dot" />
                        <small>
                          {new Date(t.time).toLocaleString()} ·{" "}
                          {t.source === "demo"
                            ? "Demo text"
                            : t.source === "voice"
                              ? "Local Whisper"
                              : "Text input"}{" "}
                          · {labels[t.scene]}
                        </small>
                        <h3>{t.child}</h3>
                        <p>{t.pet}</p>
                        <div className="action-tags">
                          {t.actions.map((a, i) => (
                            <span key={i}>
                              {a.type}
                              {"value" in a
                                ? `: ${typeof a.value === "string" ? (labels[a.value] || a.value) : a.value.name}`
                                : ""}
                            </span>
                          ))}
                        </div>
                      </article>
                    ))
                )}
              </section>
            ) : (
              <>
                {view === "home" && (
                  <div className="experience-grid page-enter">
                    <section className="world-panel">
                      <div className="world-toolbar">
                        <span className="scene-label">
                          <span className="scene-dot" />
                          {labels[profile.world.scene]}
                          <span className="world-tag">
                            {text("আমাদের ছোট্ট জগৎ", "OUR LITTLE WORLD")}
                          </span>
                        </span>
                        <div>
                          <button
                            aria-label="World information"
                            onClick={() => setShowDetails(!showDetails)}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                          <button
                            aria-label="Expand world"
                            title="Expand world"
                            onClick={() => setExpanded(!expanded)}
                          >
                            {expanded ? (
                              <X size={17} />
                            ) : (
                              <Maximize2 size={17} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="scene-container">
                        <World world={profile.world} mood={mood} />
                        <span className="scene-top-tag">
                          <Sparkles size={13} />
                          {text(
                            "তুমি বললেই গল্প বদলায়",
                            "A world shaped by you",
                          )}
                        </span>
                        <div className="pet-name-tag">
                          <span /> মিঠু <Heart size={12} />
                        </div>
                        <div className="role-tag">
                          {["king", "queen"].includes(profile.world.role) &&
                            "♔ "}
                          {text("তুমি", "You")} · {labels[profile.world.role]}
                        </div>
                        {profile.world.activity === "rest" && (
                          <div className="rest-bubble">
                            কোনো তাড়া নেই। একটু বিশ্রাম নিই।
                          </div>
                        )}
                      </div>
                      {showDetails && (
                        <div className="world-details">
                          <b>Live world state</b>
                          <span>
                            Scene: {profile.world.scene} · You:{" "}
                            {profile.world.role} · Mithu:{" "}
                            {profile.world.petRole}
                          </span>
                          <span>
                            Characters:{" "}
                            {profile.world.characters.join(", ") || "Mithu"} ·
                            Events:{" "}
                            {profile.world.events.slice(-3).join(", ") ||
                              "none yet"}
                          </span>
                          <button onClick={reset} disabled={busy}>
                            <RotateCcw size={13} /> Reset story{" "}
                            {demo ? "(demo)" : "(keeps progress)"}
                          </button>
                        </div>
                      )}
                      <div className="world-caption">
                        <Leaf size={16} />
                        <span>
                          {profile.world.scene === "help"
                            ? "মিঠু নিরাপদ আছে। নদী পার হওয়ার একটা বুদ্ধি বলো।"
                            : profile.world.scene === "restaurant"
                              ? "তোমার মেনু, তোমার নিয়ম। আজ কী রান্না হবে?"
                              : profile.world.scene === "castle"
                                ? "এই রাজ্যে তোমার কল্পনাই গল্পের শুরু।"
                                : text(
                                    "এখানে ভুল উত্তর নেই। তোমার ভাবনাই নতুন গল্প।",
                                    "There are no wrong answers. Just new adventures.",
                                  )}
                        </span>
                        <span className="caption-dots">✦</span>
                      </div>
                    </section>
                    <section
                      className="conversation-panel"
                      aria-label="Conversation"
                    >
                      <div className="conversation-heading">
                        <span className="chat-avatar">
                          <Pet mood={mood} />
                        </span>
                        <div>
                          <h2>
                            {text("মিঠুর সঙ্গে কথা", "A chat with Mithu")}
                          </h2>
                          <span>
                            <i />
                            {stateLabel}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={
                            autoVoice
                              ? "Turn auto voice off"
                              : "Turn auto voice on"
                          }
                          title="Auto voice"
                          onClick={() => {
                            if (autoVoice) speech.stop();
                            setAutoVoice(!autoVoice);
                          }}
                        >
                          {autoVoice ? (
                            <Volume2 size={19} />
                          ) : (
                            <VolumeX size={19} />
                          )}
                        </button>
                      </div>
                      <div className="conversation-content" aria-live="polite">
                        <span className="today-label">
                          {text("আমাদের গল্প, আজ", "OUR STORY, TODAY")}
                        </span>
                        {last && (
                          <div className="child-message">
                            <span>{last.child}</span>
                            <small>
                              {last.source === "voice"
                                ? "Local Whisper transcription"
                                : last.source === "demo"
                                  ? "Demo · text fallback"
                                  : "Text input · লিখে বলা"}
                            </small>
                          </div>
                        )}
                        <div className="pet-message">
                          <span className="bubble-spark">✦</span>
                          <p>
                            {busy ? "তোমার ভাবনাটা নিয়ে একটু ভাবছি…" : reply}
                          </p>
                          <div className="bubble-footer">
                            <span>
                              মিঠু <Heart size={11} />
                            </span>
                            <button
                              disabled={busy}
                              aria-label="Replay pet voice"
                              onClick={() => speech.say(reply, true)}
                            >
                              <Volume2 size={14} />
                              {text("আবার শুনি", "Listen again")}
                            </button>
                          </div>
                        </div>
                        {speech.state === "speaking" && (
                          <button className="audio-stop" onClick={speech.stop}>
                            <Square size={12} />
                            {text("কণ্ঠ থামাও", "Stop audio")}
                          </button>
                        )}
                        <div className="gentle-reminder">
                          <Heart size={13} />
                          {text(
                            "যেমন ইচ্ছে বলো। আমি আছি।",
                            "Take your time. I’m right here.",
                          )}
                        </div>
                      </div>
                      <div className="voice-controls">
                        <div className="mic-row">
                          <span
                            className={`sound-wave ${speech.state === "recording" ? "animated" : ""}`}
                          >
                            <i />
                            <i />
                            <i />
                            <i />
                          </span>
                          <button
                            className={`mic-button ${speech.state === "recording" ? "recording" : ""}`}
                            onClick={microphone}
                            disabled={
                              busy ||
                              boot ||
                              demo ||
                              speech.state === "processing"
                            }
                            aria-label={
                              speech.state === "recording"
                                ? "Stop recording and transcribe"
                                : "Start microphone"
                            }
                          >
                            {speech.state === "recording" ? (
                              <Square size={24} fill="currentColor" />
                            ) : (
                              <Mic size={29} />
                            )}
                          </button>
                          <span
                            className={`sound-wave ${speech.state === "recording" ? "animated" : ""}`}
                          >
                            <i />
                            <i />
                            <i />
                            <i />
                          </span>
                        </div>
                        <b>
                          {speech.state === "recording"
                            ? text(
                                "বলা শেষ? আবার চাপ দাও",
                                "Finished? Tap again",
                              )
                            : text(
                                "চাপ দাও, তোমার কথা বলো",
                                "Tap and tell me your idea",
                              )}
                        </b>
                        <span className="voice-provider">
                          {demo
                            ? "Demo uses labelled text, not the microphone"
                            : status.stt
                              ? `Local Whisper ${status.sttModel || "tiny"} · বাংলা / English`
                              : "Voice input unavailable · text works below"}
                        </span>
                        {status.stt && !demo && (
                          <p className="voice-warning">
                            {text(
                              "বাংলা শনাক্তকরণ পরীক্ষামূলক—ভুল শুনলে লিখে শুধরে দাও।",
                              "Bangla recognition is experimental. Correct misheard words with text.",
                            )}
                          </p>
                        )}
                        {speech.state === "recording" && (
                          <button
                            className="cancel-record"
                            onClick={speech.stop}
                          >
                            <MicOff size={13} /> বাতিল করো · cancel recording
                          </button>
                        )}
                        {speech.error && (
                          <div className="speech-error" role="alert">
                            {speech.error}
                            <button
                              onClick={() => {
                                speech.stop();
                                inputRef.current?.focus();
                              }}
                            >
                              লিখে বলি
                            </button>
                          </div>
                        )}
                        {pendingVoice && (
                          <div className="transcript-review">
                            <b>Whisper শুনেছে · পরীক্ষামূলক</b>
                            <p>{pendingVoice}</p>
                            <span>ঠিক শুনেছি? নিচে শুধরে বা পাঠিয়ে দাও।</span>
                            <button
                              onClick={() => {
                                setPendingVoice("");
                                setInput("");
                              }}
                            >
                              বাতিল
                            </button>
                          </div>
                        )}
                        <form
                          className="text-input"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void send(
                              input,
                              pendingVoice === input ? "voice" : "text",
                            );
                          }}
                        >
                          <Keyboard size={18} />
                          <input
                            ref={inputRef}
                            aria-label="Text fallback"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            maxLength={600}
                            placeholder={text(
                              "চাইলে লিখেও বলতে পারো…",
                              "Or type your idea…",
                            )}
                            disabled={busy || boot}
                          />
                          <button
                            aria-label="Send text"
                            disabled={busy || !input.trim()}
                          >
                            <Send size={17} />
                          </button>
                        </form>
                        <span className="text-fallback-label">
                          {text(
                            "টেক্সট বিকল্প · তোমার নিজের কথা",
                            "TEXT FALLBACK · YOUR OWN WORDS",
                          )}
                        </span>
                      </div>
                    </section>
                  </div>
                )}
                {demo && view === "home" && (
                  <section className="demo-sequence">
                    <div>
                      <span className="step-count">
                        {Math.min(demoStep + 1, 6)} / 6
                      </span>
                      <div>
                        <b>
                          {demoStep >= 6
                            ? "এবার অভিভাবকের আঙিনায় অগ্রগতি দেখো"
                            : demoLines[demoStep]}
                        </b>
                        <small>
                          {demoStep >= 6
                            ? "The recommendation now uses the two short replies."
                            : "Presenter text → real state change → recorded observation"}
                        </small>
                      </div>
                    </div>
                    {demoStep < 6 ? (
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={async () => {
                          await send(demoLines[demoStep], "demo");
                          setDemoStep((s) => s + 1);
                        }}
                      >
                        Run text step <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button
                        className="secondary-button"
                        onClick={() => go("parent")}
                      >
                        View progress <ArrowRight size={15} />
                      </button>
                    )}
                  </section>
                )}
                <section className="adventures-section" ref={scenariosRef}>
                  <div className="section-title">
                    <div>
                      <span className="heading-icon">
                        <Compass size={21} />
                      </span>
                      <h2>
                        {text(
                          "আজ কী খেলবে?",
                          "Where will your words take you?",
                        )}
                      </h2>
                      <span className="section-subtitle">
                        {text(
                          "একটা শুরু বেছে নাও, বাকিটা তোমার",
                          "Pick a beginning. Make it your own.",
                        )}
                      </span>
                    </div>
                    {view === "home" ? (
                      <button onClick={() => go("worlds")}>
                        {text("সব খেলা", "All adventures")}{" "}
                        <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button onClick={() => go("home")}>
                        <ArrowLeft size={15} />{" "}
                        {text("বন্ধুর কাছে", "Back to Mithu")}
                      </button>
                    )}
                  </div>
                  <div className="scenario-grid">
                    {scenarios.map(([scene, title, en, desc], i) => (
                      <button
                        className={`scenario-card scenario-${scene}`}
                        key={scene}
                        onClick={() => start(scene)}
                        disabled={busy}
                      >
                        <div className="scenario-art">
                          <World world={{ ...initialWorld(), scene }} mini />
                          <span className="scenario-number">0{i + 1}</span>
                          {scene === "castle" && (
                            <span className="favorite-tag">
                              <Sparkles size={11} /> কল্পনার ডানা
                            </span>
                          )}
                        </div>
                        <div className="scenario-copy">
                          <div>
                            <span className="scenario-kicker">{en}</span>
                            <h3>{language === "bn" ? title : en}</h3>
                            <p>
                              {language === "bn"
                                ? desc
                                : [
                                    "Help Mithu find a way across the river.",
                                    "Be the chef, the customer, or the shopkeeper.",
                                    "A castle, a dragon… whatever comes next.",
                                  ][i]}
                            </p>
                          </div>
                          <span className="scenario-arrow">
                            <ArrowUpRightIcon />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {view === "worlds" && (
                    <div className="extra-worlds">
                      {(["moon", "shop", "stage", "hospital"] as Scene[]).map(
                        (scene) => (
                          <button
                            key={scene}
                            className="extra-world"
                            onClick={() => start(scene)}
                            disabled={busy}
                          >
                            <World world={{ ...initialWorld(), scene }} mini />
                            <div>
                              <h3>{labels[scene]}</h3>
                              <span>
                                {["stage", "hospital"].includes(scene)
                                  ? "Simple story scene · no medical advice"
                                  : "More room for imagination"}
                              </span>
                              <ArrowRight size={17} />
                            </div>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </section>
                {view === "home" && (
                  <div className="bottom-strip">
                    <div className="encouragement">
                      <span className="heart-tile">
                        <Heart size={19} />
                      </span>
                      <div>
                        <b>
                          {text(
                            "ছোট্ট কথাও বড় একটা শুরু।",
                            "Every little word is a big beginning.",
                          )}
                        </b>
                        <span>
                          {text(
                            "নিজের মতো বলো, নিজের গতিতে বেড়ে ওঠো।",
                            "No scores. No pressure. Just you and a little friend.",
                          )}
                        </span>
                      </div>
                    </div>
                    <button
                      className="next-suggestion"
                      onClick={() => start(rec.scene)}
                      disabled={busy}
                    >
                      <SproutIcon />
                      <div>
                        <span>
                          {text(
                            "তোমার জন্য পরের ভাবনা",
                            "A LITTLE IDEA FOR YOU",
                          )}
                        </span>
                        <b>{labels[rec.scene]}</b>
                      </div>
                      <ChevronRight size={17} />
                    </button>
                  </div>
                )}
              </>
            )}
            <footer className="app-footer">
              <span>
                <ShieldCheck size={13} />
                {text(
                  "কোনো বিজ্ঞাপন নয়। কোনো তাড়া নয়।",
                  "No ads. No pressure. Just play.",
                )}
              </span>
              <button onClick={() => setModal("help")}>
                <span className={`provider-dot ${status.ai ? "live" : ""}`} />
                {demo
                  ? "Demo · offline rules"
                  : status.ai
                    ? "Local AI available"
                    : "Offline rules · not generative AI"}
                <span className="footer-divider">/</span>
                {status.tts ? "Local Bangla voice" : "Text responses"}
              </button>
            </footer>
            {providerNote && (
              <p className="provider-note" role="status">
                {providerNote}
              </p>
            )}
          </>
        )}
      </main>
      {boot && <div className="loading-toast">মিঠুর পৃথিবী খুলছে…</div>}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "consent"
                ? "Guardian consent"
                : modal === "parent"
                  ? "Parent gate"
                  : "Setup help"
            }
          >
            <button
              className="modal-close"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "consent" ? (
              <>
                <span className="modal-icon">
                  <Mic size={27} />
                </span>
                <div className="eyebrow">FOR A PARENT OR GUARDIAN</div>
                <h2>কথা শুরুর আগে, একটু অনুমতি</h2>
                <p>
                  মাইক্রোফোনের অডিও এই সার্ভারের স্থানীয় Whisper-এ প্রক্রিয়া
                  হবে; অডিও ফাইল রাখা হবে না। কথার লেখা ও অগ্রগতি এই সার্ভারে
                  সংরক্ষিত হবে।
                </p>
                <p className="small muted">
                  নিজের কম্পিউটারে চালালে তথ্য সেখানেই থাকে। অনলাইন প্রিভিউতে
                  অডিও প্রিভিউ সার্ভারে যায়। কোনো ক্লাউড AI সেবায় পাঠানো হয়
                  না।
                </p>
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    আমি অভিভাবক। মাইক্রোফোন ব্যবহার ও স্থানীয়ভাবে কথার লেখা
                    সংরক্ষণে সম্মতি দিচ্ছি।
                  </span>
                </label>
                <button
                  className="primary-button full"
                  disabled={!consent}
                  onClick={async () => {
                    try {
                      await update({ consent: true, microphone: true });
                      setModal(null);
                      if (!status.stt)
                        setError(
                          "Whisper unavailable. Use text or enable it in setup.",
                        );
                    } catch {
                      /* error already shown */
                    }
                  }}
                >
                  অনুমতি দিন <Check size={17} />
                </button>
                <button
                  className="text-button centered"
                  onClick={() => {
                    setModal(null);
                    inputRef.current?.focus();
                  }}
                >
                  না, শুধু লিখে খেলি
                </button>
              </>
            ) : modal === "parent" ? (
              <>
                <span className="modal-icon">
                  <ShieldCheck size={27} />
                </span>
                <div className="eyebrow">A LITTLE SPACE FOR GROWN-UPS</div>
                <h2>অভিভাবকের আঙিনা</h2>
                <p>একজন বড় মানুষকে বলো, ছোট্ট অঙ্কটার উত্তর দিতে।</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (gate === "12") {
                      setModal(null);
                      setView("parent");
                    } else setError("আবার চেষ্টা করুন: ৭ + ৫ = ?");
                  }}
                >
                  <label className="gate-label" htmlFor="parent-answer">
                    ৭ + ৫ = ?
                  </label>
                  <input
                    id="parent-answer"
                    autoFocus
                    className="gate-input"
                    type="number"
                    value={gate}
                    onChange={(e) => setGate(e.target.value)}
                    placeholder="উত্তর"
                  />
                  <button className="primary-button full" type="submit">
                    প্রবেশ করুন <ArrowRight size={16} />
                  </button>
                </form>
                <small className="muted">
                  Convenience gate, not authentication or secure parental
                  verification.
                </small>
              </>
            ) : (
              <>
                <span className="modal-icon">
                  <WandSparkles size={27} />
                </span>
                <h2>একটু কথা, অনেক সম্ভাবনা</h2>
                <p>
                  বাংলা বা ইংরেজিতে নিজের ভাবনা বলো বা লেখো। সব অনুরোধ বোঝা
                  সম্ভব নয়—মিঠু তখন জানতে চাইবে।
                </p>
                <div className="provider-list">
                  <div>
                    <b>Understanding</b>
                    <span>
                      {status.ai
                        ? `Ollama · ${status.model}`
                        : "Offline bilingual rules · no model running"}
                    </span>
                  </div>
                  <div>
                    <b>Speech recognition</b>
                    <span>
                      {status.stt
                        ? `Live local Whisper ${status.sttModel || "tiny"} · bn / en`
                        : "Unavailable · enable local Whisper"}
                    </span>
                  </div>
                  <div>
                    <b>Pet voice</b>
                    <span>
                      {status.tts
                        ? "Live eSpeak NG · robotic Bengali voice"
                        : "Local device voice if installed; otherwise text"}
                    </span>
                  </div>
                </div>
                <p className="small">
                  Local AI only interprets validated world actions. Replies are
                  safe Bangla templates. Tiny Whisper can mishear Bangla and
                  young voices; it does not score pronunciation. Browser cloud
                  speech recognition is not used.
                </p>
                <details>
                  <summary>Free local setup commands</summary>
                  <pre>
                    sudo apt install espeak-ng
                    <br />
                    pip install -r speech/requirements.txt
                    <br />
                    python -m uvicorn speech.server:app --port 8001
                    <br />
                    <br /># Optional generative intent model
                    <br />
                    ollama pull qwen2.5:1.5b
                    <br />
                    ollama serve
                  </pre>
                  <p className="small">
                    Initial model downloads need internet. Cached models run
                    locally without a paid API. See README.md for full
                    instructions.
                  </p>
                </details>
                <button
                  className="secondary-button full"
                  onClick={async () => {
                    setStatus(await api("/api/status"));
                  }}
                >
                  Refresh provider status <RotateCcw size={15} />
                </button>
                <button
                  className="text-button centered"
                  onClick={() => {
                    setModal(null);
                    go("worlds");
                  }}
                >
                  খেলার জগৎ দেখি <ArrowRight size={15} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M6 18L18 6M6 6H18V18" />
    </svg>
  );
}
function SproutIcon() {
  return <Leaf size={23} />;
}
