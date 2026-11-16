import { describe, it, expect } from "vitest";
import { lookupProviders } from "./availability";

const fakeFetch = (routes: Record<string, unknown>) =>
  (async (url: string) => {
    const hit = Object.keys(routes).find((k) => url.includes(k));
    if (!hit) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => routes[hit] };
  }) as unknown as typeof fetch;

describe("lookupProviders", () => {
  it("maps TMDB India flatrate providers to our ids", async () => {
    const f = fakeFetch({
      "/search/multi": { results: [{ id: 5, media_type: "movie" }] },
      "/movie/5/watch/providers": {
        results: { IN: { flatrate: [{ provider_name: "Netflix" }, { provider_name: "Amazon Prime Video" }, { provider_name: "Zee5" }] } },
      },
    });
    expect(await lookupProviders("Vivarium", "2019", { apiKey: "k", fetchFn: f })).toEqual(["netflix", "prime", "zee5"]);
  });

  it("uses tv endpoint for shows", async () => {
    const f = fakeFetch({
      "/search/multi": { results: [{ id: 9, media_type: "tv" }] },
      "/tv/9/watch/providers": { results: { IN: { flatrate: [{ provider_name: "Netflix" }] } } },
    });
    expect(await lookupProviders("Beef", null, { apiKey: "k", fetchFn: f })).toEqual(["netflix"]);
  });

  it("returns [] when not streaming in India, null when it cannot find out", async () => {
    const none = fakeFetch({
      "/search/multi": { results: [{ id: 5, media_type: "movie" }] },
      "/movie/5/watch/providers": { results: { US: { flatrate: [{ provider_name: "Netflix" }] } } },
    });
    expect(await lookupProviders("X", null, { apiKey: "k", fetchFn: none })).toEqual([]);
    expect(await lookupProviders("X", null, { apiKey: "k", fetchFn: fakeFetch({}) })).toBeNull();
    expect(await lookupProviders("X", null, { apiKey: undefined })).toBeNull();
  });
});
