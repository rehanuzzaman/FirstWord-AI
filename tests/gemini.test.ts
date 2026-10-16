import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocked Gemini responses: the real key is not needed for these guardrail tests.
process.env.GEMINI_API_KEY = "test-key-not-real";
const { converse } = await import("../server/gemini.js");

function mockGemini(text: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    })),
  );
}
const base = {
  childText: "একটা উড়ন্ত আইসক্রিমের বাস",
  world: {},
  recent: [],
  language: "bn" as const,
};

describe("optional Gemini conversation guardrails", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("accepts a Bangla reply with schema-valid actions", async () => {
    mockGemini(
      JSON.stringify({
        reply: "ওহো, উড়ন্ত আইসক্রিমের বাস! চলো ওটাকে আকাশে ওড়াই।",
        actions: [
          { type: "imagine", value: { name: "আইসক্রিম বাস", shape: "vehicle", color: "pink" } },
        ],
      }),
    );
    const r = await converse(base);
    expect(r?.reply).toContain("আইসক্রিম");
    expect(r?.actions[0].type).toBe("imagine");
  });

  it("rejects a Bangla request answered in English", async () => {
    mockGemini(JSON.stringify({ reply: "Wow, let us fly it!", actions: [] }));
    await expect(converse(base)).rejects.toThrow("not Bangla");
  });

  it("drops actions outside the game schema but keeps the reply", async () => {
    mockGemini(
      JSON.stringify({ reply: "চলো!", actions: [{ type: "execute", value: "rm -rf /" }] }),
    );
    const r = await converse(base);
    expect(r?.reply).toBe("চলো!");
    expect(r?.actions).toEqual([]);
  });

  it("rejects replies that include links or contact details", async () => {
    mockGemini(JSON.stringify({ reply: "চলো https://example.com দেখি", actions: [] }));
    await expect(converse(base)).rejects.toThrow("Unsafe reply");
  });
});
