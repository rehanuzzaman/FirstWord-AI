import { afterEach, describe, it, expect, vi } from "vitest";
import { infer, transcribe } from "../server/providers";
import { newProfile } from "../shared/engine";
afterEach(() => vi.unstubAllGlobals());
describe("local provider adapter contracts (mocked inference, not proof of a live model)", () => {
  it("passes state to local Ollama and accepts only validated actions", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {
            content: JSON.stringify({
              actions: [{ type: "scene", value: "castle" }],
            }),
          },
        }),
      });
    vi.stubGlobal("fetch", fetch);
    const p = newProfile();
    p.world.characters = ["dragon"];
    const actions = await infer("Make a palace", p);
    expect(actions).toEqual([{ type: "scene", value: "castle" }]);
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:11434/api/chat");
    expect(
      JSON.parse(fetch.mock.calls[0][1].body).messages[0].content,
    ).toContain("dragon");
  });
  it.each([
    "not JSON",
    '{"actions":[{"type":"execute","value":"bad"}]}',
    '{"actions":[{"type":"scene","value":"castle","script":"bad"}]}',
  ])("rejects invalid provider output %s", async (content) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ message: { content } }),
        }),
    );
    await expect(infer("hello", newProfile())).rejects.toThrow();
  });
  it("propagates provider outage for caller fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));
    await expect(infer("hello", newProfile())).rejects.toThrow("unreachable");
  });
  it("speech service failure is not turned into a fake transcript", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(
      transcribe(Buffer.from("test"), "audio/wav", "bn"),
    ).rejects.toThrow("Local transcription failed");
  });
});
