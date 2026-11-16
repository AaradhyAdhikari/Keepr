import { canonicalReelUrl, extractLinks } from "./links";
import { classifyReel, REVIEW, type ClassifyResult } from "./classify";
import { getSql } from "./db";

export type ReelRow = {
  url: string;
  caption: string | null;
  thumbnail_url: string | null;
  category_id: number;
  confidence: number;
  summary: string;
  tags: string[];
  github_links: string[];
  youtube_links: string[];
  status: "sorted" | "review" | "pending";
};

export interface Store {
  findReelByUrl(url: string): Promise<{ id: number; status: string } | null>;
  listCategoryNames(): Promise<string[]>;
  upsertCategory(name: string): Promise<number>;
  insertReel(row: ReelRow): Promise<number>;
}

export type Metadata = { caption: string | null; thumbnail: string | null };

export type IngestDeps = {
  store?: Store;
  classify?: typeof classifyReel | ((...args: Parameters<typeof classifyReel>) => Promise<ClassifyResult>);
  fetchMetadata?: (url: string) => Promise<Metadata | null>;
};

export function pgStore(): Store {
  const sql = getSql();
  return {
    async findReelByUrl(url) {
      const rows = await sql`select id, status from reels where url = ${url}`;
      return rows[0] ? { id: rows[0].id, status: rows[0].status } : null;
    },
    async listCategoryNames() {
      const rows = await sql`select name from categories order by name`;
      return rows.map((r) => r.name as string);
    },
    async upsertCategory(name) {
      const rows = await sql`
        insert into categories (name) values (${name})
        on conflict (lower(name)) do update set name = categories.name
        returning id`;
      return rows[0].id as number;
    },
    async insertReel(r) {
      const rows = await sql`
        insert into reels (url, caption, thumbnail_url, category_id, confidence, summary, tags,
                           github_links, youtube_links, status)
        values (${r.url}, ${r.caption}, ${r.thumbnail_url}, ${r.category_id}, ${r.confidence},
                ${r.summary}, ${r.tags}, ${r.github_links}, ${r.youtube_links}, ${r.status})
        on conflict (url) do update set url = excluded.url
        returning id`;
      return rows[0].id as number;
    },
  };
}

function decode(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function fetchMetadata(url: string): Promise<Metadata | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ReelVault/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const og = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ?? null;
    const desc = og("description") ?? og("title");
    const caption = desc ? decode(desc) : null;
    const img = og("image");
    if (!caption && !img) return null;
    return { caption, thumbnail: img ? decode(img) : null };
  } catch {
    return null;
  }
}

export async function ingestReel(
  input: { url: string; caption?: string },
  deps: IngestDeps = {},
): Promise<{ id: number; status: string; duplicate: boolean; category: string }> {
  const url = canonicalReelUrl(input.url);
  if (!url) throw new Error("invalid reel url");

  const store = deps.store ?? pgStore();
  const classify = deps.classify ?? classifyReel;
  const getMeta = deps.fetchMetadata ?? fetchMetadata;

  const existing = await store.findReelByUrl(url);
  if (existing) return { id: existing.id, status: existing.status, duplicate: true, category: "" };

  let caption = input.caption?.trim() || null;
  let thumbnail: string | null = null;
  if (!caption) {
    const meta = await getMeta(url);
    caption = meta?.caption?.trim() || null;
    thumbnail = meta?.thumbnail ?? null;
  }

  const links = extractLinks(caption ?? "");
  let result: ClassifyResult;
  if (!caption) {
    result = { category: REVIEW, isNew: false, confidence: 0, summary: "", tags: [], status: "pending" };
  } else {
    result = await classify({ caption, links }, await store.listCategoryNames());
  }

  const category_id = await store.upsertCategory(result.category);
  const id = await store.insertReel({
    url,
    caption,
    thumbnail_url: thumbnail,
    category_id,
    confidence: result.confidence,
    summary: result.summary,
    tags: result.tags,
    github_links: links.github,
    youtube_links: links.youtube,
    status: result.status,
  });
  return { id, status: result.status, duplicate: false, category: result.category };
}
