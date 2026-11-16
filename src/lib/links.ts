const TRAILING = /[.,;:!?)\]}"'>]+$/;

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}

function urlsIn(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map((u) => u.replace(TRAILING, ""));
}

const TLDS = "com|io|ai|dev|app|org|net|co|in|so|tech|xyz|gg|fm";
const BARE = new RegExp(`(?<![@\\w./-])((?:www\\.)?[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${TLDS}))(?![\\w@-])(\\/[^\\s<>"']*)?`, "gi");
const NOT_SITES = /^(b|m|e|i)\.(tech|g|e)$/i;

function bareDomains(text: string): string[] {
  // strip full URLs and emails first so they are not double counted
  const rest = text.replace(/https?:\/\/[^\s<>"']+/gi, " ").replace(/[\w.+-]+@[\w.-]+/g, " ");
  const out: string[] = [];
  for (const m of rest.matchAll(BARE)) {
    const host = m[1];
    if (NOT_SITES.test(host)) continue;
    out.push(`https://${host}${(m[2] ?? "").replace(TRAILING, "")}`);
  }
  return out;
}

export function canonicalReelUrl(input: string): string | null {
  for (const raw of urlsIn(input ?? "")) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "instagram.com") continue;
    const m = u.pathname.match(/^\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
    if (m) return `https://www.instagram.com/reel/${m[1]}/`;
  }
  return null;
}

export function extractLinks(caption: string): { github: string[]; youtube: string[]; web: string[] } {
  const github: string[] = [];
  const youtube: string[] = [];
  const web: string[] = [];
  for (const raw of [...urlsIn(caption ?? ""), ...bareDomains(caption ?? "")]) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^www\./, "");
    if (host === "github.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) github.push(`https://github.com/${parts[0]}/${parts[1]}`);
    } else if (host === "youtu.be") {
      if (u.pathname.length > 1) youtube.push(`https://youtu.be${u.pathname}`);
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (u.pathname === "/watch" && v) youtube.push(`https://www.youtube.com/watch?v=${v}`);
      else if (u.pathname.startsWith("/shorts/")) youtube.push(`https://www.youtube.com${u.pathname}`);
    } else if (host !== "instagram.com" && !host.endsWith(".cdninstagram.com")) {
      web.push(raw);
    }
  }
  return { github: dedupe(github), youtube: dedupe(youtube), web: dedupe(web) };
}
