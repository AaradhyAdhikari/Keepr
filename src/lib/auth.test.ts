import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "./auth";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

describe("session tokens", () => {
  it("accepts a freshly signed token", async () => {
    expect(await verifySession(await signSession())).toBe(true);
  });
  it("rejects a tampered token", async () => {
    const t = await signSession();
    expect(await verifySession(t.slice(0, -2) + "xx")).toBe(false);
  });
  it("rejects an empty token", async () => {
    expect(await verifySession("")).toBe(false);
  });
});
