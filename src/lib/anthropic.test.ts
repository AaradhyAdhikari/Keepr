import { describe, it, expect, vi } from "vitest";
import { claudeClient } from "./anthropic";
import { defaultClient } from "./classify";

describe("claudeClient", () => {
  it("calls the Anthropic messages API and returns the text", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "hi" }] }) })) as unknown as typeof fetch;
    const c = claudeClient({ apiKey: "sk-ant-x", fetchFn: f });
    expect(await c.complete("sort this")).toBe("hi");
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("sk-ant-x");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.messages).toEqual([{ role: "user", content: "sort this" }]);
  });

  it("throws on HTTP errors or a missing key", async () => {
    const f = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(claudeClient({ apiKey: "k", fetchFn: f }).complete("x")).rejects.toThrow(/401/);
    await expect(claudeClient({ apiKey: undefined }).complete("x")).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe("defaultClient provider switch", () => {
  it("uses Claude unless AI_PROVIDER=openrouter", async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "c" }], choices: [{ message: { content: "o" } }] }) }));
    vi.stubGlobal("fetch", f);
    vi.stubEnv("ANTHROPIC_API_KEY", "a"); vi.stubEnv("OPENROUTER_API_KEY", "b");
    vi.stubEnv("AI_PROVIDER", "");
    expect(await defaultClient().complete("x")).toBe("c");
    vi.stubEnv("AI_PROVIDER", "openrouter");
    expect(await defaultClient().complete("x")).toBe("o");
    vi.unstubAllGlobals(); vi.unstubAllEnvs();
  });
});
