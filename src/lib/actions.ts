export type Kind = "music" | "movie" | "restaurant" | "other";
export type ActionLink = { label: string; url: string };

/** Deep links that land on the search results for this title in each app. */
export function actionLinks(kind: Kind | string | null | undefined, title: string | null | undefined, subtitle?: string | null): ActionLink[] {
  const t = (title ?? "").trim();
  if (!t) return [];
  const q = encodeURIComponent([t, (subtitle ?? "").trim()].filter(Boolean).join(" "));
  switch (kind) {
    case "music":
      return [
        { label: "Spotify", url: `https://open.spotify.com/search/${q}` },
        { label: "Apple Music", url: `https://music.apple.com/search?term=${q}` },
        { label: "YouTube", url: `https://www.youtube.com/results?search_query=${q}` },
      ];
    case "movie":
      return [
        { label: "Netflix", url: `https://www.netflix.com/search?q=${q}` },
        { label: "Prime Video", url: `https://www.primevideo.com/search?phrase=${q}` },
        { label: "YouTube", url: `https://www.youtube.com/results?search_query=${q}%20trailer` },
      ];
    case "restaurant":
      return [{ label: "Google Maps", url: `https://www.google.com/maps/search/?api=1&query=${q}` }];
    default:
      return [];
  }
}
