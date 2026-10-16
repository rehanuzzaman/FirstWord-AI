import { useRef, useState, useEffect } from "react";
export type SpeechState =
  "ready" | "recording" | "processing" | "speaking" | "error";
export function useSpeech(onTranscript: (text: string) => void) {
  const [state, setState] = useState<SpeechState>("ready");
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = useRef(0);
  const request = useRef<AbortController | null>(null);
  const url = useRef("");
  function stop() {
    token.current++;
    request.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    if (audio.current) {
      audio.current.pause();
      audio.current = null;
    }
    if (url.current) URL.revokeObjectURL(url.current);
    window.speechSynthesis?.cancel();
    setState("ready");
  }
  async function record(language: "bn" | "en") {
    stop();
    setError("");
    const current = token.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "এই ব্রাউজারে মাইক্রোফোন চালু করা যায়নি। Chrome/Edge ও HTTPS ব্যবহার করো, অথবা লিখে বলো।",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (current !== token.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (m) => MediaRecorder.isTypeSupported(m),
      );
      const rec = new MediaRecorder(
        media,
        type ? { mimeType: type } : undefined,
      );
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = async () => {
        media.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        if (current !== token.current) return;
        setState("processing");
        request.current = new AbortController();
        try {
          const r = await fetch(`/api/transcribe?language=${language}`, {
            method: "POST",
            headers: { "Content-Type": rec.mimeType || "audio/webm" },
            body: new Blob(chunks, { type: rec.mimeType }),
            signal: request.current.signal,
          });
          const data = await r.json();
          if (current !== token.current) return;
          if (!r.ok) throw new Error(data.error);
          if (!data.text)
            throw new Error(
              "স্পষ্ট শুনতে পাইনি। কোনো তাড়া নেই—আবার বলো বা লিখে দাও।",
            );
          setState("ready");
          onTranscript(data.text);
        } catch (e) {
          if (current === token.current) {
            setError(e instanceof Error ? e.message : "Speech unavailable");
            setState("error");
          }
        }
      };
      rec.start();
      setState("recording");
      timer.current = setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 30000);
    } catch (e) {
      if (current === token.current) {
        setState("error");
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "মাইক্রোফোনের অনুমতি মেলেনি। ব্রাউজারের অনুমতি বদলাও, অথবা লিখে বলো।"
            : e instanceof Error
              ? e.message
              : "Microphone unavailable",
        );
      }
    }
  }
  function finish() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function say(text: string, local: boolean) {
    stop();
    setError("");
    const current = token.current;
    if (!local) {
      const voice = window.speechSynthesis
        ?.getVoices()
        .find(
          (v) =>
            v.localService &&
            v.lang.startsWith(/[\u0980-\u09ff]/u.test(text) ? "bn" : "en"),
        );
      if (!voice) {
        setError(
          "বাংলা কণ্ঠ পাওয়া যায়নি। স্থানীয় eSpeak NG চালু করো। উত্তরটি পড়া যাবে।",
        );
        setState("error");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.onend = () => {
        if (current === token.current) setState("ready");
      };
      utterance.onerror = () => {
        if (current === token.current) {
          setError("Device voice failed. Please read the reply.");
          setState("error");
        }
      };
      setState("speaking");
      window.speechSynthesis.speak(utterance);
      return;
    }
    try {
      setState("processing");
      request.current = new AbortController();
      const r = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: request.current.signal,
      });
      if (!r.ok) throw new Error("স্থানীয় কণ্ঠ চালু নেই। উত্তরটি পড়তে পারো।");
      const blob = await r.blob();
      if (current !== token.current) return;
      url.current = URL.createObjectURL(blob);
      const a = new Audio(url.current);
      audio.current = a;
      a.onended = () => {
        if (current === token.current) setState("ready");
        URL.revokeObjectURL(url.current);
      };
      a.onerror = () => {
        if (current === token.current) {
          setState("error");
          setError("Audio playback failed. Please retry.");
        }
      };
      await a.play();
      if (current === token.current) setState("speaking");
      else a.pause();
    } catch (e) {
      if (current === token.current) {
        setError(e instanceof Error ? e.message : "Voice unavailable");
        setState("error");
      }
    }
  }
  useEffect(
    () => () => {
      token.current++;
      request.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  return { state, error, record, finish, stop, say };
}

/* ------------------------------------------------------------------ */
/* Voice-only session (used by the restaurant situation).               */
/* The mic stays open. A phrase is sent automatically after about 1 s    */
/* of silence. Nothing is recorded or stored until the guardian consents */
/* and the server accepts the request.                                   */
/* ------------------------------------------------------------------ */

export const VOICE_END_SILENCE_MS = 1000; // end of phrase after this much quiet
export const VOICE_MIN_PHRASE_MS = 350; // ignore clicks and coughs shorter than this
export const VOICE_MAX_PHRASE_MS = 20000; // hard stop for a very long phrase
export const VOICE_LEVEL_THRESHOLD = 0.03; // loudness that counts as speech (0-1)

export type VoiceStatus = "off" | "listening" | "hearing" | "muted" | "error";

/** Plays an audio blob. Returns a stop function and a promise that resolves on end. */
export function playBlob(blob: Blob): { stop: () => void; done: Promise<void> } {
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  // Safety: a clip that never reports "ended" must not freeze the conversation.
  const guard = setTimeout(() => finish(), 25000);
  const end = () => {
    clearTimeout(guard);
    finish();
  };
  a.onended = () => {
    URL.revokeObjectURL(url);
    end();
  };
  a.onerror = () => {
    URL.revokeObjectURL(url);
    end();
  };
  void a.play().catch(() => end());
  return {
    stop: () => {
      clearTimeout(guard);
      a.pause();
      URL.revokeObjectURL(url);
      finish();
    },
    done,
  };
}

/** Asks the server for speech. Returns the audio and which voice produced it. */
export async function fetchSpeech(text: string): Promise<{ blob: Blob; source: string }> {
  const r = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error("voice unavailable");
  return {
    blob: await r.blob(),
    source: r.headers.get("X-Voice-Source") || "unknown",
  };
}

export function useVoiceSession(onPhrase: (blob: Blob, mime: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>("off");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const phraseStart = useRef(0);
  const lastVoice = useRef(0);
  const speakingRef = useRef(false);
  const mutedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPhraseRef = useRef(onPhrase);
  onPhraseRef.current = onPhrase;

  function discardPhrase() {
    const rec = recorderRef.current;
    recorderRef.current = null;
    chunksRef.current = [];
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
  }

  function tick() {
    const analyser = analyserRef.current;
    if (!analyser || mutedRef.current) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) {
      const x = (v - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / data.length);
    setLevel(Math.min(1, rms * 4));
    // Mithu is speaking: do not listen to our own voice.
    if (speakingRef.current) {
      discardPhrase();
      return;
    }
    const now = Date.now();
    const loud = rms >= VOICE_LEVEL_THRESHOLD;
    if (loud) {
      lastVoice.current = now;
      if (!recorderRef.current && streamRef.current) startPhrase();
      setStatus("hearing");
    } else if (recorderRef.current) {
      setStatus("listening");
    }
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      const length = now - phraseStart.current;
      const quiet = now - lastVoice.current;
      if ((quiet >= VOICE_END_SILENCE_MS && length >= VOICE_MIN_PHRASE_MS) || length >= VOICE_MAX_PHRASE_MS) {
        rec.stop();
      }
    }
  }

  function startPhrase() {
    const stream = streamRef.current;
    if (!stream || !window.MediaRecorder) return;
    const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const mime = rec.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];
      if (recorderRef.current === rec) recorderRef.current = null;
      const length = Date.now() - phraseStart.current;
      if (length >= VOICE_MIN_PHRASE_MS && blob.size > 0 && !speakingRef.current) {
        onPhraseRef.current(blob, mime);
      }
      setStatus(mutedRef.current ? "muted" : "listening");
    };
    recorderRef.current = rec;
    phraseStart.current = Date.now();
    lastVoice.current = Date.now();
    rec.start(250);
  }

  async function start() {
    if (streamRef.current) return;
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error("এই ব্রাউজারে মাইক্রোফোন চালু করা যায়নি। Chrome বা Edge ব্যবহার করো।");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;
      timerRef.current = setInterval(tick, 100);
      setStatus("listening");
    } catch (e) {
      setStatus("error");
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "মাইক্রোফোনের অনুমতি মেলেনি। ব্রাউজারের অনুমতি দাও, অথবা অভিভাবককে বলো।"
          : e instanceof Error
            ? e.message
            : "মাইক্রোফোন চালু করা যায়নি।",
      );
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    discardPhrase();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
    setStatus("off");
  }

  /** Mute stops the mic: the track is stopped and any phrase in progress is dropped. */
  function setMuted(muted: boolean) {
    mutedRef.current = muted;
    if (muted) {
      discardPhrase();
      setStatus("muted");
    } else if (streamRef.current) {
      setStatus("listening");
    }
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  /** Called around Mithu's speech so the mic does not hear the pet. */
  function setSpeaking(on: boolean) {
    speakingRef.current = on;
    if (on) discardPhrase();
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      discardPhrase();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxRef.current?.close();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { status, level, error, start, stop, setMuted, setSpeaking };
}
