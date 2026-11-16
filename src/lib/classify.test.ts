import { describe, it, expect, vi } from "vitest";
import { classifyReel, type ClassifierClient } from "./classify";

const noLinks = { github: [], youtube: [] };
const fake = (reply: string | Error): ClassifierClient & { complete: ReturnType<typeof vi.fn> } => ({
  complete: vi.fn(async () => {
    if (reply instanceof Error) throw reply;
    return reply;
  }),
});
const json = (o: object) => JSON.stringify(o);

describe("classifyReel", () => {
  it("reuses an existing category", async () => {
    const c = fake(json({ category: "Food", confidence: 0.9, summary: "pancakes", tags: ["pancake", "breakfast"] }));
    const r = await classifyReel({ caption: "easy pancakes recipe", links: noLinks }, ["Food", "Music"], c);
    expect(r.category).toBe("Food");
    expect(r.isNew).toBe(false);
    expect(r.status).toBe("sorted");
    expect(r.tags).toContain("pancake");
  });

  it("tells the model to reuse near-duplicates and maps case-insensitive matches to existing spelling", async () => {
    const c = fake(json({ category: "gym", confidence: 0.8, summary: "leg day", tags: ["workout"] }));
    const r = await classifyReel({ caption: "leg day routine", links: noLinks }, ["Gym", "Food"], c);
    const prompt = c.complete.mock.calls[0][0] as string;
    expect(prompt).toContain("Gym");
    expect(prompt.toLowerCase()).toContain("reuse");
    expect(r.category).toBe("Gym");
    expect(r.isNew).toBe(false);
  });

  it("creates a new category when the model proposes one", async () => {
    const c = fake(json({ category: "Travel", confidence: 0.85, summary: "goa trip", tags: ["goa"] }));
    const r = await classifyReel({ caption: "goa trip vlog", links: noLinks }, ["Food"], c);
    expect(r.category).toBe("Travel");
    expect(r.isNew).toBe(true);
  });

  it("sends low confidence to Review", async () => {
    const c = fake(json({ category: "Food", confidence: 0.4, summary: "?", tags: [] }));
    const r = await classifyReel({ caption: "something unclear here", links: noLinks }, ["Food"], c);
    expect(r.category).toBe("Review");
    expect(r.status).toBe("review");
    expect(r.isNew).toBe(false);
  });

  it("returns pending/Review when the model returns junk", async () => {
    const r = await classifyReel({ caption: "hello world", links: noLinks }, [], fake("not json at all"));
    expect(r.status).toBe("pending");
    expect(r.category).toBe("Review");
  });

  it("returns pending/Review when the client throws", async () => {
    const r = await classifyReel({ caption: "hello world", links: noLinks }, [], fake(new Error("api down")));
    expect(r.status).toBe("pending");
    expect(r.category).toBe("Review");
  });

  it("does not call the model for empty or emoji-only captions", async () => {
    const c = fake(json({ category: "Food", confidence: 0.9, summary: "", tags: [] }));
    for (const caption of ["", "   ", "🔥🔥🔥"]) {
      const r = await classifyReel({ caption, links: noLinks }, ["Food"], c);
      expect(r.status).toBe("review");
      expect(r.category).toBe("Review");
    }
    expect(c.complete).not.toHaveBeenCalled();
  });

  it("parses JSON wrapped in a code fence", async () => {
    const c = fake("```json\n" + json({ category: "Music", confidence: 0.9, summary: "rnb", tags: ["rnb"] }) + "\n```");
    const r = await classifyReel({ caption: "best r&b playlist", links: noLinks }, ["Music"], c);
    expect(r.category).toBe("Music");
  });

  it("extracts what the reel is about: a song, a movie or a place", async () => {
    const song = fake(json({ category: "Music", confidence: 0.9, summary: "x", tags: [], kind: "music", title: "Blinding Lights", subtitle: "The Weeknd" }));
    const r1 = await classifyReel({ caption: "this song though", links: noLinks }, ["Music"], song);
    expect([r1.kind, r1.title, r1.subtitle]).toEqual(["music", "Blinding Lights", "The Weeknd"]);

    const place = fake(json({ category: "Restaurants", confidence: 0.9, summary: "x", tags: [], kind: "restaurant", title: "We Idliwaale", subtitle: "NIBM Road, Pune" }));
    const r2 = await classifyReel({ caption: "dosas at We Idliwaale", links: noLinks }, [], place);
    expect([r2.kind, r2.title]).toEqual(["restaurant", "We Idliwaale"]);
  });

  it("defaults to kind other with no title when the model gives none or an unknown kind", async () => {
    const c = fake(json({ category: "Food", confidence: 0.9, summary: "x", tags: [], kind: "spaceship" }));
    const r = await classifyReel({ caption: "some recipe here", links: noLinks }, ["Food"], c);
    expect([r.kind, r.title, r.subtitle]).toEqual(["other", null, null]);
  });

  it("asks the model for kind/title in the prompt", async () => {
    const c = fake(json({ category: "Food", confidence: 0.9, summary: "x", tags: [] }));
    await classifyReel({ caption: "some recipe here", links: noLinks }, [], c);
    const prompt = c.complete.mock.calls[0][0] as string;
    expect(prompt).toContain("kind");
    expect(prompt).toContain("title");
  });
});
