export type Kind = "music" | "movie" | "restaurant" | "other";
export type ActionLink = { label: string; url: string };

/** Deep links that land on the search results for this title in each app. */
const STREAMING: Record<string, { label: string; url: (q: string) => string }> = {
  netflix: { label: "Netflix", url: (q) => `https://www.netflix.com/search?q=${q}` },
  prime: { label: "Prime Video", url: (q) => `https://www.primevideo.com/search?phrase=${q}` },
  jiohotstar: { label: "JioHotstar", url: (q) => `https://www.hotstar.com/in/search?q=${q}` },
  zee5: { label: "ZEE5", url: (q) => `https://www.zee5.com/search?q=${q}` },
  sonyliv: { label: "SonyLIV", url: (q) => `https://www.sonyliv.com/search?q=${q}` },
  youtube: { label: "YouTube", url: (q) => `https://www.youtube.com/results?search_query=${q}%20full%20movie` },
};

export function actionLinks(
  kind: Kind | string | null | undefined,
  title: string | null | undefined,
  subtitle?: string | null,
  providers?: string[] | null,
): ActionLink[] {
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
    {
      // Only the services that really have it; one neutral link when we don't know.
      const found = (providers ?? []).filter((p) => STREAMING[p]).map((p) => ({ label: STREAMING[p].label, url: STREAMING[p].url(q) }));
      return found.length ? found : [{ label: "Where to watch", url: `https://www.justwatch.com/in/search?q=${q}` }];
    }
    case "restaurant":
      return [{ label: "Google Maps", url: `https://www.google.com/maps/search/?api=1&query=${q}` }];
    default:
      return [];
  }
}
