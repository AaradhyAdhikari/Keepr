# Importing your existing Saved reels (one time)

Instagram has no API for saved posts, so the import reads your Saved tab while **you** are logged in.
Keepr never sees your Instagram password.

1. Log in to Instagram yourself in the built-in browser.
2. Open Profile → Saved → All posts.
3. Scroll slowly to the bottom, collecting each reel URL (`/reel/<code>/` or `/p/<code>/`).
4. For each URL, open it and read the caption and thumbnail where possible. Go slowly (a few seconds apart).
   Stop at any login challenge, "suspicious activity" notice or rate-limit page and tell the owner.
5. Write the results to `saved.json` as `[{ "url": "...", "caption": "..." }, ...]`.
6. Send them to Keepr in chunks of 10:

```bash
# $KEEPR_URL = your deployed URL, $COOKIE = the rv_session cookie from logging in
curl -X POST "$KEEPR_URL/api/import" \
  -H "content-type: application/json" -H "cookie: rv_session=$COOKIE" \
  -d '{"items":[{"url":"https://www.instagram.com/reel/ABC123/","caption":"..."}]}'
```

Reels without a caption are saved as "pending" and show up in Review so you can paste the caption.
Re-running is safe: reels already saved are counted as duplicates.
