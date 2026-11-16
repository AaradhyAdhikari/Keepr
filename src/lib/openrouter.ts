import type { ClassifierClient } from "./classify";

type Opts = { apiKey?: string; models?: string[]; fetchFn?: typeof fetch };

/** Free default: OpenRouter's own free-model router, so we never hard-code model names that go stale. */
export function modelsFromEnv(): string[] {
  const raw = process.env.OPENROUTER_MODELS?.trim();
  return raw ? raw.split(",").map((m) => m.trim()).filter(Boolean) : ["openrouter/free"];
}

export function openRouterClient(opts: Opts = {}): ClassifierClient {
  return {
    async complete(prompt: string) {
      const key = opts.apiKey ?? process.env.OPENROUTER_API_KEY;
      if (!key) throw new Error("OPENROUTER_API_KEY is not set");
      const f = opts.fetchFn ?? fetch;
      let last = "no models";
      for (const model of opts.models ?? modelsFromEnv()) {
        try {
          const r = await f("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
          });
          if (!r.ok) { last = `${model}: HTTP ${r.status}`; continue; }
          const text = ((await r.json()).choices?.[0]?.message?.content ?? "").trim();
          if (text) return text;
          last = `${model}: empty reply`;
        } catch (e) {
          last = `${model}: ${(e as Error).message}`;
        }
      }
      throw new Error(`OpenRouter failed (${last})`);
    },
  };
}
