# Keepr Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-user installable web app that auto-sorts shared/imported Instagram reels into self-growing categories, extracts GitHub/YouTube links, and searches by meaning.

**Architecture:** Next.js (App Router, TypeScript) on Vercel with Postgres. A PWA with a Web Share Target receives shared reel links. Claude (only AI provider) classifies each reel and generates search tags; search expands the query into keywords with Claude, then runs Postgres full-text search over caption, category and tags.

**Tech Stack:** Next.js, TypeScript, Vitest, `@anthropic-ai/sdk` (model `claude-haiku-5-5`), zod, Postgres (Vercel/Neon) via `postgres` package.

**Spec:** `/home/claude/reel-vault-design.md`

## Global Constraints
- Claude is the only AI provider. No embeddings or other AI vendors.
- Single user: every page and API route sits behind one passcode (env `APP_PASSCODE`) with a signed cookie. Nothing public.
- Tapping a reel opens its Instagram URL. The app never plays or embeds reels.
- Never ask for or store Instagram credentials.
- Uncertain classifications (confidence < 0.6) go to the category named exactly `Review`.
- Env vars: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `APP_PASSCODE`, `SESSION_SECRET`.
- Reels are unique by canonical URL (`https://www.instagram.com/reel/<code>/`).

## Review Focus
- Shared URL has tracking params, `/reels/`, or `/p/` form: must canonicalize to one URL, no duplicates.
- Same reel shared twice: stored once, no second Claude call.
- Caption has no links, or links in odd forms (`youtu.be`, trailing punctuation, `github.com/user` without repo): only valid GitHub repos/YouTube videos extracted.
- Empty or emoji-only caption: goes to Review, no crash, paste-caption prompt shown.
- Claude returns malformed JSON, a near-duplicate category name ("Fitness" vs existing "Gym"), or the API fails: reel is saved as Review/pending, never lost.

---

### Task 1: Scaffold, DB schema, passcode gate

**Files:**
- Create: Next.js app at `reel-vault/`, `db/schema.sql`, `src/lib/db.ts`, `src/lib/auth.ts`, `src/middleware.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Produces: `sql` (postgres client) from `src/lib/db.ts`; `signSession(): string`, `verifySession(token: string): boolean` from `auth.ts`.

- [ ] **Step 1: Write failing tests** in `auth.test.ts`: `verifySession(signSession())` is true; a tampered token is false; empty string is false.
- [ ] **Step 2: Run** `npx vitest run src/lib/auth.test.ts` and confirm failure.
- [ ] **Step 3: Scaffold** with `create-next-app` (TypeScript, App Router), add vitest, `postgres`, `zod`, `@anthropic-ai/sdk`. Implement `signSession`/`verifySession` as HMAC-SHA256 over a fixed payload using `SESSION_SECRET`.
- [ ] **Step 4: Write `db/schema.sql`:** `categories(id serial pk, name text unique not null, created_at)`; `reels(id serial pk, url text unique not null, caption text, thumbnail_url text, category_id int references categories, confidence real, summary text, tags text[], github_links text[], youtube_links text[], status text check in ('sorted','review','pending'), created_at)`; a generated `tsvector` column `search` over caption, summary, tags and category name via trigger; GIN index.
- [ ] **Step 5: Middleware** redirects any route except `/login`, `/manifest.webmanifest` and static assets to `/login` without a valid cookie. `/login` page + `POST /api/login` compare passcode to `APP_PASSCODE`, set the cookie.
- [ ] **Step 6: Run tests, confirm pass. Commit** `feat: scaffold, schema, passcode gate`.

### Task 2: URL canonicalization and link extraction (pure functions)

**Files:** Create `src/lib/links.ts`; Test `src/lib/links.test.ts`

**Interfaces:**
- Produces: `canonicalReelUrl(input: string): string | null`; `extractLinks(caption: string): { github: string[]; youtube: string[] }`.

- [ ] **Step 1: Write failing tests:** `canonicalReelUrl("https://www.instagram.com/reel/ABC123/?igsh=xyz")` and `".../reels/ABC123"` and `".../p/ABC123/"` all equal `https://www.instagram.com/reel/ABC123/`; a non-Instagram URL returns null. `extractLinks("code https://github.com/vercel/next.js. and https://youtu.be/dQw4w9WgXcQ, https://github.com/vercel")` returns github `["https://github.com/vercel/next.js"]` (no trailing dot, bare profile excluded) and youtube `["https://youtu.be/dQw4w9WgXcQ"]`; empty string gives empty arrays.
- [ ] **Step 2: Run, confirm failure. Step 3: Implement** with regex plus trailing-punctuation trim, deduped, order preserved.
- [ ] **Step 4: Run, confirm pass. Commit** `feat: canonical url and link extraction`.

### Task 3: Claude classifier with category reuse and review fallback

**Files:** Create `src/lib/classify.ts`; Test `src/lib/classify.test.ts`

**Interfaces:**
- Consumes: `sql` from Task 1.
- Produces: `classifyReel(input: { caption: string; links: {github: string[]; youtube: string[]} }, existing: string[], client?: ClassifierClient): Promise<ClassifyResult>` where `ClassifyResult = { category: string; isNew: boolean; confidence: number; summary: string; tags: string[]; status: 'sorted' | 'review' | 'pending' }`; `ClassifierClient = { complete(prompt: string): Promise<string> }` (default implementation wraps Anthropic SDK, model `claude-haiku-5-5`).

- [ ] **Step 1: Write failing tests with a fake client:** (a) returns existing category "Food" at confidence 0.9 gives status `sorted`, `isNew` false; (b) category "Fitness" when "Gym" exists: prompt must contain the existing list and an instruction to reuse near-duplicates; a returned name matching an existing one case-insensitively maps to the existing spelling; (c) confidence 0.4 gives category `Review`, status `review`; (d) client returns non-JSON or throws gives status `pending`, category `Review`, no throw; (e) empty/emoji-only caption gives `review` without calling the client.
- [ ] **Step 2: Run, confirm failure. Step 3: Implement.** Prompt asks for JSON `{category, confidence, summary, tags}`; validate with zod; tags 3-8 lowercase search keywords including synonyms; category names 1-3 words, Title Case.
- [ ] **Step 4: Run, confirm pass. Commit** `feat: claude classifier`.

### Task 4: Ingest pipeline and API

**Files:** Create `src/lib/ingest.ts`, `src/app/api/reels/route.ts`; Test `src/lib/ingest.test.ts`

**Interfaces:**
- Consumes: `canonicalReelUrl`, `extractLinks`, `classifyReel`, `sql`.
- Produces: `ingestReel(input: { url: string; caption?: string }): Promise<{ id: number; status: string; duplicate: boolean }>`; `POST /api/reels` JSON `{url, caption?}`.

- [ ] **Step 1: Write failing tests (test DB or mocked `sql`):** invalid URL rejects; same URL twice returns `duplicate: true` and the classifier is called once; with no caption, `fetchMetadata` is tried and on failure status is `pending` with a caption-needed flag; with caption, a new category is created when `isNew`.
- [ ] **Step 2: Run, confirm failure. Step 3: Implement.** `fetchMetadata(url)` uses Instagram's public oEmbed/page fetch for caption and thumbnail; any failure returns null (never throws). Category rows upserted by case-insensitive name.
- [ ] **Step 4: Run, confirm pass. Commit** `feat: ingest pipeline`.

### Task 5: Search

**Files:** Create `src/lib/search.ts`, `src/app/api/search/route.ts`; Test `src/lib/search.test.ts`

**Interfaces:**
- Produces: `searchReels(query: string, client?: ClassifierClient): Promise<{ collection: string | null; reels: ReelRow[] }>`.

- [ ] **Step 1: Write failing tests with fake client:** query exactly equal (case-insensitive) to a category name returns that collection and its reels with no Claude call; "breakfast recipes" with expansion keywords `["breakfast","recipe","pancake","omelette"]` matches a reel tagged `pancake`; if the client fails, falls back to plain full-text on the raw query; empty query returns `{collection:null, reels:[]}`.
- [ ] **Step 2: Run, confirm failure. Step 3: Implement** expansion prompt returning a JSON array of 5-10 keywords; build an OR `tsquery` from sanitized terms; rank with `ts_rank`.
- [ ] **Step 4: Run, confirm pass. Commit** `feat: semantic search via claude keyword expansion`.

### Task 6: PWA + share target

**Files:** Create `public/manifest.webmanifest`, icons, `src/app/share/page.tsx`, `src/app/layout.tsx` metadata

**Interfaces:** Consumes `POST /api/reels`.

- [ ] **Step 1: Manifest** with `display: standalone`, icons 192/512 and `share_target: { action: "/share", method: "GET", params: { title: "title", text: "text", url: "url" } }`.
- [ ] **Step 2: `/share` page** extracts the first Instagram URL from `url` or `text` params, posts it to `/api/reels`, shows "Saved to <Category>" or "Needs caption" with a paste box, then a button to open the app.
- [ ] **Step 3: Test:** `npm run build` passes; with a Playwright or vitest DOM test, `/share?text=https://www.instagram.com/reel/ABC123/?igsh=x` triggers one POST with the raw URL.
- [ ] **Step 4: Commit** `feat: pwa and share target`.

### Task 7: UI (collections, cards, search, review)

**Files:** Create `src/app/page.tsx`, `src/app/c/[id]/page.tsx`, `src/components/ReelCard.tsx`, `src/components/SearchBar.tsx`, `src/app/review/page.tsx`

- [ ] **Step 1: Home:** search bar on top, grid of collections with reel counts, "Review" pile highlighted when non-empty.
- [ ] **Step 2: ReelCard:** thumbnail, caption snippet, category chip, tap opens the Instagram URL in a new tab; separate "GitHub: user/repo" and "YouTube" buttons from extracted links; on Review items, a category dropdown to fix and a caption paste box for `pending` ones, via `PATCH /api/reels/[id]`.
- [ ] **Step 3: Search results** render collection (if matched) plus reel cards.
- [ ] **Step 4: Test:** component tests that ReelCard renders one anchor to the reel URL plus one per extracted link, and none when there are none. UI will be restyled later (user said so), so keep styling minimal.
- [ ] **Step 5: Commit** `feat: collections, cards, search UI`.

### Task 8: Bulk import of existing Saved tab

**Files:** Create `src/app/api/import/route.ts`, `scripts/saved-sweep.md` (the browser procedure); Test `src/lib/import.test.ts`

**Interfaces:** Produces `POST /api/import` taking `{ items: { url: string; caption?: string; thumbnail?: string }[] }`, processes in batches of 10, returns counts `{sorted, review, pending, duplicates}`.

- [ ] **Step 1: Failing tests:** 25 items with 3 duplicate URLs gives 3 duplicates counted; one item throwing does not stop the batch.
- [ ] **Step 2: Implement, run, confirm pass.**
- [ ] **Step 3: Sweep procedure (manual, run with the user logged in):** open Instagram Saved in the built-in browser, scroll to collect each reel URL, then visit each to read caption and thumbnail where possible, write results to a JSON file, and POST it to `/api/import`. Pace requests slowly and stop at any login challenge.
- [ ] **Step 4: Commit** `feat: bulk import`.

### Task 9: Deploy and verify end to end

- [ ] **Step 1:** Create the Vercel project and Postgres, set the four env vars (user supplies `ANTHROPIC_API_KEY` and chooses the passcode), apply `db/schema.sql`.
- [ ] **Step 2:** Deploy. Verify: login works, unauthenticated request redirects, sharing a real reel from the S24+ lands in a category, tapping opens Instagram, a caption with a GitHub link shows the button, searching "breakfast recipes" finds a food reel.
- [ ] **Step 3: Commit** `chore: deploy config`.

---

## Self-review notes
- Spec coverage: auto-sort, new categories, dedup, Review pile (T3), links (T2, T7), search and collection-name open (T5, T7), Instagram-like folders (T7), share target (T6), one-time import (T8), paste-caption fallback (T4, T7).
- Change from the design: search uses Claude keyword expansion plus Postgres full-text instead of embeddings, because Claude is the only AI provider.
