import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { listCollections } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const collections = await listCollections();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1>Keepr</h1>
      <SearchBar />
      <h2 style={{ marginTop: 24 }}>Collections</h2>
      {collections.length === 0 && <p>Nothing saved yet. Share a reel from Instagram to Keepr to start.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {collections.map((c) => (
          <Link
            key={c.id}
            href={c.name.toLowerCase() === "review" ? "/review" : `/c/${c.id}`}
            style={{
              display: "block",
              padding: 16,
              borderRadius: 12,
              background: "#1f2937",
              border: c.name.toLowerCase() === "review" && c.count > 0 ? "1px solid #f472b6" : "1px solid #374151",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <strong>{c.name}</strong>
            <div style={{ opacity: 0.7 }}>{c.count} reels</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
