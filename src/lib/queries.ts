import { getSql } from "./db";
import { classifyReel, REVIEW } from "./classify";
import { extractLinks } from "./links";
import type { ReelView } from "./search";

const COLS = `r.id, r.url, r.caption, r.thumbnail_url, c.name as category, r.summary, r.tags,
  r.github_links, r.youtube_links, r.web_links, r.status`;

export async function listCollections(): Promise<{ id: number; name: string; count: number }[]> {
  const rows = await getSql()`
    select c.id, c.name, count(r.id)::int as count
    from categories c left join reels r on r.category_id = c.id
    group by c.id order by (lower(c.name) = 'review') desc, count(r.id) desc, c.name`;
  return rows as unknown as { id: number; name: string; count: number }[];
}

export async function getCollection(id: number): Promise<{ name: string; reels: ReelView[] } | null> {
  const sql = getSql();
  const cat = await sql`select name from categories where id = ${id}`;
  if (!cat[0]) return null;
  const rows = await sql.unsafe(
    `select ${COLS} from reels r join categories c on c.id = r.category_id
     where r.category_id = $1 order by r.created_at desc`,
    [id],
  );
  return { name: cat[0].name as string, reels: rows as unknown as ReelView[] };
}

export async function reviewReels(): Promise<ReelView[]> {
  const rows = await getSql().unsafe(
    `select ${COLS} from reels r join categories c on c.id = r.category_id
     where r.status in ('review','pending') order by r.created_at desc`,
  );
  return rows as unknown as ReelView[];
}

export async function categoryNames(): Promise<string[]> {
  const rows = await getSql()`select name from categories where lower(name) <> 'review' order by name`;
  return rows.map((r) => r.name as string);
}

async function upsertCategory(name: string): Promise<number> {
  const rows = await getSql()`
    insert into categories (name) values (${name})
    on conflict (lower(name)) do update set name = categories.name
    returning id`;
  return rows[0].id as number;
}

/** Manual fix: set the category, or paste a caption and re-run sorting. */
export async function updateReel(
  id: number,
  patch: { category?: string; caption?: string },
): Promise<{ status: string; category: string } | null> {
  const sql = getSql();
  const found = await sql`select id from reels where id = ${id}`;
  if (!found[0]) return null;

  if (patch.category?.trim()) {
    const name = patch.category.trim();
    const cid = await upsertCategory(name);
    await sql`update reels set category_id = ${cid}, status = 'sorted', confidence = 1 where id = ${id}`;
    return { status: "sorted", category: name };
  }

  if (patch.caption?.trim()) {
    const caption = patch.caption.trim();
    const links = extractLinks(caption);
    const existing = await categoryNames();
    const r = await classifyReel({ caption, links }, existing);
    const cid = await upsertCategory(r.category);
    await sql`update reels set caption = ${caption}, category_id = ${cid}, confidence = ${r.confidence},
      summary = ${r.summary}, tags = ${r.tags}, github_links = ${links.github},
      youtube_links = ${links.youtube}, web_links = ${links.web}, status = ${r.status} where id = ${id}`;
    return { status: r.status, category: r.category };
  }
  return { status: "unchanged", category: REVIEW };
}
