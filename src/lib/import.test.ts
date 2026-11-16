import { describe, it, expect, vi } from "vitest";
import { importReels } from "./import";

describe("importReels", () => {
  const item = (code: string) => ({ url: `https://www.instagram.com/reel/${code}/`, caption: "c" });

  it("counts statuses and duplicates across 25 items in batches", async () => {
    const seen = new Set<string>();
    const ingest = vi.fn(async (i: { url: string }) => {
      const dup = seen.has(i.url);
      seen.add(i.url);
      return { id: 1, status: "sorted", duplicate: dup, category: "Food" };
    });
    const items = [...Array.from({ length: 22 }, (_, i) => item(`A${i}`)), item("A0"), item("A1"), item("A2")];
    const r = await importReels(items, { ingest, batchSize: 10 });
    expect(r).toEqual({ sorted: 22, review: 0, pending: 0, duplicates: 3, failed: 0 });
    expect(ingest).toHaveBeenCalledTimes(25);
  });

  it("keeps going when one item throws and counts it as failed", async () => {
    const ingest = vi.fn(async (i: { url: string }) => {
      if (i.url.includes("BAD")) throw new Error("boom");
      return { id: 1, status: "review", duplicate: false, category: "Review" };
    });
    const r = await importReels([item("OK1"), item("BAD"), item("OK2")], { ingest });
    expect(r).toEqual({ sorted: 0, review: 2, pending: 0, duplicates: 0, failed: 1 });
  });

  it("returns zeros for an empty list", async () => {
    expect(await importReels([], { ingest: vi.fn() })).toEqual({
      sorted: 0,
      review: 0,
      pending: 0,
      duplicates: 0,
      failed: 0,
    });
  });
});
