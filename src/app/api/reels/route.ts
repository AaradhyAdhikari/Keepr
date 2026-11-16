import { NextResponse } from "next/server";
import { ingestReel } from "@/lib/ingest";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string; caption?: string };
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    const result = await ingestReel({ url: body.url, caption: body.caption });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: msg.includes("invalid") ? 400 : 500 });
  }
}
