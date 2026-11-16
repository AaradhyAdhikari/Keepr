import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReelCard from "./ReelCard";
import type { ReelView } from "@/lib/search";

const base: ReelView = {
  id: 1,
  url: "https://www.instagram.com/reel/ABC123/",
  caption: "great repo",
  thumbnail_url: null,
  category: "Tech",
  summary: "a repo",
  tags: [],
  github_links: [],
  youtube_links: [],
  web_links: [],
  kind: "other",
  entity_title: null,
  entity_sub: null, providers: null,
  status: "sorted",
};

const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe("ReelCard", () => {
  it("renders one link to the reel on Instagram when there are no extracted links", () => {
    const html = renderToStaticMarkup(<ReelCard reel={base} />);
    expect(hrefs(html)).toEqual(["https://www.instagram.com/reel/ABC123/"]);
  });

  it("adds a GitHub button labelled user/repo and a YouTube button", () => {
    const html = renderToStaticMarkup(
      <ReelCard
        reel={{
          ...base,
          github_links: ["https://github.com/vercel/next.js"],
          youtube_links: ["https://youtu.be/dQw4w9WgXcQ"],
        }}
      />,
    );
    expect(hrefs(html)).toEqual([
      "https://www.instagram.com/reel/ABC123/",
      "https://github.com/vercel/next.js",
      "https://youtu.be/dQw4w9WgXcQ",
    ]);
    expect(html).toContain("vercel/next.js");
  });

  it("escapes caption text and survives an empty caption", () => {
    const html = renderToStaticMarkup(<ReelCard reel={{ ...base, caption: "<script>x</script>" }} />);
    expect(html).not.toContain("<script>");
    expect(() => renderToStaticMarkup(<ReelCard reel={{ ...base, caption: null }} />)).not.toThrow();
  });

  it("adds a website button per web link, labelled with the host", () => {
    const html = renderToStaticMarkup(
      <ReelCard reel={{ ...base, web_links: ["https://twin-desk.vercel.app", "https://gittrend.io/x"] }} />,
    );
    expect(hrefs(html)).toEqual([
      "https://www.instagram.com/reel/ABC123/",
      "https://twin-desk.vercel.app",
      "https://gittrend.io/x",
    ]);
    expect(html).toContain("twin-desk.vercel.app");
    expect(html).toContain("gittrend.io");
  });

  it("shows Spotify, Apple Music and YouTube buttons for a music reel", () => {
    const html = renderToStaticMarkup(
      <ReelCard reel={{ ...base, kind: "music", entity_title: "Blinding Lights", entity_sub: "The Weeknd" }} />,
    );
    expect(hrefs(html)).toEqual([
      "https://www.instagram.com/reel/ABC123/",
      "https://open.spotify.com/search/Blinding%20Lights%20The%20Weeknd",
      "https://music.apple.com/search?term=Blinding%20Lights%20The%20Weeknd",
      "https://www.youtube.com/results?search_query=Blinding%20Lights%20The%20Weeknd",
    ]);
  });

  it("shows a Google Maps button for a restaurant and none for other reels", () => {
    const place = renderToStaticMarkup(
      <ReelCard reel={{ ...base, kind: "restaurant", entity_title: "We Idliwaale", entity_sub: "Pune" }} />,
    );
    expect(hrefs(place)[1]).toContain("google.com/maps/search");
    expect(hrefs(renderToStaticMarkup(<ReelCard reel={base} />))).toHaveLength(1);
  });
});
