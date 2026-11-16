/** Where a movie/show streams in India, from TMDB's watch-provider data (JustWatch). */
const IDS: [RegExp, string][] = [
  [/^netflix$/i, "netflix"],
  [/amazon prime video|^prime video$/i, "prime"],
  [/hotstar/i, "jiohotstar"],
  [/^zee5$/i, "zee5"],
  [/sony ?liv/i, "sonyliv"],
  [/^youtube$/i, "youtube"],
];

type Opts = { apiKey?: string; fetchFn?: typeof fetch; region?: string };

/** string[] = providers (maybe empty = not streaming); null = could not find out. */
export async function lookupProviders(title: string, year: string | null | undefined, opts: Opts = {}): Promise<string[] | null> {
  const key = opts.apiKey ?? process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const f = opts.fetchFn ?? fetch;
  const region = opts.region ?? "IN";
  const api = (path: string) => f(`https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${key}`);
  try {
    const q = encodeURIComponent(title.replace(/\s*\((TV series|\d{4})\)\s*$/i, "").trim());
    const y = year && /^\d{4}$/.test(year) ? `&year=${year}` : "";
    const s = await api(`/search/multi?query=${q}${y}`);
    if (!s.ok) return null;
    const hit = ((await s.json()).results ?? []).find((r: { media_type: string }) => r.media_type === "movie" || r.media_type === "tv");
    if (!hit) return null;
    const w = await api(`/${hit.media_type}/${hit.id}/watch/providers`);
    if (!w.ok) return null;
    const flat: { provider_name: string }[] = (await w.json()).results?.[region]?.flatrate ?? [];
    const out: string[] = [];
    for (const p of flat) {
      const id = IDS.find(([re]) => re.test(p.provider_name))?.[1];
      if (id && !out.includes(id)) out.push(id);
    }
    return out;
  } catch {
    return null;
  }
}
