import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { COOKIE_NAME, signSession } from "./lib/auth";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

const req = (path: string, cookie?: string) =>
  new NextRequest(`https://keepr.test${path}`, cookie ? { headers: { cookie: `${COOKIE_NAME}=${cookie}` } } : undefined);
const passes = (r: Response) => r.headers.get("x-middleware-next") === "1";

describe("proxy gate", () => {
  it("lets the PWA files through without login (service worker, manifest, icons, login)", async () => {
    for (const p of ["/sw.js", "/manifest.webmanifest", "/icon-192.png", "/login", "/api/login"]) {
      expect(passes(await proxy(req(p)))).toBe(true);
    }
  });
  it("redirects pages to /login and 401s the API without a session", async () => {
    expect((await proxy(req("/"))).status).toBe(307);
    expect((await proxy(req("/api/reels"))).status).toBe(401);
  });
  it("lets a valid session through", async () => {
    expect(passes(await proxy(req("/", await signSession())))).toBe(true);
  });
});
