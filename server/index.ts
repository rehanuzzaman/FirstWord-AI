import "./env.js";
import { converseChat } from "./chat.js";
import { transcribeSpeech } from "./stt.js";
import { turnMetrics } from "../shared/progress.js";
import { speakLine } from "./tts.js";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  applyActions,
  makeResponse,
  newProfile,
  parseIntent,
  recordTurn,
  recommendation,
  unsafe,
  type Profile,
  type Turn,
} from "../shared/engine.js";
import {
  infer,
  inferLocal,
  providers,
  speak,
  transcribe,
} from "./providers.js";
import {
  applyPlay,
  imagineFallback,
  updateDiscoveries,
  PlayAction,
} from "../shared/play.js";
import { classify } from "./trained-intents.js";
const app = express();
const port = Number(process.env.PORT || 3000);
const root = process.cwd();
const dataDir = path.join(root, "data");
await mkdir(dataDir, { recursive: true, mode: 0o700 });
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.headers["sec-fetch-site"] === "cross-site"
    ) {
      res.status(403).json({ error: "Cross-site request blocked" });
      return;
    }
  }
  next();
});
app.use(express.json({ limit: "16kb" }));
type Session = { profile: Profile; demo: Profile; busy: boolean };
const sessions = new Map<string, Session>();
async function session(
  req: Request,
  res: Response,
): Promise<{ session: Session; key: string }> {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("fw_session="))
    ?.split("=")[1];
  const key =
    cookie && /^[a-f0-9]{48}$/.test(cookie)
      ? cookie
      : randomBytes(24).toString("hex");
  if (key !== cookie)
    res.cookie("fw_session", key, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 30 * 24 * 3600 * 1000,
      secure: req.secure,
    });
  if (!sessions.has(key)) {
    let p = newProfile();
    try {
      p = JSON.parse(await readFile(path.join(dataDir, `${key}.json`), "utf8"));
    } catch {
      /* a new, non-persisted profile */
    }
    const demo = newProfile("demo", "ডেমো বন্ধু");
    sessions.set(key, { profile: p, demo, busy: false });
  }
  return { session: sessions.get(key)!, key };
}
async function save(key: string, p: Profile) {
  if (!p.consent) return;
  const file = path.join(dataDir, `${key}.json`);
  await writeFile(`${file}.tmp`, JSON.stringify(p), { mode: 0o600 });
  await rename(`${file}.tmp`, file);
}
app.get("/api/status", async (_req, res) => res.json(await providers()));
app.get("/api/profile", async (req, res) => {
  const { session: s } = await session(req, res);
  const p = req.query.demo === "true" ? s.demo : s.profile;
  res.json({ profile: p, recommendation: recommendation(p) });
});
app.patch("/api/profile", async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(1).max(24).optional(),
      consent: z.boolean().optional(),
      microphone: z.boolean().optional(),
    })
    .strict()
    .parse(req.body);
  const { session: s, key } = await session(req, res);
  if (s.busy) {
    res.status(409).json({ error: "Please wait for the current turn." });
    return;
  }
  if (input.consent === false) {
    s.profile.consent = false;
    s.profile.microphone = false;
    await unlink(path.join(dataDir, `${key}.json`)).catch(() => {});
  }
  Object.assign(s.profile, input);
  if (!s.profile.consent) s.profile.microphone = false;
  await save(key, s.profile);
  res.json({ profile: s.profile, recommendation: recommendation(s.profile) });
});
app.delete("/api/profile", async (req, res) => {
  const { session: s, key } = await session(req, res);
  if (s.busy) {
    res.status(409).json({ error: "Please wait for the current turn." });
    return;
  }
  await unlink(path.join(dataDir, `${key}.json`)).catch(() => {});
  s.profile = newProfile();
  s.demo = newProfile("demo", "ডেমো বন্ধু");
  res.json({ profile: s.profile, recommendation: recommendation(s.profile) });
});
app.post("/api/reset", async (req, res) => {
  const body = z
    .object({ demo: z.boolean(), storyOnly: z.boolean().optional() })
    .strict()
    .parse(req.body);
  const { session: s, key } = await session(req, res);
  if (s.busy) {
    res.status(409).json({ error: "Please wait for the current turn." });
    return;
  }
  if (body.demo) s.demo = newProfile("demo", "ডেমো বন্ধু");
  else {
    s.profile.world = newProfile().world;
    delete s.profile.previous;
    await save(key, s.profile);
  }
  const p = body.demo ? s.demo : s.profile;
  res.json({ profile: p, recommendation: recommendation(p) });
});
app.post("/api/play", async (req, res) => {
  const body = z
    .object({ action: PlayAction, demo: z.boolean().default(false) })
    .strict()
    .parse(req.body);
  const { session: s, key } = await session(req, res);
  if (s.busy) {
    res.status(409).json({ error: "Let Mithu finish this turn first." });
    return;
  }
  s.busy = true;
  try {
    const result = applyPlay(body.demo ? s.demo : s.profile, body.action);
    if (body.demo) s.demo = result.profile;
    else {
      s.profile = result.profile;
      await save(key, result.profile);
    }
    res.json({ ...result, recommendation: recommendation(result.profile) });
  } finally {
    s.busy = false;
  }
});
app.post("/api/turn", async (req, res) => {
  const started = Date.now();
  const body = z
    .object({
      text: z.string().trim().max(600),
      source: z.enum(["text", "voice", "demo"]).default("text"),
      demo: z.boolean().default(false),
    })
    .strict()
    .parse(req.body);
  const { session: s, key } = await session(req, res);
  if (s.busy) {
    res.status(409).json({ error: "One turn at a time, please." });
    return;
  }
  s.busy = true;
  try {
    const p = body.demo ? s.demo : s.profile;
    if (body.source === "voice" && (!p.consent || !p.microphone)) {
      res
        .status(403)
        .json({ error: "Guardian consent is required for voice." });
      return;
    }
    if (!body.text) {
      res.json({
        profile: p,
        recommendation: recommendation(p),
        reply: makeResponse("", p.world, [], p),
        mode: "rules",
      });
      return;
    }
    let actions = parseIntent(body.text, p.world);
    // One chat entry point for every provider (Groq now, Gemini later).
    // Demo runs and unsafe text never reach a cloud model.
    let cloudReply: string | null = null;
    let cloudProvider: "groq" | "gemini" = "groq";
    let cloudOverride = false;
    if (!body.demo && !unsafe(body.text)) {
      const g = await converseChat({
        childText: body.text,
        world: p.world,
        recent: p.history.slice(-6).map((t) => ({ child: t.child, pet: t.pet })),
        language: /[\u0980-\u09FF]/.test(body.text) ? "bn" : "en",
      });
      if (g) {
        // Model actions win; if it only spoke, keep the parser's clear game actions.
        if (g.actions.length) actions = g.actions;
        cloudReply = g.reply;
        cloudProvider = g.provider;
        cloudOverride = Boolean(g.override);
      }
    }
    let mode: Turn["mode"] = cloudReply ? cloudProvider : "rules";
    let providerNote = cloudReply
      ? cloudProvider === "groq"
        ? "Groq chat (free tier) · actions validated by game schema"
        : "Gemini conversation · actions validated by game schema"
      : "Offline rules · not generative AI";
    if (!cloudReply && !body.demo && !unsafe(body.text) && (await providers()).ai) {
      try {
        actions = await infer(body.text, p);
        mode = "ollama";
        providerNote =
          "Local model interpreted actions · safety-templated reply";
      } catch {
        providerNote =
          "Local model unavailable or invalid output · offline rules used";
      }
    }
    // The fitted classifier handles paraphrases not covered by the quick bilingual parser.
    if (!actions.length && !unsafe(body.text)) {
      const result = classify(body.text);
      if (result.action) {
        actions = [result.action];
        mode = "trained-classifier";
        providerNote =
          "Trained local intent classifier · synthetic training data";
      }
    }
    // Use the local generative interpreter for open-ended, not already-resolved requests.
    // Never expose its weak Bengali prose as if it were fluent therapy dialogue.
    if (
      !cloudReply &&
      !body.demo &&
      !unsafe(body.text) &&
      !actions.length &&
      (await providers()).localModel
    ) {
      try {
        actions = (await inferLocal(body.text, p)).filter(
          (a) =>
            a.type !== "scene" &&
            !(a.type === "imagine" && unsafe(a.value.name)),
        );
        mode = "local-model";
        providerNote = "Live local Qwen intent inference · guided Bangla reply";
      } catch {
        providerNote =
          "Local model could not provide safe valid actions · guided imagination fallback";
      }
    }
    if (!actions.length) actions = imagineFallback(body.text);
    const world = applyActions(p.world, actions, p.previous);
    const turn: Turn = {
      id: randomUUID(),
      child: body.text,
      pet: "",
      time: new Date().toISOString(),
      source: body.demo ? "demo" : body.source,
      mode,
      actions,
      scene: world.scene,
      metrics: turnMetrics(
        body.text,
        p.history.map((t) => t.child),
        started,
      ),
      fallback: !cloudReply || cloudOverride,
    };
    const updated = updateDiscoveries(recordTurn(p, turn, world));
    turn.pet = cloudReply ?? makeResponse(body.text, world, actions, updated);
    updated.history[updated.history.length - 1] = turn;
    if (body.demo) s.demo = updated;
    else {
      s.profile = updated;
      await save(key, updated);
    }
    res.json({
      profile: updated,
      recommendation: recommendation(updated),
      reply: turn.pet,
      mode,
      providerNote,
      actions,
      fallback: turn.fallback ?? false,
      metrics: turn.metrics,
    });
  } finally {
    s.busy = false;
  }
});
app.post(
  "/api/transcribe",
  express.raw({
    type: ["audio/*", "application/octet-stream", "video/webm"],
    limit: "8mb",
  }),
  async (req, res) => {
    const { session: s } = await session(req, res);
    if (!s.profile.consent || !s.profile.microphone) {
      res
        .status(403)
        .json({ error: "Ask a guardian to enable the microphone first." });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length < 100) {
      // Too short to be speech: report nothing heard. Never invent a transcript.
      res.json({ text: "", provider: "none", repeat: true });
      return;
    }
    try {
      const result = await transcribeSpeech(
        req.body,
        req.headers["content-type"] || "audio/webm",
        req.query.language === "en" ? "en" : "bn",
      );
      if (!s.profile.consent || !s.profile.microphone) {
        res.status(403).json({ error: "Microphone consent was revoked." });
        return;
      }
      // Empty text means nothing was understood. The client then says "আবার বলবে?".
      res.json({
        text: result.text,
        provider: result.provider,
        repeat: result.text.length === 0,
      });
    } catch {
      res.status(503).json({
        error:
          "Speech processing failed. Nothing was saved. Please use text or retry.",
      });
    }
  },
);
app.post("/api/speak", async (req, res) => {
  const { text } = z
    .object({ text: z.string().min(1).max(900) })
    .strict()
    .parse(req.body);
  try {
    // One voice function (server/tts.ts): cached → Edge TTS bn-BD → local fallback.
    const line = await speakLine(text);
    res.setHeader("X-Voice-Source", line.source);
    res.type(line.mime).send(line.audio);
  } catch {
    res
      .status(503)
      .json({ error: "Local voice is unavailable. Text is still available." });
  }
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Unknown API route" }),
);
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  res.status(err instanceof z.ZodError ? 400 : 500).json({
    error:
      err instanceof z.ZodError
        ? "Invalid request. Please check the input."
        : "Something went wrong locally. Please retry.",
  });
});
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, allowedHosts: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.listen(port, "0.0.0.0", () =>
  console.log(
    `FirstWord AI running on http://0.0.0.0:${port} · local-first · no paid services`,
  ),
);
