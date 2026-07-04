# Secrets Configuration

This document explains all secrets required for flo-social-worker and how to obtain them.

## Required Secrets

### 1. FLO_FB_PAGE_ID

**What**: Your Facebook Page's unique identifier

**How to get**:

**Option A: From Graph API Explorer**
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Enter query: `me/accounts`
4. Click "Submit"
5. Find your page in results, copy the `id` field

**Option B: From Page Settings**
1. Go to your Facebook Page
2. Click "About" in left sidebar
3. Scroll to "Page ID" or "Page Transparency"
4. Copy the numeric ID

**Example**: `123456789012345`

**Set with**:
```bash
echo "123456789012345" | wrangler secret put FLO_FB_PAGE_ID
```

---

### 2. FLO_FB_PAGE_ACCESS_TOKEN

**What**: Long-lived access token for posting to your page (valid 60 days)

**How to get**:

**Step 1: Get short-lived token**
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your Meta App (ID: 879824491249046)
3. Click "Get Token" → "Get Page Access Token"
4. Select your page from dropdown
5. Grant permissions:
   - ✅ `pages_manage_posts` (required for posting)
   - ✅ `pages_read_engagement` (optional, for analytics)
6. Copy the access token

**Step 2: Convert to long-lived token (60 days)**
```bash
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

Replace:
- `YOUR_APP_ID`: 879824491249046
- `YOUR_APP_SECRET`: Get from Meta App dashboard
- `SHORT_LIVED_TOKEN`: Token from Step 1

**Response**:
```json
{
  "access_token": "EAAMb...(very long string)...ZD",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

Copy the `access_token` value.

**Step 3: Verify token works**
```bash
curl "https://graph.facebook.com/v19.0/YOUR_PAGE_ID?access_token=YOUR_LONG_LIVED_TOKEN"
```

Should return page info without errors.

**Set with**:
```bash
echo "YOUR_LONG_LIVED_TOKEN" | wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN
```

**Note**: This token expires after 60 days. Set a reminder to refresh it monthly.

---

### 3. FLO_FB_APP_ID

**What**: Meta App ID for your Facebook application

**We already have this**: `879824491249046`

**How to verify**:
1. Go to [Meta Developers](https://developers.facebook.com/apps/)
2. Select your app
3. Copy "App ID" from dashboard

**Set with**:
```bash
echo "879824491249046" | wrangler secret put FLO_FB_APP_ID
```

---

### 4. FLO_SOCIAL_WORKER_TOKEN

**What**: Shared bearer token for authenticated scheduled posting requests. `GET /preview-daily-update` and `POST /daily-update?dryRun=1` do not post and do not require this token; real `POST /daily-update` requests require it.

**Set in Cloudflare Worker**:
```bash
echo "YOUR_RANDOM_POSTING_TOKEN" | wrangler secret put FLO_SOCIAL_WORKER_TOKEN
```

**Set in GitHub Actions**:
```bash
gh secret set FLO_SOCIAL_WORKER_TOKEN -R Atlas-Os1/flo-social-worker
```

Use the same random value in both places. Do not commit or print the value.

---

### 5. FLO_FB_APP_SECRET

**What**: Meta App Secret for token management

**How to get**:
1. Go to [Meta Developers](https://developers.facebook.com/apps/)
2. Select your app (879824491249046)
3. Go to Settings → Basic
4. Copy "App Secret" (click "Show")

**⚠️ Security**: Never commit this to git or share publicly!

**Set with**:
```bash
echo "your_app_secret_here" | wrangler secret put FLO_FB_APP_SECRET
```

---

## Verification Checklist

After setting all secrets, verify:

### 1. Secrets are set
```bash
wrangler secret list
```

Should show:
```
FLO_FB_PAGE_ID
FLO_FB_PAGE_ACCESS_TOKEN
FLO_FB_APP_ID
FLO_FB_APP_SECRET
FLO_SOCIAL_WORKER_TOKEN
```

### 2. Token is valid
```bash
curl https://flo-social-worker.your-account.workers.dev/verify-token
```

Should return:
```json
{
  "success": true,
  "page_id": "123456789",
  "page_name": "Flo"
}
```

### 3. Can post
```bash
curl -X POST https://flo-social-worker.your-account.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{"message": "[TEST] Verification post from flo-social-worker"}'
```

Should return:
```json
{
  "success": true,
  "post_id": "123_456",
  "facebook_url": "https://facebook.com/..."
}
```

Check your Facebook Page - post should appear!

---

## Token Refresh Schedule

Page Access Tokens expire after 60 days. Refresh them regularly:

### Manual Refresh (Recommended: Every 30 days)

1. **Get current token from secrets** (can't retrieve, so use backup)
2. **Extend token**:
```bash
curl -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=879824491249046&client_secret=YOUR_APP_SECRET&fb_exchange_token=CURRENT_TOKEN"
```

3. **Update secret**:
```bash
echo "NEW_TOKEN" | wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN
```

4. **Verify**:
```bash
curl https://flo-social-worker.your-account.workers.dev/verify-token
```

### Automatic Refresh (Future Enhancement)

Add endpoint to worker that:
1. Extends current token
2. Logs new token (for manual update)
3. Alerts when token will expire soon

Schedule this monthly via cron.

---

## Security Best Practices

### ✅ DO:
- Store secrets using `wrangler secret put` (encrypted at rest)
- Refresh tokens before they expire
- Keep App Secret private
- Use long-lived tokens (60 days)
- Monitor token expiration

### ❌ DON'T:
- Commit secrets to git
- Share tokens publicly
- Use user tokens (use Page tokens)
- Let tokens expire without renewal
- Hardcode secrets in code

---

## Troubleshooting

### "Invalid token" error
- Token expired → Refresh following steps above
- Wrong token → Verify you're using Page Access Token, not User token
- Wrong permissions → Regenerate token with correct permissions

### "Invalid OAuth access token"
- Token malformed → Check for spaces/newlines when setting secret
- Token for wrong page → Verify PAGE_ID matches token's page

### "This person isn't available right now"
- Page unpublished → Publish page in Settings
- Page deleted → Create new page

### Can't get Page Access Token
- Not Page admin → Get admin access to page
- App not linked to page → Add app to page in Meta Business Suite

---

## Backup & Recovery

### Save Token Safely
After generating long-lived token, store a backup:

```bash
# Save to encrypted file (not in git!)
echo "LONG_LIVED_TOKEN" > ~/secrets/flo-facebook-token.txt
chmod 600 ~/secrets/flo-facebook-token.txt
```

### Recovery Steps
If secrets are lost:
1. Generate new tokens following steps above
2. Set secrets again with `wrangler secret put`
3. Verify with `/verify-token` endpoint
4. Test with a post

---

## Quick Setup Script

```bash
#!/bin/bash
# setup-secrets.sh

echo "🔐 Setting up flo-social-worker secrets"
echo ""

read -p "Enter FLO_FB_PAGE_ID: " PAGE_ID
echo "$PAGE_ID" | wrangler secret put FLO_FB_PAGE_ID

read -p "Enter FLO_FB_PAGE_ACCESS_TOKEN: " PAGE_TOKEN
echo "$PAGE_TOKEN" | wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN

read -p "Enter FLO_FB_APP_ID [879824491249046]: " APP_ID
APP_ID=${APP_ID:-879824491249046}
echo "$APP_ID" | wrangler secret put FLO_FB_APP_ID

read -sp "Enter FLO_FB_APP_SECRET: " APP_SECRET
echo ""
echo "$APP_SECRET" | wrangler secret put FLO_FB_APP_SECRET

echo ""
echo "✅ Secrets set! Verifying..."
echo ""

curl https://flo-social-worker.your-account.workers.dev/verify-token

echo ""
echo "Done! Check output above for verification."
```

---

## Support

If you get stuck:
1. Check Meta App dashboard for errors
2. Use Graph API Explorer to test tokens manually
3. Review [Facebook Graph API docs](https://developers.facebook.com/docs/graph-api)
4. Check worker logs: `wrangler tail flo-social-worker`

---

**Last updated**: 2026-02-04  
**Token expires**: [Set reminder 30 days after setup]
