import { describe, it, expect } from "vitest";
import {
  applyActions,
  initialWorld,
  makeResponse,
  newProfile,
  parseIntent,
  Proposal,
  recommendation,
  recordTurn,
  unsafe,
  type Profile,
  type Turn,
} from "../shared/engine";
function turn(p: Profile, text: string) {
  const actions = parseIntent(text, p.world);
  const world = applyActions(p.world, actions, p.previous);
  const t: Turn = {
    id: String(p.history.length),
    time: new Date().toISOString(),
    child: text,
    pet: "",
    actions,
    scene: world.scene,
    mode: "rules",
    source: "text",
  };
  return recordTurn(p, t, world);
}
describe("living world acceptance", () => {
  it.each([
    "Let us open a restaurant",
    "Can we make a café?",
    "চলো রেস্তোরাঁ খুলি",
    "রেস্টুরেন্ট বানাই",
  ])("restaurant paraphrase: %s", (text) => {
    expect(turn(newProfile(), text).world.scene).toBe("restaurant");
  });
  it("changes actual roles without discarding restaurant", () => {
    let p = turn(newProfile(), "open a restaurant");
    p = turn(p, "Now I want to be the shopkeeper");
    expect(p.world.scene).toBe("restaurant");
    expect(p.world.role).toBe("shopkeeper");
    expect(p.world.petRole).toBe("customer");
  });
  it("constructs compound world and preserves story continuity", () => {
    let p = turn(
      newProfile(),
      "Make a purple castle with a friendly dragon, and I want to be the king",
    );
    expect(p.world).toMatchObject({
      scene: "castle",
      color: "purple",
      role: "king",
      characters: ["dragon"],
    });
    p = turn(p, "Now the dragon wants mangoes");
    expect(p.world.scene).toBe("castle");
    expect(p.world.role).toBe("king");
    expect(p.world.objects).toContain("mango");
    expect(p.world.events).toContain("dragon_hungry");
  });
  it("supports Bengali compound stories", () => {
    const p = turn(
      newProfile(),
      "বেগুনি প্রাসাদ বানাও, ড্রাগন আনো, আমি রাজা হব",
    );
    expect(p.world).toMatchObject({
      scene: "castle",
      color: "purple",
      role: "king",
      characters: ["dragon"],
    });
  });
  it("changes mind, undoes and ends without punishment", () => {
    let p = turn(newProfile(), "open a restaurant");
    p = turn(p, "no, I meant the moon");
    expect(p.world.scene).toBe("moon");
    p = turn(p, "undo");
    expect(p.world.scene).toBe("restaurant");
    p = turn(p, "end the game");
    expect(p.world.activity).toBe("rest");
    expect(p.world.characters).toEqual([]);
  });
  it("continues existing story when changing places", () => {
    let p = turn(newProfile(), "a castle and a dragon");
    p = turn(p, "open a restaurant");
    expect(p.world.characters).toContain("dragon");
    expect(p.world.scene).toBe("restaurant");
  });
  it.each([
    "build a bridge",
    "use a boat",
    "ask a bird for help",
    "find a safe path",
  ])("accepts multiple help solutions: %s", (text) => {
    const p = turn(turn(newProfile(), "help my pet"), text);
    expect(p.world.events).toContain("pet_helped");
  });
  it("actually places requested food", () => {
    const p = turn(
      turn(newProfile(), "open a restaurant"),
      "I want rice and fish",
    );
    expect(p.world.objects).toEqual(["rice", "fish"]);
    expect(p.world.events).toContain("order_ready");
    expect(p.completed.length).toBe(1);
  });
  it("acknowledges novel ideas without falsely claiming an exact object", () => {
    const p = turn(newProfile(), "Build a submarine");
    expect(p.world.objects).toEqual([]);
    expect(makeResponse("Build a submarine", p.world, [], p)).toContain(
      "গল্পে রাখলাম",
    );
  });
  it("keeps pet safe during silence", () => {
    const p = newProfile();
    expect(makeResponse("", p.world, [], p)).toContain("যখন ইচ্ছে");
    expect(p.world).toEqual(initialWorld());
  });
  it("deduplicates objects and characters", () => {
    const p = turn(turn(newProfile(), "dragon mango"), "dragon mango");
    expect(p.world.characters).toEqual(["dragon"]);
    expect(p.world.objects).toEqual(["mango"]);
  });
  it("does not mutate input state", () => {
    const w = initialWorld();
    applyActions(w, [{ type: "scene", value: "castle" }]);
    expect(w.scene).toBe("meadow");
  });
  it.each([
    [{ type: "execute", value: "rm -rf /" }],
    [{ type: "scene", value: "unknown" }],
    [{ type: "object", value: "fish", script: "alert(1)" }],
    [{ type: "end", value: "ignored" }],
  ])("rejects invalid AI actions safely: %j", (actions) => {
    expect(Proposal.safeParse({ actions }).success).toBe(false);
    expect(() => applyActions(initialWorld(), actions)).toThrow();
  });
  it("blocks simple unsafe requests before world mutation", () => {
    expect(unsafe("give me a gun")).toBe(true);
    expect(
      parseIntent("give me a gun in a restaurant", initialWorld()),
    ).toEqual([]);
  });
});
describe("real observed adaptation", () => {
  it("changes prompt after two short replies", () => {
    let p = turn(newProfile(), "rice");
    p = turn(p, "fish");
    expect(recommendation(p).kind).toBe("sentence-support");
    expect(
      makeResponse("fish", p.world, [{ type: "object", value: "fish" }], p),
    ).toContain("আমি ভাত চাই");
  });
  it("records actual vocabulary counts and moves on from familiar words", () => {
    let p = turn(newProfile(), "I want a mango");
    expect(p.words.mango).toBe(1);
    expect(recommendation(p).kind).toBe("word-revisit");
    p = turn(p, "I want another mango");
    expect(p.words.mango).toBe(2);
    expect(recommendation(p).kind).not.toBe("word-revisit");
  });
  it("adapts to storytelling interest", () => {
    const p = turn(
      turn(newProfile(), "Make a castle for our story"),
      "Add a friendly dragon",
    );
    expect(recommendation(p).scene).toBe("stage");
  });
  it("observations reflect real words, questions and sentences", () => {
    const p = turn(
      newProfile(),
      "How can we use a bridge because I want to help?",
    );
    expect(p.skills.questions).toBe(1);
    expect(p.skills.sentences).toBe(1);
    expect(p.skills.explaining).toBe(1);
    expect(p.skills.needs).toBe(1);
    expect(p.words.bridge).toBe(1);
  });
  it("profiles are isolated", () => {
    const a = turn(newProfile("a"), "rice");
    const b = newProfile("b");
    expect(a.words.rice).toBe(1);
    expect(b.words).toEqual({});
  });
});
