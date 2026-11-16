import { getSql } from "./db";
import { defaultClient, type ClassifierClient } from "./classify";

export type ReelView = {
  id: number;
  url: string;
  caption: string | null;
  thumbnail_url: string | null;
  category: string;
  summary: string | null;
  tags: string[];
  github_links: string[];
  youtube_links: string[];
  status: "sorted" | "review" | "pending";
};

export interface SearchStore {
  findCategory(name: string): Promise<{ id: number; name: string } | null>;
  reelsInCategory(name: string): Promise<ReelView[]>;
  search(terms: string[]): Promise<ReelView[]>;
}

const SELECT_COLS = `r.id, r.url, r.caption, r.thumbnail_url, c.name as category, r.summary, r.tags,
  r.github_links, r.youtube_links, r.status`;

export function pgSearchStore(): SearchStore {
  const sql = getSql();
  return {
    async findCategory(name) {
      const rows = await sql`select id, name from categories where lower(name) = lower(${name})`;
      return rows[0] ? { id: rows[0].id, name: rows[0].name } : null;
    },
    async reelsInCategory(name) {
      const rows = await sql.unsafe(
        `select ${SELECT_COLS} from reels r join categories c on c.id = r.category_id
         where lower(c.name) = lower($1) order by r.created_at desc`,
        [name],
      );
      return rows as unknown as ReelView[];
    },
    async search(terms) {
      const q = terms.map((t) => (t.length >= 3 ? `${t}:*` : t)).join(" | ");
      if (!q) return [];
      const rows = await sql.unsafe(
        `select ${SELECT_COLS} from reels r join categories c on c.id = r.category_id
         where r.search @@ to_tsquery('simple', $1)
         order by ts_rank(r.search, to_tsquery('simple', $1)) desc, r.created_at desc limit 60`,
        [q],
      );
      return rows as unknown as ReelView[];
    },
  };
}

export function words(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 2),
    ),
  ];
}

async function expand(query: string, client: ClassifierClient): Promise<string[]> {
  const prompt = [
    "Someone is searching their saved Instagram reels. Turn the search into 5-10 lowercase single-word keywords:",
    "the words themselves plus likely synonyms and related terms that reel tags might contain.",
    'Reply with ONLY a JSON array of strings, e.g. ["breakfast","pancake"].',
    `Search: ${query}`,
  ].join("\n");
  const raw = await client.complete(prompt);
  const stripped = raw.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start === -1 || end <= start) throw new Error("no array");
  const arr = JSON.parse(stripped.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("not array");
  return arr.filter((x): x is string => typeof x === "string").flatMap(words);
}

export async function searchReels(
  query: string,
  deps: { store?: SearchStore; client?: ClassifierClient } = {},
): Promise<{ collection: string | null; reels: ReelView[] }> {
  const q = query.trim();
  if (!q) return { collection: null, reels: [] };
  const store = deps.store ?? pgSearchStore();

  const cat = await store.findCategory(q);
  if (cat) return { collection: cat.name, reels: await store.reelsInCategory(cat.name) };

  const raw = words(q);
  let terms = raw;
  try {
    const expanded = await expand(q, deps.client ?? defaultClient());
    terms = [...new Set([...raw, ...expanded])];
  } catch {
    terms = raw;
  }
  return { collection: null, reels: terms.length ? await store.search(terms) : [] };
}
