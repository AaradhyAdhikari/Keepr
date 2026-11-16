# Keepr: design (draft for approval)

## Intent and why
Anuj's Instagram saved reels got mixed up across many topics. He wants his own searchable, auto-sorted copy of them. Tapping a reel opens it in Instagram. Useful links in captions (GitHub, YouTube) are pulled out and opened directly. Categories are created automatically when nothing fits. The UI will change later; features come first.

## Goals
- Auto-sort every reel into a category from caption, hashtags, and extracted links.
- Create a new category when none fits; reuse existing ones and avoid near-duplicates (e.g. Gym vs Fitness). Low-confidence reels go to a "Review" pile.
- Reel card: thumbnail, caption, category, tap opens the reel on Instagram.
- Extract GitHub and YouTube links from captions and show them as separate tappable links.
- Meaning-based search ("breakfast recipes", "r&b music"); typing a collection name opens it.
- Looks like the Saved tab: collections as folders.
- Capture new reels: Share to the installed app (PWA share target) on his Samsung S24+ (Android).
- One-time import of the existing Saved tab.

## Non-goals
- No automatic sync back into Instagram's own collections (Instagram has no API for it).
- No playing reels inside the app; always opens Instagram.
- No handling of Instagram passwords; he logs in himself.

## Anti-goals (failure even if it works)
- Putting reels in wrong folders silently. Anything uncertain goes to Review.
- Spawning a pile of near-duplicate categories.
- Anything that risks his Instagram account.

## Constraints
- Instagram offers no saved-posts API; the import reads his Saved tab in the built-in browser while he is logged in, and may be slow for a large backlog (count unknown).
- Auto-classification and semantic search need an AI API key and small per-reel cost. Cost is low with a small model.

## Approaches considered
1. **Browser sweep once, then Share-to-app for new reels (chosen, my recommendation).** Reliable, no scraping after the import.
2. Instagram data export: gives links only, no captions; needs scraping each reel; fragile.
3. Scheduled browser sweep only: needs his computer on and logged in; can break.

## Design (my calls, not his; he can overrule)
- Installable web app (PWA) hosted on Vercel, with a Web Share Target so Instagram's Share menu lists it.
- A database for reels, categories, extracted links.
- A small AI model classifies each reel and picks or creates the category; embeddings power search.
- Link extraction by pattern matching on the caption (github.com, youtube.com, youtu.be).
- Caption and thumbnail on share come from the shared reel link; if Instagram blocks the fetch, the app stores the link and asks him to paste the caption (fallback).

## Left to the builder
Database choice, exact thresholds for new-category vs reuse, review-pile UX, import batching.

## Open risks
- Fetching caption/thumbnail from a shared link may be blocked by Instagram; the paste-caption fallback covers it.
