import { describe, it, expect } from "vitest";
import { canonicalReelUrl, extractLinks } from "./links";

describe("canonicalReelUrl", () => {
  const want = "https://www.instagram.com/reel/ABC123/";
  it("strips tracking params", () => {
    expect(canonicalReelUrl("https://www.instagram.com/reel/ABC123/?igsh=xyz")).toBe(want);
  });
  it("maps /reels/ and /p/ forms", () => {
    expect(canonicalReelUrl("https://instagram.com/reels/ABC123")).toBe(want);
    expect(canonicalReelUrl("https://www.instagram.com/p/ABC123/")).toBe(want);
  });
  it("finds the URL inside share text", () => {
    expect(canonicalReelUrl("check this https://www.instagram.com/reel/ABC123/?igsh=1 wow")).toBe(want);
  });
  it("returns null for non-instagram or junk", () => {
    expect(canonicalReelUrl("https://example.com/reel/ABC123/")).toBeNull();
    expect(canonicalReelUrl("")).toBeNull();
  });
});

describe("extractLinks", () => {
  it("extracts github repos and youtube videos, trimming punctuation", () => {
    const r = extractLinks(
      "code https://github.com/vercel/next.js. and https://youtu.be/dQw4w9WgXcQ, https://github.com/vercel",
    );
    expect(r.github).toEqual(["https://github.com/vercel/next.js"]);
    expect(r.youtube).toEqual(["https://youtu.be/dQw4w9WgXcQ"]);
  });
  it("handles youtube.com watch links and dedupes", () => {
    const r = extractLinks("https://www.youtube.com/watch?v=abc123 https://www.youtube.com/watch?v=abc123");
    expect(r.youtube).toEqual(["https://www.youtube.com/watch?v=abc123"]);
  });
  it("returns empty arrays for no links", () => {
    expect(extractLinks("")).toEqual({ github: [], youtube: [], web: [] });
    expect(extractLinks("just words 🔥")).toEqual({ github: [], youtube: [], web: [] });
  });

  it("collects other websites as web links, bare domains included, without false positives", () => {
    const r = extractLinks(
      "try https://twin-desk.vercel.app, also gittrend.io and verci.xyz. B.Tech students! https://www.instagram.com/reel/ABC/ email me@site.com",
    );
    expect(r.web).toEqual(["https://twin-desk.vercel.app", "https://gittrend.io", "https://verci.xyz"]);
  });
  it("keeps github and youtube out of web", () => {
    const r = extractLinks("https://github.com/a/b https://youtu.be/abc12345678 https://example.com/x");
    expect(r.web).toEqual(["https://example.com/x"]);
  });
});
