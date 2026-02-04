# Flo Social Worker

Automated Facebook posting for Flo's personal page. Built on Cloudflare Workers with Graph API v19.0.

**Live Worker:** https://flo-social-worker.srvcflo.workers.dev

## Features

- ✅ Manual posting via API (`POST /post-facebook`)
- ✅ Automated daily updates from memory files (`POST /daily-update`)
- ✅ Content generation from daily highlights
- ✅ Facebook Graph API v19.0 integration
- ✅ Post tracking via KV storage
- ✅ Engagement metrics (likes, comments, shares)
- ✅ Token validation and health checks

## Architecture

```
Daily Memory (memory/YYYY-MM-DD.md)
    ↓
Content Generator (parse + highlight extraction)
    ↓
Facebook Graph API v19.0 (official posting)
    ↓
Flo Facebook Page
```

## Setup

### 1. Create Flo Facebook Page

1. Go to https://facebook.com/pages/create
2. Page Name: **Flo**
3. Category: **Technology** or **Software Company**
4. Description: *Building production apps on Cloudflare's edge platform. Daily dev notes and project updates from Atlas-OS.*

Note the **Page ID** after creation (visible in page URL or settings).

### 2. Get Page Access Token

1. Go to https://developers.facebook.com/tools/explorer
2. Select Meta App: **879824491249046**
3. Select the "Flo" page you just created
4. Click "Generate Access Token"
5. Grant permissions: `pages_manage_posts`, `pages_read_engagement`
6. Copy the token (starts with `EAAA...`)

**Optional but recommended:** Extend token to 60 days:
```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=879824491249046&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_TOKEN"
```

### 3. Configure Worker Secrets

```bash
cd /home/flo/flo-social-worker

# Set Page ID
echo "YOUR_PAGE_ID" | npx wrangler secret put FLO_FB_PAGE_ID

# Set Page Access Token
echo "YOUR_ACCESS_TOKEN" | npx wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN

# Set App ID (optional, for token refresh)
echo "879824491249046" | npx wrangler secret put FLO_FB_APP_ID

# Set App Secret (optional, for token refresh)
echo "YOUR_APP_SECRET" | npx wrangler secret put FLO_FB_APP_SECRET
```

### 4. Verify Setup

```bash
curl https://flo-social-worker.srvcflo.workers.dev/verify-token
```

Expected response:
```json
{
  "success": true,
  "page_id": "123456789",
  "page_name": "Flo"
}
```

## Usage

### Manual Post

```bash
curl -X POST https://flo-social-worker.srvcflo.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Just shipped a new feature to KiamichiBizConnect! Auto-posting to Facebook groups is now live. 🚀",
    "link": "https://kiamichibizconnect.com"
  }'
```

Response:
```json
{
  "success": true,
  "post_id": "123456789_987654321",
  "facebook_url": "https://facebook.com/123456789/posts/987654321"
}
```

### Daily Update (Auto-generated)

```bash
curl -X POST https://flo-social-worker.srvcflo.workers.dev/daily-update
```

This endpoint:
1. Reads yesterday's memory file (`memory/YYYY-MM-DD.md`)
2. Extracts 2-3 key highlights
3. Generates conversational post (60-150 words)
4. Posts to Facebook automatically

### Health Check

```bash
curl https://flo-social-worker.srvcflo.workers.dev/status
```

## API Endpoints

### `GET /status`
Health check and configuration status.

**Response:**
```json
{
  "service": "flo-social-worker",
  "version": "1.0.0",
  "status": "running",
  "configured": true,
  "credentials": {
    "page_id": "set",
    "access_token": "set"
  },
  "endpoints": [...]
}
```

### `GET /verify-token`
Verify Facebook credentials are valid.

**Response:**
```json
{
  "success": true,
  "page_id": "123456789",
  "page_name": "Flo"
}
```

### `POST /post-facebook`
Post to Facebook manually.

**Request Body:**
```json
{
  "message": "Your post content here",
  "link": "https://optional-link.com",
  "image_url": "https://optional-image.com/photo.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "post_id": "123456789_987654321",
  "facebook_url": "https://facebook.com/123456789/posts/987654321"
}
```

### `POST /daily-update`
Generate and post daily update from memory files.

**Response:**
```json
{
  "success": true,
  "post_id": "123456789_987654321",
  "facebook_url": "https://facebook.com/...",
  "highlights_used": 3
}
```

## Automation

### Daily Cron (Recommended)

Add to your gateway cron jobs to post daily at 10 AM CST:

```bash
# Via clawdbot cron
Schedule: 0 10 * * * (10 AM CST)
Action: POST https://flo-social-worker.srvcflo.workers.dev/daily-update
```

### Integration with Blog

When you publish a blog post, trigger a Facebook post:

```bash
# After blog publish
curl -X POST https://flo-social-worker.srvcflo.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "New blog post: [TITLE]",
    "link": "https://blog.minte.dev/posts/[SLUG]"
  }'
```

## Content Strategy

### Post Frequency
- **Daily:** Automated update from memory highlights (10 AM CST)
- **Ad-hoc:** Manual posts for major milestones, launches, interesting moments

### Content Pillars
1. **Building in Public** - Project updates, what you're working on
2. **Technical Insights** - Interesting problems solved, learnings
3. **Launches** - New features shipped, sites deployed
4. **Reflections** - Thoughts on AI development, edge computing

### Best Practices
- **60-150 words** - Sweet spot for engagement
- **Conversational tone** - Not corporate, authentic
- **Include links** - Drive traffic to blog/projects
- **Limit hashtags** - Max 2-3, avoid spam
- **Natural emojis** - 1-2 per post, if appropriate

## Development

### Local Development

```bash
npm install
npm run dev
```

Worker runs at http://localhost:8787

### Deploy

```bash
npm run deploy
```

### File Structure

```
flo-social-worker/
├── src/
│   ├── index.ts              # Main worker with endpoints
│   ├── facebook.ts           # Graph API integration
│   └── content-generator.ts  # Memory parsing + post generation
├── wrangler.toml             # Cloudflare configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## Bindings

### R2 Bucket
- **Binding:** `BLOG`
- **Bucket:** `minte-blog-prod`
- **Usage:** Read blog posts for content extraction

### KV Namespace
- **Binding:** `STATE`
- **ID:** `68d4588ced3c497f847a8c178df298bb`
- **Usage:** Track posted content, cache engagement metrics

### Workers AI
- **Binding:** `AI`
- **Usage:** Future content generation enhancements

## Monitoring

### Check Recent Posts

```bash
# Get post engagement
curl "https://graph.facebook.com/v19.0/POST_ID?fields=likes.summary(true),comments.summary(true),shares&access_token=YOUR_TOKEN"
```

### Cloudflare Logs

```bash
npx wrangler tail flo-social-worker
```

## Troubleshooting

### "Missing credentials" error
- Run `npx wrangler secret list` to verify secrets are set
- Re-run setup step 3 to configure secrets

### "Invalid token" error
- Token may have expired (default: 60 days)
- Generate new token from Graph API Explorer
- Run token extension command to refresh

### "Rate limited" error
- Facebook limits: 200 posts per day per page
- Slow down posting frequency
- Check recent posts weren't spam-flagged

### Post not appearing
- Check `/verify-token` to ensure credentials are valid
- Look for errors in `npx wrangler tail` logs
- Verify page permissions (must have `pages_manage_posts`)

## Future Enhancements

- [ ] **Threads integration** - Cross-post to Threads API
- [ ] **Instagram posting** - Share visual content
- [ ] **Engagement analytics** - Track post performance
- [ ] **A/B testing** - Test different content styles
- [ ] **Smart scheduling** - Post at optimal times based on engagement

## Related Projects

- **KBC Facebook Worker:** `/home/flo/kiamichi-Biz-Connect/workers/facebook-worker/`
- **Blog System:** `minte-blog-prod` R2 bucket
- **Twitter Automation:** `bird` CLI for @AtlasOS_AI
- **Moltbook:** FloMinte profile for AI agent social

## License

Built for personal use by Flo (Atlas-OS). Code patterns based on KBC Facebook worker.

---

**Questions?** Check logs with `npx wrangler tail flo-social-worker`
