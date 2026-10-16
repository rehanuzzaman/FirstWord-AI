import { z } from "zod";

export const Scenes = z.enum([
  "meadow",
  "help",
  "restaurant",
  "shop",
  "castle",
  "moon",
  "stage",
  "hospital",
]);
export type Scene = z.infer<typeof Scenes>;
export const Objects = z.enum([
  "rice",
  "fish",
  "mango",
  "water",
  "bridge",
  "boat",
  "flower",
  "tree",
  "cake",
  "book",
  "star",
  "ball",
]);
export type WorldObject = z.infer<typeof Objects>;
export const Roles = z.enum([
  "friend",
  "customer",
  "shopkeeper",
  "chef",
  "king",
  "queen",
  "explorer",
  "helper",
  "storyteller",
]);
export const Characters = z.enum(["dragon", "rabbit", "bird"]);
export const Colors = z.enum(["purple", "pink", "blue", "green", "orange"]);
export const Imagination = z
  .object({
    name: z.string().min(1).max(60),
    shape: z.enum(["house", "creature", "vehicle", "plant", "toy"]),
    color: Colors,
  })
  .strict();
export const Action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("scene"), value: Scenes }).strict(),
  z.object({ type: z.literal("object"), value: Objects }).strict(),
  z.object({ type: z.literal("character"), value: Characters }).strict(),
  z.object({ type: z.literal("role"), value: Roles }).strict(),
  z.object({ type: z.literal("color"), value: Colors }).strict(),
  z
    .object({
      type: z.literal("move"),
      value: z.enum(["left", "right", "center"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("activity"),
      value: z.enum(["play", "story", "help", "serve", "rest"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("event"),
      value: z.enum([
        "dragon_hungry",
        "pet_helped",
        "party",
        "order_ready",
        "safe_path",
        "dragon_fed",
        "ball_play",
      ]),
    })
    .strict(),
  z.object({ type: z.literal("imagine"), value: Imagination }).strict(),
  z.object({ type: z.literal("end") }).strict(),
  z.object({ type: z.literal("undo") }).strict(),
]);
export type ActionType = z.infer<typeof Action>;
export const Proposal = z.object({ actions: z.array(Action).max(10) }).strict();
export interface World {
  scene: Scene;
  colored: boolean;
  color: z.infer<typeof Colors>;
  objects: WorldObject[];
  characters: z.infer<typeof Characters>[];
  role: z.infer<typeof Roles>;
  petRole: string;
  position: "left" | "right" | "center";
  activity: string;
  events: string[];
  turn: number;
  imaginations?: z.infer<typeof Imagination>[];
  coordinates?: [number, number];
}
export const initialWorld = (): World => ({
  scene: "meadow",
  colored: false,
  color: "purple",
  objects: [],
  characters: [],
  role: "friend",
  petRole: "friend",
  position: "center",
  activity: "play",
  events: [],
  turn: 0,
});
export interface Turn {
  id: string;
  child: string;
  pet: string;
  time: string;
  source: "text" | "voice" | "demo";
  mode: "rules" | "ollama" | "local-model" | "trained-classifier" | "gemini" | "groq";
  actions: ActionType[];
  scene: Scene;
  /** Per-turn progress data. Counts and timings only; no diagnosis. */
  metrics?: {
    words: number;
    newWords: number;
    sentenceWords: number;
    responseMs: number;
  };
  /** True when the offline rules wrote the pet's reply (shown on screen). */
  fallback?: boolean;
}
export interface Profile {
  id: string;
  name: string;
  consent: boolean;
  microphone: boolean;
  history: Turn[];
  completed: { scene: Scene; time: string }[];
  words: Record<string, number>;
  skills: Record<string, number>;
  world: World;
  previous?: World;
  play?: { pats: number; interactions: number; discoveries: string[] };
  created: string;
}
export const newProfile = (id = "local", name = "ছোট্ট বন্ধু"): Profile => ({
  id,
  name,
  consent: false,
  microphone: false,
  history: [],
  completed: [],
  words: {},
  skills: {},
  world: initialWorld(),
  created: new Date().toISOString(),
});
export const labels: Record<string, string> = {
  meadow: "বন্ধুর বাগান",
  help: "মিঠুকে সাহায্য",
  restaurant: "মজার রেস্তোরাঁ",
  shop: "আমাদের দোকান",
  castle: "কল্পনার রাজ্য",
  moon: "চাঁদের দেশে",
  stage: "গল্পের মঞ্চ",
  hospital: "যত্নের ঘর",
  rice: "ভাত",
  fish: "মাছ",
  mango: "আম",
  water: "পানি",
  bridge: "সেতু",
  boat: "নৌকা",
  flower: "ফুল",
  tree: "গাছ",
  cake: "কেক",
  book: "বই",
  star: "তারা",
  ball: "বল",
  dragon: "ড্রাগন",
  rabbit: "খরগোশ",
  bird: "পাখি",
  friend: "বন্ধু",
  customer: "ক্রেতা",
  shopkeeper: "দোকানদার",
  chef: "রাঁধুনি",
  king: "রাজা",
  queen: "রানি",
  explorer: "অভিযাত্রী",
  helper: "সাহায্যকারী",
  storyteller: "গল্পকার",
  vocabulary: "শব্দের ব্যবহার",
  sentences: "বাক্য তৈরি",
  questions: "প্রশ্ন করা",
  needs: "ইচ্ছা প্রকাশ",
  explaining: "ভাবনা বোঝানো",
  storytelling: "গল্প বলা",
  conversation: "কথোপকথন",
};
const scenePatterns: [Scene, RegExp][] = [
  [
    "restaurant",
    /restaurant|café|cafe|diner|eat out|open.*kitchen|রেস্তো|রেস্টু|খাবারের দোকান|হোটেল/iu,
  ],
  ["shop", /\bshop\b|market|store|বাজার|দোকান(?:\s|$|খুলি|খুল)/iu],
  ["castle", /castle|palace|kingdom|fortress|দুর্গ|প্রাসাদ|রাজ্য|রাজবাড়ি/iu],
  ["moon", /moon|space|lunar|চাঁদ|চন্দ্র|মহাকাশ/iu],
  [
    "help",
    /help (?:my |our |the )?pet|help mithu|river|stuck|সাহায্য.*মিঠু|মিঠু.*সাহায্য|বন্ধু.*সাহায্য|নদী/iu,
  ],
  ["stage", /stage|performance|theat(?:er|re)|মঞ্চ|অভিনয়/iu],
  ["hospital", /hospital|হাসপাতাল|যত্নের ঘর/iu],
  ["meadow", /garden|meadow|forest|বাগান|জঙ্গল|বনভূমি/iu],
];
const objectPatterns: [WorldObject, RegExp][] = [
  ["rice", /\brice\b|ভাত/iu],
  ["fish", /\bfish\b|মাছ/iu],
  ["mango", /\bmango(?:es|s)?\b|আম(?:\s|$|।|,|খা|চা|দাও|দিন)/iu],
  ["water", /\bwater\b|পানি|জল/iu],
  ["bridge", /\bbridge\b|সেতু|ব্রিজ/iu],
  ["boat", /\bboat\b|নৌকা/iu],
  ["flower", /\bflowers?\b|ফুল/iu],
  ["tree", /\btrees?\b|গাছ/iu],
  ["cake", /\bcake\b|কেক/iu],
  ["book", /\bbook\b|বই/iu],
  ["star", /\bstars?\b|তারা/iu],
  ["ball", /\bball\b|বল(?:\s|$|।)/iu],
];
const rolePatterns: [z.infer<typeof Roles>, RegExp][] = [
  [
    "shopkeeper",
    /shopkeeper|seller|serve (?:the |our )?customers|দোকানদার|বিক্রেতা/iu,
  ],
  ["customer", /customer|buyer|ক্রেতা|খদ্দের/iu],
  ["chef", /chef|cook|রাঁধুনি|বাবুর্চি/iu],
  ["king", /\bking\b|রাজা/iu],
  ["queen", /\bqueen\b|রানি|রাণী/iu],
  ["explorer", /explorer|astronaut|অভিযাত্রী|নভোচারী/iu],
  ["helper", /\bhelper\b|সাহায্যকারী/iu],
  ["storyteller", /storyteller|গল্পকার/iu],
];
export function unsafe(text: string) {
  return /\b(kill|suicide|porn|sex|gun|bomb|password|address|phone number)\b|হত্যা|আত্মহত্যা|বন্দুক|বোমা|পাসওয়ার্ড|ফোন নম্বর/iu.test(
    text,
  );
}
export function parseIntent(text: string, world: World): ActionType[] {
  const t = text.normalize("NFKC");
  if (!t.trim() || unsafe(t)) return [];
  if (
    /^(stop|end|quit|bye|থামো|বিদায়|শেষ)(?:\b|\s|।|$)|end (?:the |this )?(?:game|activity)|খেলা (?:শেষ|বন্ধ)/iu.test(
      t,
    )
  )
    return [{ type: "end" }];
  if (
    /undo|go back|আগেরটা|ফিরিয়ে|ভুল হয়েছে|no[, ]+i meant|না[, ]+আমি.*বলতে/iu.test(
      t,
    ) &&
    !scenePatterns.some(([, p]) => p.test(t)) &&
    !objectPatterns.some(([, p]) => p.test(t))
  )
    return [{ type: "undo" }];
  const actions: ActionType[] = [];
  const scenes = scenePatterns.filter(([, p]) => p.test(t));
  // The final mentioned supported destination wins; role-only shopkeeper does not change the scene.
  if (scenes.length) {
    const selected = scenes
      .sort((a, b) => t.search(a[1]) - t.search(b[1]))
      .at(-1)!;
    actions.push({ type: "scene", value: selected[0] });
  }
  const colorPairs = [
    ["purple", /purple|বেগুনি/iu],
    ["pink", /pink|গোলাপি/iu],
    ["blue", /blue|নীল/iu],
    ["green", /green|সবুজ/iu],
    ["orange", /orange|কমলা/iu],
  ] as const;
  for (const [value, p] of colorPairs)
    if (p.test(t)) actions.push({ type: "color", value });
  for (const [value, p] of [
    ["dragon", /dragon|ড্রাগন/iu],
    ["rabbit", /rabbit|bunny|খরগোশ/iu],
    ["bird", /bird|পাখি/iu],
  ] as const)
    if (p.test(t)) actions.push({ type: "character", value });
  for (const [value, p] of rolePatterns)
    if (p.test(t) && !/\bpet (?:is|becomes)|মিঠু হবে/iu.test(t))
      actions.push({ type: "role", value });
  for (const [value, p] of objectPatterns)
    if (p.test(t)) actions.push({ type: "object", value });
  if (/(?:move|go|walk).*left|বামে/iu.test(t))
    actions.push({ type: "move", value: "left" });
  else if (/(?:move|go|walk).*right|ডানে/iu.test(t))
    actions.push({ type: "move", value: "right" });
  if (
    /change (?:the )?story|গল্প বদল/iu.test(t) &&
    !actions.some((a) => a.type === "scene")
  )
    actions.push({
      type: "scene",
      value: world.scene === "castle" ? "restaurant" : "castle",
    });
  if (/story|গল্প/iu.test(t))
    actions.push({ type: "activity", value: "story" });
  if (/party|celebrat|উৎসব|পার্টি/iu.test(t))
    actions.push({ type: "event", value: "party" });
  if (/safe path|walk around|অন্য পথ|নিরাপদ পথ/iu.test(t))
    actions.push({ type: "event", value: "safe_path" });
  if (
    (world.characters.includes("dragon") || /dragon|ড্রাগন/iu.test(t)) &&
    /hungry|wants|eat|খেতে|ক্ষুধা|চায়/iu.test(t)
  )
    actions.push({ type: "event", value: "dragon_hungry" });
  if (
    world.scene === "help" &&
    (actions.some(
      (a) => a.type === "object" && ["bridge", "boat"].includes(a.value),
    ) ||
      /ask.*help|সাহায্য চাই|safe path|নিরাপদ পথ/iu.test(t))
  )
    actions.push({ type: "event", value: "pet_helped" });
  if (
    ["restaurant", "shop"].includes(world.scene) &&
    actions.some(
      (a) =>
        a.type === "object" &&
        ["rice", "fish", "mango", "cake", "water"].includes(a.value),
    )
  )
    actions.push({ type: "event", value: "order_ready" });
  if (
    !actions.length &&
    /another game|different game|change (?:the )?story|অন্য খেলা|গল্প বদল|খেলা বদল/iu.test(
      t,
    )
  )
    actions.push({
      type: "scene",
      value: world.scene === "restaurant" ? "castle" : "restaurant",
    });
  return actions.slice(0, 10);
}
export function applyActions(
  current: World,
  raw: unknown,
  previous?: World,
): World {
  const { actions } = Proposal.parse({ actions: raw });
  let w = structuredClone(current);
  for (const a of actions) {
    switch (a.type) {
      case "imagine":
        w.imaginations = [
          ...(w.imaginations || []).filter((i) => i.name !== a.value.name),
          a.value,
        ].slice(-6);
        break;
      case "scene":
        w.scene = a.value;
        w.activity = ["restaurant", "shop"].includes(a.value)
          ? "serve"
          : a.value === "help"
            ? "help"
            : "story";
        break;
      case "object":
        if (!w.objects.includes(a.value)) w.objects.push(a.value);
        break;
      case "character":
        if (!w.characters.includes(a.value)) w.characters.push(a.value);
        break;
      case "role":
        w.role = a.value;
        w.petRole = ["shopkeeper", "chef"].includes(a.value)
          ? "customer"
          : a.value === "customer"
            ? "shopkeeper"
            : "friend";
        break;
      case "color":
        w.color = a.value;
        w.colored = true;
        break;
      case "move":
        w.position = a.value;
        w.coordinates = [
          a.value === "left" ? -3 : a.value === "right" ? 3 : 0,
          1.8,
        ];
        break;
      case "activity":
        w.activity = a.value;
        break;
      case "event":
        w.events = [...w.events, a.value].slice(-16);
        break;
      case "end":
        w.activity = "rest";
        break;
      case "undo":
        if (previous) w = structuredClone(previous);
        break;
    }
  }
  w.turn = current.turn + 1;
  return w;
}
export function recommendation(profile: Profile): {
  scene: Scene;
  reason: string;
  prompt: string;
  kind: string;
} {
  const recent = profile.history.slice(-5);
  const short = recent.filter(
    (t) => t.child.trim().split(/\s+/u).length <= 2,
  ).length;
  if (short >= 2)
    return {
      scene: "restaurant",
      reason: "সাম্প্রতিক ছোট উত্তরের পর একটু বড় বাক্যের মডেল।",
      prompt: "“আমি ভাত চাই”—এভাবেও বলতে পারো। তুমি কী চাইবে?",
      kind: "sentence-support",
    };
  if (
    recent.filter((t) => ["castle", "moon", "stage"].includes(t.scene))
      .length >= 2
  )
    return {
      scene: "stage",
      reason: "কল্পনার খেলায় আগ্রহ দেখা গেছে। এবার গল্প বলার পালা।",
      prompt: "তোমার গল্পে এরপর কী হবে? চাইলে একটু বলো।",
      kind: "story-interest",
    };
  const word = Object.entries(profile.words).find(([, count]) => count === 1);
  if (word)
    return {
      scene: "help",
      reason: `“${labels[word[0]] || word[0]}” শব্দটি নতুন জায়গায় ব্যবহার করি।`,
      prompt: `আমাদের অভিযানে ${labels[word[0]] || word[0]} কীভাবে কাজে লাগবে?`,
      kind: "word-revisit",
    };
  return {
    scene: "help",
    reason: "খেলতে খেলতে নিজের ভাবনা বোঝানোর সুযোগ।",
    prompt: "মিঠু নদীর ওপারে ফুল দেখতে চায়। আমরা কী করতে পারি?",
    kind: "exploration",
  };
}
export function makeResponse(
  text: string,
  world: World,
  actions: ActionType[],
  profile: Profile,
): string {
  if (!text.trim()) return "আমি এখানেই আছি। তোমার যখন ইচ্ছে, তখন বলো।";
  if (unsafe(text))
    return "আমরা নিরাপদ, মজার একটা গল্প খেলি। কোনো চিন্তা হলে বিশ্বাসের বড় কাউকে বলো।";
  if (actions.some((a) => a.type === "end"))
    return "ঠিক আছে, একটু বিশ্রাম নিই। তুমি চাইলে আবার খেলব!";
  if (actions.some((a) => a.type === "undo"))
    return "আগের ভাবনায় ফিরে এলাম। তুমি কী বদলাতে চেয়েছিলে?";
  const parts: string[] = [];
  const scene = actions.find((a) => a.type === "scene");
  if (scene?.type === "scene") parts.push(`${labels[scene.value]} তৈরি!`);
  const role = actions.find((a) => a.type === "role");
  if (role?.type === "role")
    parts.push(
      `তুমি এখন ${labels[role.value]}, আমি ${labels[world.petRole] || "তোমার বন্ধু"}।`,
    );
  const character = actions.find((a) => a.type === "character");
  if (character?.type === "character")
    parts.push(`${labels[character.value]} বন্ধু আমাদের সাথে এসেছে!`);
  const objects = actions.filter(
    (a): a is Extract<ActionType, { type: "object" }> => a.type === "object",
  );
  if (objects.length)
    parts.push(
      `${objects.map((a) => labels[a.value]).join(" আর ")} যোগ করলাম।`,
    );
  if (actions.some((a) => a.type === "event" && a.value === "pet_helped"))
    parts.push("তোমার ভাবনায় পার হওয়ার উপায় পেলাম!");
  if (actions.some((a) => a.type === "event" && a.value === "dragon_hungry"))
    parts.push("ড্রাগনের খিদে পেয়েছে। ওকে কী দেব?");
  if (actions.some((a) => a.type === "color"))
    parts.push("তোমার পছন্দের রং দিলাম।");
  if (actions.some((a) => a.type === "move"))
    parts.push("এই তো, আমি সরে এলাম!");
  if (!parts.length && actions.some((a) => a.type === "activity"))
    parts.push("আমাদের গল্প চলছে, তোমার ভাবনাটা বলো।");
  if (!parts.length && /sad|scared|upset|দুঃখ|মন.{0,12}খারাপ|খারাপ লাগ|কষ্ট|কাঁদ|ভয়/iu.test(text))
    return "তোমার মনটা ভালো নেই? আমি শুনছি। চাইলে কাছের বড় কাউকে বলতে পারো, আমরা একটু বিশ্রাম নিতেও পারি।";
  const invented = actions.find((a) => a.type === "imagine");
  if (invented?.type === "imagine")
    return `ওহো, দারুণ ভাবনা! এটাকে আমরা কল্পনার জিনিস বানালাম। এটা কী করতে পারে, বলো তো?`;
  if (!parts.length)
    return `দারুণ! তোমার কথাটা আমাদের গল্পে রাখলাম। এরপর কী হবে, তুমি বলো; আমি তোমার বন্ধু হয়ে সাথে আছি।`;
  const next = recommendation(profile);
  if (next.kind === "sentence-support") parts.push(next.prompt);
  else if (objects.length && world.scene === "restaurant")
    parts.push("আর কী চাইবে?");
  else if (world.scene === "help" && !world.events.includes("pet_helped"))
    parts.push("নদীর ওপারে যেতে তোমার কী বুদ্ধি?");
  else if (next.kind === "word-revisit" && world.turn % 3 === 0)
    parts.push(next.prompt);
  else if (!parts.at(-1)?.endsWith("?"))
    parts.push(
      world.role === "shopkeeper"
        ? "তোমার দোকানে কী পাওয়া যায়?"
        : "এবার কী হবে, বলো তো?",
    );
  return parts.join(" ");
}
export function recordTurn(
  profile: Profile,
  turn: Turn,
  world: World,
): Profile {
  const p = structuredClone(profile);
  p.previous = structuredClone(p.world);
  p.world = world;
  const completes = turn.actions.some(
    (a) =>
      a.type === "end" ||
      (a.type === "event" &&
        ["pet_helped", "order_ready", "party"].includes(a.value)) ||
      (a.type === "scene" && a.value !== profile.world.scene),
  );
  if (completes && profile.history.length && profile.world.activity !== "rest")
    p.completed.push({ scene: profile.world.scene, time: turn.time });
  p.history = [...p.history, turn].slice(-200);
  p.completed = p.completed.slice(-100);
  for (const [word, pattern] of objectPatterns)
    if (pattern.test(turn.child)) p.words[word] = (p.words[word] || 0) + 1;
  const add = (skill: string) => {
    p.skills[skill] = (p.skills[skill] || 0) + 1;
  };
  add("conversation");
  if (turn.child.trim().split(/\s+/u).length >= 3) add("sentences");
  if (/[?？]|কেন|কী|কিভাবে|কীভাবে|\b(what|why|how|where)\b/iu.test(turn.child))
    add("questions");
  if (/চাই|চায়|খিদে|ইচ্ছে|\b(want|need|hungry)\b/iu.test(turn.child))
    add("needs");
  if (/কারণ|তাই|যাতে|because|so that/iu.test(turn.child)) add("explaining");
  if (
    turn.actions.some((a) => a.type === "character" || a.type === "event") ||
    /গল্প|story/iu.test(turn.child)
  )
    add("storytelling");
  if (objectPatterns.some(([, p]) => p.test(turn.child))) add("vocabulary");
  return p;
}
