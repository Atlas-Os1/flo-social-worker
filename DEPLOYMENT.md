# Deployment Guide

## Pre-Deployment Checklist

### 1. Facebook Page Setup (Tomorrow)
- [ ] Create Facebook Page for Flo
- [ ] Complete page profile (avatar, description)
- [ ] Publish page (make it public)
- [ ] Note down Page ID

### 2. Graph API Token
- [ ] Go to Graph API Explorer
- [ ] Select Meta App (879824491249046)
- [ ] Get Page Access Token
- [ ] Grant permissions: `pages_manage_posts`, `pages_read_engagement`
- [ ] Convert to long-lived token (60 days)
- [ ] Test token with `/verify-token` endpoint

### 3. Cloudflare Setup
- [ ] Create KV namespace: `wrangler kv:namespace create "STATE"`
- [ ] Update `wrangler.toml` with KV namespace ID
- [ ] Set secrets (see below)

## Setting Secrets

```bash
# Navigate to project
cd /home/flo/flo-social-worker

# Set Page ID (from Facebook Page)
echo "YOUR_PAGE_ID" | wrangler secret put FLO_FB_PAGE_ID

# Set Page Access Token (long-lived, 60 days)
echo "YOUR_LONG_LIVED_TOKEN" | wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN

# Set App ID (we already have this)
echo "879824491249046" | wrangler secret put FLO_FB_APP_ID

# Set App Secret (from Meta App dashboard)
echo "YOUR_APP_SECRET" | wrangler secret put FLO_FB_APP_SECRET

# Set scheduled posting bearer token and mirror it to GitHub Actions as FLO_SOCIAL_WORKER_TOKEN
echo "YOUR_RANDOM_POSTING_TOKEN" | wrangler secret put FLO_SOCIAL_WORKER_TOKEN
```

## Deploy Steps

### 1. Install Dependencies
```bash
npm ci
```

### 2. Run Tests
```bash
npm test
```

Should see:
```
✅ All tests passed!
```

### 3. Test Locally
```bash
npm run dev
```

In another terminal:
```bash
# Test status
curl http://localhost:8787/status

# Test with mock credentials
# (Will fail validation but shows worker is running)
```

### 4. Deploy to Production
```bash
npm run deploy
```

Expected output:
```
 ⛅️ wrangler 3.x.x
------------------
Uploaded flo-social-worker (x.xx KiB)
Published flo-social-worker (x.xx sec)
  https://flo-social-worker.your-account.workers.dev
```

### 5. Verify Deployment
```bash
# Check status
curl https://flo-social-worker.your-account.workers.dev/status

# Verify token
curl https://flo-social-worker.your-account.workers.dev/verify-token
```

Expected:
```json
{
  "success": true,
  "page_id": "YOUR_PAGE_ID",
  "page_name": "Flo"
}
```

### 6. Test First Post
```bash
curl -X POST https://flo-social-worker.your-account.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "[TEST] Hello from flo-social-worker! This is my first automated post. 🚀"
  }'
```

Expected:
```json
{
  "success": true,
  "post_id": "123456789_987654321",
  "facebook_url": "https://facebook.com/123456789/posts/987654321"
}
```

Check Facebook Page to verify post appeared!

## Integration with Blog Automation

### Option A: Call from Existing Cron
Add to blog automation cron (9:30 AM CST):

```typescript
// After blog post is published
const fbResponse = await fetch('https://flo-social-worker.your-account.workers.dev/daily-update', {
  method: 'POST'
});

if (!fbResponse.ok) {
  console.error('Failed to post to Facebook');
}
```

### Option B: Separate Cron Schedule
Add to `wrangler.toml`:

```toml
[triggers]
crons = ["30 15 * * *"]  # 9:30 AM CST (3:30 PM UTC)
```

Add scheduled handler to `src/index.ts`:

```typescript
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  console.log('[CRON] Running daily update');
  
  // Call daily-update internally
  const request = new Request('https://dummy/daily-update', {
    method: 'POST'
  });
  
  const response = await this.fetch(request, env);
  const result = await response.json();
  
  console.log('[CRON] Result:', result);
}
```

Then redeploy:
```bash
npm run deploy
```

### Option C: Manual Trigger via Clawdbot
Add to Clawdbot's daily automation:

```bash
# In Flo's daily automation script
curl -X POST https://flo-social-worker.your-account.workers.dev/daily-update
```

## Token Refresh Schedule

Page Access Tokens expire after 60 days. Set reminder to refresh:

### Manual Refresh (Every 30 Days)
```bash
# Get current token
CURRENT_TOKEN="your_current_token"

# Extend it
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=879824491249046&client_secret=YOUR_APP_SECRET&fb_exchange_token=$CURRENT_TOKEN"

# Update secret with new token
echo "NEW_TOKEN_FROM_RESPONSE" | wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN
```

### Automated Refresh (Recommended)
Add endpoint and cron:

1. Add to `wrangler.toml`:
```toml
[triggers]
crons = ["0 2 1,15 * *"]  # 1st and 15th at 2 AM UTC
```

2. Add handler in `src/index.ts`:
```typescript
if (path === '/refresh-token' && request.method === 'POST') {
  const result = await extendAccessToken(
    env.FLO_FB_PAGE_ACCESS_TOKEN,
    env.FLO_FB_APP_ID,
    env.FLO_FB_APP_SECRET
  );
  
  // Log new token (manually update secret)
  console.log('New token:', result.access_token);
  
  return Response.json({
    success: true,
    expires_in_days: Math.floor(result.expires_in / 86400),
    message: 'Token refreshed - update secret manually'
  });
}
```

## Monitoring

### Check Recent Posts
```bash
curl https://flo-social-worker.your-account.workers.dev/status
```

### View Worker Logs
```bash
wrangler tail flo-social-worker --format=pretty
```

### Facebook Page Activity Log
1. Go to your Facebook Page
2. Click "Activity" in left sidebar
3. See all posts and their status

## Troubleshooting

### Worker not responding
```bash
# Check deployment
wrangler deployments list

# View logs
wrangler tail flo-social-worker
```

### Secrets not set
```bash
# List secrets (shows names only, not values)
wrangler secret list

# Reset a secret
echo "NEW_VALUE" | wrangler secret put SECRET_NAME
```

### Token expired
```bash
# Get new token from Graph API Explorer
# Then update secret:
echo "NEW_TOKEN" | wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN
```

### Post failed but no error
Check:
- Facebook Page Activity Log (may be pending review)
- Token permissions (needs `pages_manage_posts`)
- Content meets Facebook Community Standards
- Worker logs: `wrangler tail flo-social-worker`

## Rollback

### Rollback to Previous Deployment
```bash
# List deployments
wrangler deployments list

# Rollback to specific version
wrangler rollback DEPLOYMENT_ID
```

### Disable Worker
```bash
# Update wrangler.toml routes to empty
# Or delete worker
wrangler delete flo-social-worker
```

## Post-Deployment

- [ ] Test posting works
- [ ] Integrate with blog automation
- [ ] Schedule token refresh
- [ ] Set up monitoring/alerts
- [ ] Document worker URL in TOOLS.md
- [ ] Update AGENTS.md with Facebook automation details

## Next Steps

1. **Tomorrow**: Create Facebook Page, get credentials
2. **Deploy**: Follow this guide step-by-step
3. **Test**: Post a test message
4. **Integrate**: Add to blog automation workflow
5. **Monitor**: Check daily posts for first week
6. **Iterate**: Adjust content generation based on results

## Success Criteria

- ✅ Worker deployed and accessible
- ✅ Token verification passes
- ✅ Test post appears on Facebook Page
- ✅ Daily update posts automatically
- ✅ Content quality is authentic and engaging
- ✅ Token refresh scheduled

When all criteria are met, mark as production-ready! 🚀
