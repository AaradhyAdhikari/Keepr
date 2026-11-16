"use client";
import { useState } from "react";

export default function Login() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) window.location.href = "/";
    else setError("Wrong passcode");
  }

  return (
    <main style={{ maxWidth: 360, margin: "20vh auto", padding: 16 }}>
      <h1>Keepr</h1>
      <form onSubmit={submit}>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          autoFocus
          style={{ width: "100%", padding: 10, fontSize: 16 }}
        />
        <button type="submit" style={{ marginTop: 12, padding: "10px 16px" }}>
          Enter
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
