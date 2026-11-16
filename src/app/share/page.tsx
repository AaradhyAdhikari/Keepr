"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { pickSharedText } from "@/lib/share";

type State =
  | { kind: "working" }
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "done"; status: string; category: string; duplicate: boolean };

function Share() {
  const params = useSearchParams();
  const [state, setState] = useState<State>({ kind: "working" });
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const shared = pickSharedText({
      url: params.get("url") ?? undefined,
      text: params.get("text") ?? undefined,
      title: params.get("title") ?? undefined,
    });
    if (!shared) {
      setState({ kind: "none" });
      return;
    }
    fetch("/api/reels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: shared }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setState({ kind: "error", message: data.error ?? "Could not save" });
        else setState({ kind: "done", status: data.status, category: data.category, duplicate: data.duplicate });
      })
      .catch(() => setState({ kind: "error", message: "Network error" }));
  }, [params]);

  return (
    <main style={{ maxWidth: 480, margin: "20vh auto", padding: 16, textAlign: "center" }}>
      {state.kind === "working" && <p>Saving…</p>}
      {state.kind === "none" && <p>That wasn&apos;t an Instagram reel link.</p>}
      {state.kind === "error" && <p role="alert">{state.message}</p>}
      {state.kind === "done" && (
        <>
          {state.duplicate && <p>Already saved.</p>}
          {!state.duplicate && state.status === "sorted" && <p>Saved to {state.category}.</p>}
          {!state.duplicate && state.status === "review" && <p>Saved. Not sure where it goes, so it&apos;s in Review.</p>}
          {!state.duplicate && state.status === "pending" && (
            <p>Saved, but I couldn&apos;t read the caption. Open Review to paste it.</p>
          )}
        </>
      )}
      <p style={{ marginTop: 24 }}>
        <a href="/">Open Reel Vault</a>
      </p>
    </main>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: "20vh" }}>Saving…</p>}>
      <Share />
    </Suspense>
  );
}
