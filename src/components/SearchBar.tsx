"use client";
import { useState } from "react";
import ReelCard from "./ReelCard";
import type { ReelView } from "@/lib/search";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ collection: string | null; reels: ReelView[] } | null>(null);
  const [error, setError] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) {
      setResult(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <form onSubmit={run} style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search, e.g. "breakfast recipes" or "r&b music"'
          aria-label="Search reels"
          style={{ flex: 1, padding: 12, fontSize: 16, borderRadius: 10, border: "1px solid #374151" }}
        />
        <button type="submit" style={{ padding: "0 16px", borderRadius: 10 }}>
          {busy ? "…" : "Search"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          {result.collection && <h2>{result.collection}</h2>}
          {result.reels.length === 0 && <p>No reels found.</p>}
          {result.reels.map((r) => (
            <ReelCard key={r.id} reel={r} />
          ))}
        </div>
      )}
    </section>
  );
}
