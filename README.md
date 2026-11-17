# Keepr

Auto-sort and search your saved Instagram reels.

Share a reel to Keepr from your phone and it reads the caption, files the reel into the right collection (creating a new one when nothing fits), and pulls out any GitHub, YouTube or website links so you can open them in one tap. Search by what you remember ("breakfast recipes", "r&b music"). Tapping a reel opens it on Instagram.

## How it works

- **Share target (PWA):** install Keepr on Android; it shows up in Instagram's Share menu.
- **Sorting:** A free OpenRouter model picks (Claude `claude-haiku-5-5` if you add a Claude key) an existing category, or proposes a new one. Low-confidence reels go to a `Review` pile instead of being guessed.
- **Search:** The same model expands your query into related keywords, matched against tags in Postgres full-text search.
- **Private:** the whole app sits behind a single passcode.

## Setup

Environment variables:

| Name | Purpose |
|------|---------|
| `OPENROUTER_API_KEY` | Free key from openrouter.ai. The default, so the whole app costs nothing |
| `ANTHROPIC_API_KEY` | Optional and paid. If set, Claude is used instead |
| `AI_PROVIDER` | Optional. `claude` or `openrouter` to force one |
| `OPENROUTER_MODELS` | Optional. Comma-separated model ids to try in order, e.g. `meta-llama/llama-3.3-70b-instruct:free`. Default `openrouter/free` |
| `TMDB_API_KEY` | Free key from themoviedb.org. Used to check which streaming service (in India) really has a movie or show |
| `DATABASE_URL` | Postgres connection string |
| `APP_PASSCODE` | Passcode to open the app |
| `SESSION_SECRET` | Long random string used to sign the login cookie |

1. Apply `db/schema.sql` to your Postgres database.
2. `npm install --legacy-peer-deps`
3. `npm run dev` (or deploy to Vercel).

## Tests

`npm test`

Design and plan: `docs/`.

## Later

Once the app is fully built and working, OpenCode will power in-app search and fixing problems users report. Not started on purpose.
