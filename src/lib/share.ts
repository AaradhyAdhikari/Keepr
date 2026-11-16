import { canonicalReelUrl } from "./links";

export function pickSharedText(params: { url?: string; text?: string; title?: string }): string | null {
  for (const candidate of [params.url, params.text, params.title]) {
    if (candidate && canonicalReelUrl(candidate)) return candidate;
  }
  return null;
}
