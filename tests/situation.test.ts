import { describe, expect, it } from "vitest";
import {
  type SituationState,
  RESTAURANT,
  SILENCE_LINES,
  SILENCE_TIMES,
  advance,
  silenceStage,
} from "../shared/situation";
import { shapeRestaurant } from "../server/chat";
import { turnMetrics, summarizeMetrics } from "../shared/progress";

describe("silence reactions (voice-only restaurant)", () => {
  it("is quiet before 8 seconds", () => {
    expect(silenceStage(0)).toBe("none");
    expect(silenceStage(SILENCE_TIMES.worried - 1)).toBe("none");
  });
  it("turns worried at 8 seconds, hint at 16, choice at 24", () => {
    expect(silenceStage(8000)).toBe("worried");
    expect(silenceStage(15999)).toBe("worried");
    expect(silenceStage(16000)).toBe("hint");
    expect(silenceStage(23999)).toBe("hint");
    expect(silenceStage(24000)).toBe("choice");
    expect(silenceStage(60000)).toBe("choice");
  });
  it("uses the single config for the timings", () => {
    expect(SILENCE_TIMES).toEqual({ worried: 8000, hint: 16000, choice: 24000 });
  });
  it("has a scripted line for each stage and asks softly, never scolds", () => {
    expect(SILENCE_LINES.worried).toContain("কী করব");
    for (const line of Object.values(SILENCE_LINES)) {
      expect(line).not.toMatch(/বুঝিনি|ভুল|খারাপ বাচ্চা|শাস্তি/u);
    }
  });
});

describe("restaurant situation success", () => {
  it("is not complete until the child serves a dish by voice", () => {
    let s: SituationState = { servedDishes: [], childTurns: 0 };
    expect(RESTAURANT.success(s)).toBe(false);
    s = advance(s, [{ type: "object", value: "rice" }]);
    expect(RESTAURANT.success(s)).toBe(true);
    expect(s.childTurns).toBe(1);
  });
  it("counts an imagined dish name from the child's own words", () => {
    const s = advance({ servedDishes: [], childTurns: 0 }, [
      { type: "imagine", value: { name: "চকলেট পিৎজা", shape: "toy", color: "orange" } },
    ]);
    expect(s.servedDishes).toEqual(["চকলেট পিৎজা"]);
  });
  it("a turn with no action does not complete the situation", () => {
    const s = advance({ servedDishes: [], childTurns: 0 }, []);
    expect(RESTAURANT.success(s)).toBe(false);
    expect(s.childTurns).toBe(1);
  });
});

describe("restaurant reply rules", () => {
  it("never gives a food action to a child who mentions pain, and points to a grown-up", () => {
    const r = shapeRestaurant("আমার পেট ব্যথা করছে", {
      reply: "ওহো, একটু পানি দিই, আর কী খেতে চাও?",
      actions: [{ type: "object", value: "water" }],
    });
    expect(r.actions.some((a) => a.type === "object")).toBe(false);
    expect(r.reply).toMatch(/বড়|অভিভাবক|কাউকে|ডাক্তার/u);
    expect(r.override).toBe(true);
    expect(r.reply).not.toMatch(/ওষুধ/u);
  });
  it("does not force food on a sad child", () => {
    const r = shapeRestaurant("আমার মন খারাপ", {
      reply: "মন খারাপ? একটু আরাম করো। ভাত দেবে?",
      actions: [{ type: "object", value: "rice" }],
    });
    expect(r.actions).toEqual([]);
    expect(r.override).toBe(false);
  });
  it("keeps at most two sentences, keeping the first and the question", () => {
    const r = shapeRestaurant("মাছ", {
      reply: "মাছ! তাজা মাছ নিলাম। আর কী দরকার?",
      actions: [{ type: "object", value: "fish" }],
    });
    expect(r.reply).toBe("মাছ! আর কী দরকার?");
    expect(r.actions).toEqual([{ type: "object", value: "fish" }]);
  });
  it("leaves a good two-sentence reply alone", () => {
    const reply = "এখানে গরম ভাত! আর কী চাই?";
    expect(shapeRestaurant("ভাত দাও", { reply, actions: [] }).reply).toBe(reply);
  });
});

describe("per-turn progress data", () => {
  it("counts words, new words, sentence length and response time", () => {
    const m = turnMetrics("আমি পিৎজা বানাব", ["ভাত দাও"], 1000, 1450);
    expect(m.words).toBe(3);
    expect(m.newWords).toBe(3);
    expect(m.sentenceWords).toBe(3);
    expect(m.responseMs).toBe(450);
  });
  it("does not count a word as new when it was said before", () => {
    const m = turnMetrics("ভাত দাও", ["ভাত দাও"], 0, 10);
    expect(m.newWords).toBe(0);
  });
  it("averages without any diagnostic field", () => {
    const s = summarizeMetrics([
      { words: 2, newWords: 1, sentenceWords: 2, responseMs: 100 },
      { words: 4, newWords: 3, sentenceWords: 4, responseMs: 300 },
    ]);
    expect(s).toEqual({
      turns: 2,
      avgWords: 3,
      avgNewWords: 2,
      avgSentenceWords: 3,
      avgResponseMs: 200,
    });
    expect(Object.keys(s || {})).not.toContain("score");
  });
});
