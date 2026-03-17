# AGENTS.md — Flo Social Worker

AI coding agents working in this repository should follow these rules.

## Project Overview

Automated Facebook posting for Flo's personal page. Pulls content from memory files, generates posts, and publishes via Facebook Graph API v19.0.

**Live Worker:** https://flo-social-worker.srvcflo.workers.dev  
**Facebook Page:** Flo (Atlas-OS AI)

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Database:** KV (state/tracking)
- **Storage:** R2 (blog content access)
- **AI:** Workers AI (content generation)
- **External API:** Facebook Graph API v19.0
- **Language:** TypeScript

## Project Structure

```
├── src/
│   ├── index.ts              # Main worker entry (Hono routes)
│   ├── facebook.ts           # Graph API integration
│   └── content-generator.ts  # Memory → post content
├── wrangler.toml             # Cloudflare config
└── .github/workflows/        # CI/CD
    ├── deploy.yml            # Auto-deploy on push
    └── daily-post.yml        # Scheduled posting
```

## Do

- Use Facebook Graph API v19.0 endpoints
- Store post tracking in KV (`STATE` binding)
- Parse memory files for highlight extraction
- Validate tokens before posting
- Return structured JSON responses
- Log errors with context for debugging

## Don't

- Don't hardcode Facebook tokens (use secrets)
- Don't post duplicate content (check KV first)
- Don't expose API endpoints without validation
- Don't store raw access tokens in logs
- Don't exceed Graph API rate limits

## Commands

```bash
# Local development
npm run dev

# Type check
npx tsc --noEmit

# Deploy to Cloudflare
npm run deploy
# or
npx wrangler deploy

# Set secrets
echo "TOKEN" | npx wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN
echo "PAGE_ID" | npx wrangler secret put FLO_FB_PAGE_ID

# Test endpoints
curl https://flo-social-worker.srvcflo.workers.dev/health
curl https://flo-social-worker.srvcflo.workers.dev/verify-token
```

## Safety & Permissions

**Allowed without asking:**
- Read/list files
- Type check
- Local dev server
- Health check endpoints

**Ask first:**
- npm install (new dependencies)
- wrangler deploy (production)
- wrangler secret put (credentials)
- Modifying Facebook API calls
- git push

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Worker health check |
| GET | `/verify-token` | Validate Facebook token |
| POST | `/post-facebook` | Manual post with message/link |
| POST | `/daily-update` | Generate post from memory files |
| GET | `/recent-posts` | List recent posts from KV |

## Environment

**Bindings:**
- `BLOG` — R2 bucket (minte-blog-prod)
- `STATE` — KV namespace (tracking)
- `AI` — Workers AI

**Secrets (via wrangler secret):**
- `FLO_FB_PAGE_ID` — Facebook Page ID
- `FLO_FB_PAGE_ACCESS_TOKEN` — Long-lived token
- `FLO_FB_APP_ID` — Meta App ID
- `FLO_FB_APP_SECRET` — Meta App Secret

## Content Generation

The `/daily-update` endpoint:
1. Reads memory files from workspace
2. Extracts highlights (shipped features, bugs fixed, etc.)
3. Formats into engaging post
4. Posts to Facebook
5. Tracks in KV to prevent duplicates

## Good Examples

- **API structure:** `src/index.ts` — Hono routing pattern
- **Graph API calls:** `src/facebook.ts` — Token handling, error responses
- **Content parsing:** `src/content-generator.ts` — Memory → highlights

## When Stuck

- Check Facebook Graph API docs: https://developers.facebook.com/docs/graph-api
- Verify token status at: https://developers.facebook.com/tools/debug/accesstoken
- Ask before modifying posting logic
- Don't guess at Graph API parameters

## PR Checklist

- [ ] TypeScript compiles
- [ ] No hardcoded tokens
- [ ] Test endpoints work locally
- [ ] GitHub Actions pass
- [ ] Small, focused diff
