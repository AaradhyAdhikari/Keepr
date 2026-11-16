import { describe, it, expect, vi } from "vitest";
import { ingestReel, type Store } from "./ingest";
import type { ClassifyResult } from "./classify";

function memoryStore(): Store & { reels: any[]; cats: string[] } {
  const cats: string[] = [];
  const reels: any[] = [];
  return {
    cats,
    reels,
    async findReelByUrl(url) {
      const r = reels.find((x) => x.url === url);
      return r ? { id: r.id, status: r.status } : null;
    },
    async listCategoryNames() {
      return [...cats];
    },
    async upsertCategory(name) {
      let i = cats.findIndex((c) => c.toLowerCase() === name.toLowerCase());
      if (i === -1) i = cats.push(name) - 1;
      return i + 1;
    },
    async insertReel(row) {
      const id = reels.length + 1;
      reels.push({ id, ...row });
      return id;
    },
  };
}

const sorted = (category: string, isNew = true): ClassifyResult => ({
  category,
  isNew,
  confidence: 0.9,
  summary: "s",
  tags: ["t"],
  kind: "other",
  title: null,
  subtitle: null,
  status: "sorted",
});

describe("ingestReel", () => {
  it("rejects non-instagram urls", async () => {
    await expect(ingestReel({ url: "https://example.com/x" }, { store: memoryStore() })).rejects.toThrow(/invalid/i);
  });

  it("stores a reel once; a duplicate share does not call the classifier again", async () => {
    const store = memoryStore();
    const classify = vi.fn(async () => sorted("Food"));
    const a = await ingestReel(
      { url: "https://www.instagram.com/reel/ABC123/?igsh=1", caption: "pancakes" },
      { store, classify },
    );
    const b = await ingestReel(
      { url: "https://www.instagram.com/p/ABC123/", caption: "pancakes" },
      { store, classify },
    );
    expect(a.duplicate).toBe(false);
    expect(b.duplicate).toBe(true);
    expect(b.id).toBe(a.id);
    expect(classify).toHaveBeenCalledTimes(1);
    expect(store.reels).toHaveLength(1);
  });

  it("creates the new category the classifier proposes and extracts links", async () => {
    const store = memoryStore();
    const classify = vi.fn(async () => sorted("Tech"));
    await ingestReel(
      { url: "https://www.instagram.com/reel/XYZ/", caption: "great repo https://github.com/vercel/next.js" },
      { store, classify },
    );
    expect(store.cats).toContain("Tech");
    expect(store.reels[0].github_links).toEqual(["https://github.com/vercel/next.js"]);
  });

  it("with no caption and failed metadata fetch, saves as pending in Review without classifying", async () => {
    const store = memoryStore();
    const classify = vi.fn(async () => sorted("Food"));
    const r = await ingestReel(
      { url: "https://www.instagram.com/reel/NOCAP/" },
      { store, classify, fetchMetadata: async () => null },
    );
    expect(r.status).toBe("pending");
    expect(classify).not.toHaveBeenCalled();
    expect(store.cats).toContain("Review");
    expect(store.reels[0].status).toBe("pending");
  });

  it("uses fetched metadata caption when none is supplied", async () => {
    const store = memoryStore();
    const classify = vi.fn(async () => sorted("Music"));
    const r = await ingestReel(
      { url: "https://www.instagram.com/reel/META/" },
      { store, classify, fetchMetadata: async () => ({ caption: "r&b mix", thumbnail: "http://img/1.jpg" }) },
    );
    expect(r.status).toBe("sorted");
    expect(store.reels[0].thumbnail_url).toBe("http://img/1.jpg");
    expect(store.reels[0].caption).toBe("r&b mix");
  });

  it("keeps the reel as pending/Review when classification fails", async () => {
    const store = memoryStore();
    const classify = vi.fn(async (): Promise<ClassifyResult> => ({
      category: "Review",
      isNew: false,
      confidence: 0,
      summary: "",
      tags: [],
      kind: "other",
      title: null,
      subtitle: null,
      status: "pending",
    }));
    const r = await ingestReel({ url: "https://www.instagram.com/reel/F1/", caption: "hello there" }, { store, classify });
    expect(r.status).toBe("pending");
    expect(store.reels).toHaveLength(1);
  });

  it("stores what the reel is about so the app can offer Spotify/Netflix/Maps buttons", async () => {
    const store = memoryStore();
    const classify = vi.fn(async (): Promise<ClassifyResult> => ({
      ...sorted("Music"),
      kind: "music",
      title: "Blinding Lights",
      subtitle: "The Weeknd",
    }));
    await ingestReel({ url: "https://www.instagram.com/reel/SONG1/", caption: "this song" }, { store, classify });
    expect(store.reels[0].kind).toBe("music");
    expect(store.reels[0].entity_title).toBe("Blinding Lights");
    expect(store.reels[0].entity_sub).toBe("The Weeknd");
  });
});
