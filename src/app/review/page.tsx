import Link from "next/link";
import ReelCard from "@/components/ReelCard";
import ReviewControls from "@/components/ReviewControls";
import { categoryNames, reviewReels } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [reels, categories] = await Promise.all([reviewReels(), categoryNames()]);
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <p>
        <Link href="/">← All collections</Link>
      </p>
      <h1>Review</h1>
      <p style={{ opacity: 0.7 }}>Reels I wasn&apos;t sure about. Pick a category, or paste a missing caption.</p>
      {reels.length === 0 && <p>All clear. Nothing to review.</p>}
      {reels.map((r) => (
        <ReelCard key={r.id} reel={r}>
          <ReviewControls id={r.id} status={r.status} categories={categories} />
        </ReelCard>
      ))}
    </main>
  );
}
