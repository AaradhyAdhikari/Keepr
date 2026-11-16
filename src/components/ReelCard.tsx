import type { ReactNode } from "react";
import type { ReelView } from "@/lib/search";

const card: React.CSSProperties = {
  border: "1px solid #374151",
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
  background: "#1f2937",
};
const pill: React.CSSProperties = {
  display: "inline-block",
  marginRight: 8,
  marginTop: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#374151",
  color: "#f9fafb",
  fontSize: 14,
  textDecoration: "none",
};

export default function ReelCard({ reel, children }: { reel: ReelView; children?: ReactNode }) {
  const caption = (reel.caption ?? "").slice(0, 160);
  return (
    <article style={card}>
      <a
        href={reel.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "flex", gap: 12, color: "inherit", textDecoration: "none" }}
      >
        {reel.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reel.thumbnail_url} alt="" width={72} height={96} style={{ objectFit: "cover", borderRadius: 8 }} />
        )}
        <span>
          <strong>{reel.summary || caption || "Reel"}</strong>
          {reel.summary && caption && <span style={{ display: "block", opacity: 0.7, marginTop: 4 }}>{caption}</span>}
        </span>
      </a>
      <div>
        <span style={{ ...pill, background: "#4b5563" }}>{reel.category}</span>
        {reel.github_links.map((l) => (
          <a key={l} href={l} target="_blank" rel="noopener noreferrer" style={pill}>
            GitHub: {l.replace("https://github.com/", "")}
          </a>
        ))}
        {reel.youtube_links.map((l) => (
          <a key={l} href={l} target="_blank" rel="noopener noreferrer" style={pill}>
            ▶ YouTube
          </a>
        ))}
      </div>
      {children}
    </article>
  );
}
