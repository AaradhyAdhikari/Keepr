"use client";
import { useState } from "react";

export default function ReviewControls({
  id,
  status,
  categories,
}: {
  id: number;
  status: string;
  categories: string[];
}) {
  const [category, setCategory] = useState("");
  const [caption, setCaption] = useState("");
  const [msg, setMsg] = useState("");

  async function save(body: { category?: string; caption?: string }) {
    setMsg("Saving…");
    const res = await fetch(`/api/reels/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return setMsg("Could not save");
    const data = await res.json();
    setMsg(data.status === "sorted" ? `Moved to ${data.category}` : "Still needs review");
    if (data.status === "sorted") setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div style={{ marginTop: 12 }}>
      {status === "pending" && (
        <div style={{ marginBottom: 8 }}>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Paste the reel's caption and I'll sort it"
            rows={3}
            style={{ width: "100%", padding: 8 }}
          />
          <button type="button" disabled={!caption.trim()} onClick={() => save({ caption })}>
            Sort it
          </button>
        </div>
      )}
      <input
        list={`cats-${id}`}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Pick or type a category"
        style={{ padding: 8, marginRight: 8 }}
      />
      <datalist id={`cats-${id}`}>
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <button type="button" disabled={!category.trim()} onClick={() => save({ category })}>
        Move
      </button>
      {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
    </div>
  );
}
