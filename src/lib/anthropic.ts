import type { ClassifierClient } from "./classify";

export const MODEL = "claude-haiku-5-5";
type Opts = { apiKey?: string; fetchFn?: typeof fetch; model?: string };

export function claudeClient(opts: Opts = {}): ClassifierClient {
  return {
    async complete(prompt: string) {
      const key = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
      const r = await (opts.fetchFn ?? fetch)("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: opts.model ?? MODEL, max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) throw new Error(`Claude API failed (HTTP ${r.status})`);
      const j = await r.json();
      return (j.content ?? []).map((b: { type: string; text?: string }) => (b.type === "text" ? b.text ?? "" : "")).join("");
    },
  };
}
