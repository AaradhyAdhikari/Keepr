import { describe, it, expect } from "vitest";
import { actionLinks } from "./actions";

describe("actionLinks", () => {
  it("gives Spotify, Apple Music and YouTube searches for a song", () => {
    expect(actionLinks("music", "Blinding Lights", "The Weeknd")).toEqual([
      { label: "Spotify", url: "https://open.spotify.com/search/Blinding%20Lights%20The%20Weeknd" },
      { label: "Apple Music", url: "https://music.apple.com/search?term=Blinding%20Lights%20The%20Weeknd" },
      { label: "YouTube", url: "https://www.youtube.com/results?search_query=Blinding%20Lights%20The%20Weeknd" },
    ]);
  });

  it("shows only the service that has the movie", () => {
    const links = actionLinks("movie", "Vivarium", "2019", ["netflix"]);
    expect(links).toEqual([{ label: "Netflix", url: "https://www.netflix.com/search?q=Vivarium%202019" }]);
    expect(actionLinks("movie", "Vivarium", "2019", ["prime"]).map((l) => l.label)).toEqual(["Prime Video"]);
    expect(actionLinks("movie", "X", null, ["youtube"])[0].url).toBe("https://www.youtube.com/results?search_query=X%20full%20movie");
  });

  it("shows several only when several really have it", () => {
    expect(actionLinks("movie", "X", null, ["netflix", "prime"]).map((l) => l.label)).toEqual(["Netflix", "Prime Video"]);
  });

  it("falls back to one 'Where to watch' link when availability is unknown or none", () => {
    for (const p of [undefined, null, []]) {
      const links = actionLinks("movie", "Vivarium", "2019", p);
      expect(links).toHaveLength(1);
      expect(links[0].label).toBe("Where to watch");
      expect(links[0].url).toBe("https://www.justwatch.com/in/search?q=Vivarium%202019");
    }
  });

  it("ignores unknown provider ids", () => {
    expect(actionLinks("movie", "X", null, ["hbo"]).map((l) => l.label)).toEqual(["Where to watch"]);
  });

  it("gives a Google Maps link for a restaurant", () => {
    expect(actionLinks("restaurant", "We Idliwaale", "NIBM Road Pune")).toEqual([
      {
        label: "Google Maps",
        url: "https://www.google.com/maps/search/?api=1&query=We%20Idliwaale%20NIBM%20Road%20Pune",
      },
    ]);
  });

  it("encodes special characters safely", () => {
    const [s] = actionLinks("music", "Rock & Roll #1", null);
    expect(s.url).toBe("https://open.spotify.com/search/Rock%20%26%20Roll%20%231");
  });

  it("returns nothing without a title or for other kinds", () => {
    expect(actionLinks("music", null, "x")).toEqual([]);
    expect(actionLinks("music", "  ", null)).toEqual([]);
    expect(actionLinks("other", "Anything", null)).toEqual([]);
  });
});
