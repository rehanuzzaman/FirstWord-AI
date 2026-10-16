import { z } from "zod";
import {
  Objects,
  Scenes,
  applyActions,
  unsafe,
  type Profile,
  type ActionType,
} from "./engine";
export const PlayAction = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pet") }).strict(),
  z
    .object({
      kind: z.literal("move"),
      x: z.number().min(-6.5).max(6.5),
      z: z.number().min(-6.5).max(6.5),
    })
    .strict(),
  z.object({ kind: z.literal("item"), item: Objects }).strict(),
  z.object({ kind: z.literal("spawn"), item: Objects }).strict(),
  z.object({ kind: z.literal("travel"), scene: Scenes }).strict(),
]);
export function updateDiscoveries(p: Profile) {
  p.play ??= { pats: 0, interactions: 0, discoveries: [] };
  const found = new Set(p.play.discoveries);
  if (p.play.pats > 0) found.add("friend");
  if (p.history.length > 0) found.add("voice-story");
  if (p.world.characters.includes("dragon")) found.add("dragon");
  if (p.world.events.includes("pet_helped")) found.add("bridge");
  if (p.world.events.includes("dragon_fed")) found.add("kindness");
  if (p.world.events.includes("order_ready")) found.add("chef");
  if (p.world.imaginations?.length) found.add("inventor");
  if (p.world.scene === "moon") found.add("moon");
  p.play.discoveries = [...found];
  return p;
}
export function applyPlay(
  profile: Profile,
  raw: unknown,
): { profile: Profile; reply: string } {
  const action = PlayAction.parse(raw);
  const p = structuredClone(profile);
  p.play ??= { pats: 0, interactions: 0, discoveries: [] };
  p.play.interactions++;
  let reply = "";
  if (action.kind === "pet") {
    p.play.pats++;
    reply = [
      "হিহি! গা সুড়সুড় করছে! আবার আদর করবে?",
      "মিউ! তোমার সঙ্গে খেলতে আমার ভালো লাগে।",
      "আমি তোমার বন্ধু! এবার কোথায় যাব বলো তো?",
    ][(p.play.pats - 1) % 3];
  }
  if (action.kind === "move") {
    if (action.x ** 2 + action.z ** 2 > 43)
      throw new Error("Stay on the island");
    p.world.coordinates = [action.x, action.z];
  }
  if (action.kind === "travel") {
    p.previous = structuredClone(p.world);
    p.world = applyActions(p.world, [{ type: "scene", value: action.scene }]);
    reply =
      action.scene === "help"
        ? "ওপারে ফুলবাগান! নদী পার হওয়ার একটা উপায় ভাবি।"
        : action.scene === "restaurant"
          ? "দোকান খুলে গেছে! তুমি দোকানদার হবে, নাকি ক্রেতা?"
          : action.scene === "castle"
            ? "তোমার রাজ্যে স্বাগতম! এখানে কাকে আনব?"
            : "চলো! এখানে আমরা কী খেলব?";
  }
  if (action.kind === "spawn") {
    p.world = applyActions(p.world, [{ type: "object", value: action.item }]);
    reply = "খেলনাটা এসে গেছে! ছুঁয়ে দেখো, বা আমাকে বলো এটা দিয়ে কী করবে।";
  }
  if (action.kind === "item") {
    if (!p.world.objects.includes(action.item))
      throw new Error("This object is not in the world");
    const i = p.world.objects.indexOf(action.item);
    p.world.coordinates = [-2.8 + (i % 5) * 1.3, 2.5 + Math.floor(i / 5) * 1.1];
    if (action.item === "mango" && p.world.characters.includes("dragon")) {
      p.world.events = [...p.world.events, "dragon_fed"].slice(-16);
      p.world.objects = p.world.objects.filter((o) => o !== "mango");
      reply = "টুনটুন ড্রাগন আম খেয়ে খুশি! তুমি ওকে কী বলবে?";
    } else if (action.item === "ball") {
      p.world.events = [...p.world.events, "ball_play"].slice(-16);
      reply = "বলটা আমার কাছে এসেছে! এবার বলো, কোথায় ছুড়ব—বামে না ডানে?";
    } else if (
      ["rice", "fish", "cake"].includes(action.item) &&
      ["restaurant", "shop"].includes(p.world.scene)
    ) {
      p.world.events = [...p.world.events, "order_ready"].slice(-16);
      reply = "অর্ডার তৈরি! আমি ক্রেতা। খাবারটা আমাকে কী বলে দেবে?";
    } else if (
      ["bridge", "boat"].includes(action.item) &&
      p.world.scene === "help"
    ) {
      p.world.events = [...p.world.events, "pet_helped"].slice(-16);
      p.world.coordinates = [4, 1.5];
      reply = "সেতু দিয়ে পার হলাম! তোমার বুদ্ধিতে কত ফুল দেখতে পেলাম!";
    } else
      reply = "এই তো! জিনিসটা দেখতে কেমন? তুমি চাইলে নিজের মতো বর্ণনা করো।";
  }
  if (
    ["pet_helped", "order_ready"].some(
      (e) => p.world.events.includes(e) && !profile.world.events.includes(e),
    )
  )
    p.completed = [
      ...p.completed,
      { scene: p.world.scene, time: new Date().toISOString() },
    ].slice(-100);
  // Touch play deliberately never increments spoken-turn or language-skill counters.
  return { profile: updateDiscoveries(p), reply };
}
export function imagineFallback(text: string): ActionType[] {
  if (
    unsafe(text) ||
    text.trim().length < 4 ||
    /^(hi|hello|হাই|হ্যালো|হ্যাঁ|না|ok|thanks|thank you)$/iu.test(
      text.trim(),
    ) ||
    /মন.{0,12}খারাপ|খারাপ লাগ|দুঃখ|কষ্ট|কাঁদ|ভয়|sad|scared|upset|hurt/iu.test(text)
  )
    return [];
  const shape = /house|city|building|town|ঘর|বাড়ি|শহর/iu.test(text)
    ? "house"
    : /car|ship|rocket|plane|গাড়ি|জাহাজ|রকেট|বিমান/iu.test(text)
      ? "vehicle"
      : /monster|unicorn|animal|দানব|প্রাণী|ইউনিকর্ন/iu.test(text)
        ? "creature"
        : /plant|garden|বাগান|লতা/iu.test(text)
          ? "plant"
          : "toy";
  return [
    {
      type: "imagine",
      value: { name: text.trim().slice(0, 60), shape, color: "purple" },
    },
  ];
}
