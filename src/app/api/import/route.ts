import { NextResponse } from "next/server";
import { importReels, type ImportItem } from "@/lib/import";

export const maxDuration = 60;
const MAX_ITEMS = 20;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { items?: ImportItem[] };
  if (!Array.isArray(body.items)) return NextResponse.json({ error: "items array required" }, { status: 400 });
  if (body.items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `send at most ${MAX_ITEMS} items per request` }, { status: 400 });
  }
  const items = body.items.filter((i) => i && typeof i.url === "string");
  return NextResponse.json(await importReels(items));
}
