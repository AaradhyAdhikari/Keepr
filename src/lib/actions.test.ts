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

  it("gives Netflix, Prime Video and YouTube for a movie or show", () => {
    const links = actionLinks("movie", "Vivarium", "2019");
    expect(links.map((l) => l.label)).toEqual(["Netflix", "Prime Video", "YouTube"]);
    expect(links[0].url).toBe("https://www.netflix.com/search?q=Vivarium%202019");
    expect(links[1].url).toBe("https://www.primevideo.com/search?phrase=Vivarium%202019");
    expect(links[2].url).toBe("https://www.youtube.com/results?search_query=Vivarium%202019%20trailer");
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
