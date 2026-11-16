const TRAILING = /[.,;:!?)\]}"'>]+$/;

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}

function urlsIn(text: string): string[] {
  return (text.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map((u) => u.replace(TRAILING, ""));
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

export function extractLinks(caption: string): { github: string[]; youtube: string[] } {
  const github: string[] = [];
  const youtube: string[] = [];
  for (const raw of urlsIn(caption ?? "")) {
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
    }
  }
  return { github: dedupe(github), youtube: dedupe(youtube) };
}
