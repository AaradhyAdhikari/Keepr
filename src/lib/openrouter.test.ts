import { describe, it, expect, vi } from "vitest";
import { openRouterClient } from "./openrouter";

const reply = (text: string) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }] }) });
const fail = (status: number) => ({ ok: false, status, json: async () => ({}) });

describe("openRouterClient", () => {
  it("sends the prompt to OpenRouter with the key and returns the text", async () => {
    const f = vi.fn(async () => reply("hello")) as unknown as typeof fetch;
    const c = openRouterClient({ apiKey: "sk-or-x", models: ["openrouter/free"], fetchFn: f });
    expect(await c.complete("sort this")).toBe("hello");
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-or-x");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("openrouter/free");
    expect(body.messages).toEqual([{ role: "user", content: "sort this" }]);
  });

  it("tries the next free model when one is rate limited or down", async () => {
    const f = vi.fn().mockResolvedValueOnce(fail(429)).mockResolvedValueOnce(reply("ok")) as unknown as typeof fetch;
    const c = openRouterClient({ apiKey: "k", models: ["a:free", "b:free"], fetchFn: f });
    expect(await c.complete("x")).toBe("ok");
    expect(JSON.parse((f as unknown as ReturnType<typeof vi.fn>).mock.calls[1][1].body).model).toBe("b:free");
  });

  it("throws when every model fails or the key is missing", async () => {
    const f = vi.fn(async () => fail(429)) as unknown as typeof fetch;
    await expect(openRouterClient({ apiKey: "k", models: ["a", "b"], fetchFn: f }).complete("x")).rejects.toThrow();
    await expect(openRouterClient({ apiKey: undefined, models: ["a"] }).complete("x")).rejects.toThrow(/OPENROUTER_API_KEY/);
  });

  it("treats an empty reply as a failure and moves on", async () => {
    const f = vi.fn().mockResolvedValueOnce(reply("")).mockResolvedValueOnce(reply("fine")) as unknown as typeof fetch;
    expect(await openRouterClient({ apiKey: "k", models: ["a", "b"], fetchFn: f }).complete("x")).toBe("fine");
  });
});
