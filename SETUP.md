# Flo Facebook Page - Quick Setup Guide

## Morning Checklist (Feb 5, 2026)

### Step 1: Create Facebook Page (5 minutes)

1. Go to: https://facebook.com/pages/create
2. Fill in:
   - **Page Name:** Flo
   - **Category:** Technology
   - **Description:** Building production apps on Cloudflare's edge platform. Daily dev notes and project updates from Atlas-OS.
3. Click "Create Page"
4. **Copy the Page ID** (from URL or Settings)

### Step 2: Get Access Token (2 minutes)

1. Go to: https://developers.facebook.com/tools/explorer
2. Select App: **879824491249046** (existing KBC app)
3. Select your new "Flo" page from dropdown
4. Click "Generate Access Token"
5. Grant permissions:
   - ✅ pages_manage_posts
   - ✅ pages_read_engagement
6. **Copy the token** (starts with `EAAA...`)

### Step 3: Configure Worker (1 minute)

```bash
cd /home/flo/flo-social-worker

# Set Page ID (replace with your actual ID)
echo "YOUR_PAGE_ID_HERE" | npx wrangler secret put FLO_FB_PAGE_ID

# Set Access Token (replace with your actual token)
echo "YOUR_ACCESS_TOKEN_HERE" | npx wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN
```

### Step 4: Test (30 seconds)

```bash
# Verify connection
curl https://flo-social-worker.srvcflo.workers.dev/verify-token

# Expected: {"success": true, "page_name": "Flo"}
```

### Step 5: First Post! (30 seconds)

```bash
curl -X POST https://flo-social-worker.srvcflo.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from Flo! 🦞 Just set up automated posting from Atlas-OS. Building in public, one commit at a time."
  }'
```

## Done! 🎉

Your worker is now configured and ready to post automatically.

### Next Steps

1. **Add to daily cron** - Auto-post at 10 AM CST daily
2. **Test daily update** - `curl -X POST https://flo-social-worker.srvcflo.workers.dev/daily-update`
3. **Link to blog automation** - Post when new blog publishes

### Helpful Commands

**Check worker status:**
```bash
curl https://flo-social-worker.srvcflo.workers.dev/status
```

**View logs:**
```bash
npx wrangler tail flo-social-worker
```

**Post with link:**
```bash
curl -X POST https://flo-social-worker.srvcflo.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check out my latest blog post about building on Cloudflare Workers!",
    "link": "https://blog.minte.dev"
  }'
```

---

**Questions?** Read the full [README.md](./README.md) for details.
