import { describe, it, expect, vi } from "vitest";
import { searchReels, type SearchStore, type ReelView } from "./search";
import type { ClassifierClient } from "./classify";

const reel = (id: number, tags: string[], category = "Food"): ReelView => ({
  id,
  url: `https://www.instagram.com/reel/R${id}/`,
  caption: "c",
  thumbnail_url: null,
  category,
  summary: "",
  tags,
  github_links: [],
  youtube_links: [],
  web_links: [],
  status: "sorted",
});

function store(reels: ReelView[]): SearchStore & { search: ReturnType<typeof vi.fn> } {
  return {
    async findCategory(name) {
      const c = [...new Set(reels.map((r) => r.category))].find((x) => x.toLowerCase() === name.toLowerCase());
      return c ? { id: 1, name: c } : null;
    },
    async reelsInCategory(name) {
      return reels.filter((r) => r.category === name);
    },
    search: vi.fn(async (terms: string[]) =>
      reels.filter((r) => terms.some((t) => r.tags.includes(t))),
    ),
  };
}
const client = (reply: string | Error): ClassifierClient & { complete: ReturnType<typeof vi.fn> } => ({
  complete: vi.fn(async () => {
    if (reply instanceof Error) throw reply;
    return reply;
  }),
});

describe("searchReels", () => {
  const reels = [reel(1, ["pancake", "breakfast"]), reel(2, ["rnb", "playlist"], "Music")];

  it("opens a collection when the query is a category name, without calling Claude", async () => {
    const c = client("[]");
    const r = await searchReels("music", { store: store(reels), client: c });
    expect(r.collection).toBe("Music");
    expect(r.reels.map((x) => x.id)).toEqual([2]);
    expect(c.complete).not.toHaveBeenCalled();
  });

  it("expands a query into keywords and finds a reel tagged with a synonym", async () => {
    const c = client('["breakfast","recipe","pancake","omelette"]');
    const s = store(reels);
    const r = await searchReels("breakfast recipes", { store: s, client: c });
    expect(r.collection).toBeNull();
    expect(r.reels.map((x) => x.id)).toEqual([1]);
    expect(s.search.mock.calls[0][0]).toContain("pancake");
  });

  it("falls back to the raw query words when Claude fails", async () => {
    const s = store(reels);
    const r = await searchReels("pancake", { store: s, client: client(new Error("down")) });
    expect(s.search.mock.calls[0][0]).toEqual(["pancake"]);
    expect(r.reels.map((x) => x.id)).toEqual([1]);
  });

  it("returns nothing for an empty query", async () => {
    const r = await searchReels("   ", { store: store(reels), client: client("[]") });
    expect(r).toEqual({ collection: null, reels: [] });
  });

  it("handles messy model output and punctuation-heavy queries", async () => {
    const s = store(reels);
    const r = await searchReels("r&b music!", { store: s, client: client('```json\n["rnb","r&b","playlist"]\n```') });
    expect(s.search.mock.calls[0][0]).toEqual(expect.arrayContaining(["rnb", "playlist"]));
    expect(r.reels.map((x) => x.id)).toEqual([2]);
  });
});
