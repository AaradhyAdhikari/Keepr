import Link from "next/link";
import { notFound } from "next/navigation";
import ReelCard from "@/components/ReelCard";
import { getCollection } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();
  const col = await getCollection(n);
  if (!col) notFound();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <p>
        <Link href="/">← All collections</Link>
      </p>
      <h1>{col.name}</h1>
      {col.reels.length === 0 && <p>No reels here yet.</p>}
      {col.reels.map((r) => (
        <ReelCard key={r.id} reel={r} />
      ))}
    </main>
  );
}
