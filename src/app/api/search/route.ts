import { NextResponse } from "next/server";
import { searchReels } from "@/lib/search";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await searchReels(q));
  } catch {
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}
