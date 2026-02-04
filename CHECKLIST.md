# flo-social-worker - Verification Checklist

## Development Complete ✅

### Files Created
- [x] `src/index.ts` - Main worker (11 KB)
- [x] `src/facebook.ts` - Graph API integration (5 KB)
- [x] `src/content-generator.ts` - Content generation (6 KB)
- [x] `test/test-runner.js` - Test suite (6 KB)
- [x] `package.json` - Dependencies
- [x] `tsconfig.json` - TypeScript config
- [x] `wrangler.toml` - Worker config
- [x] `.gitignore` - Git ignore rules

### Documentation Created
- [x] `README.md` - Main documentation (9.5 KB)
- [x] `DEPLOYMENT.md` - Deployment guide (7 KB)
- [x] `EXAMPLES.md` - Usage examples (10 KB)
- [x] `SECRETS.md` - Secret configuration (7 KB)
- [x] `SETUP.md` - Quick setup guide (2.4 KB)
- [x] `PROJECT_SUMMARY.md` - Project overview (9.4 KB)
- [x] `CHECKLIST.md` - This file

### Features Implemented
- [x] POST /post-facebook - Manual posting
- [x] POST /daily-update - Auto-generate from memory
- [x] GET /status - Health check
- [x] GET /verify-token - Credential verification
- [x] CORS support
- [x] Content validation
- [x] Token refresh mechanism
- [x] Error handling

### Testing
- [x] Test suite created
- [x] All tests pass (4/4)
- [x] Mocked Facebook API
- [x] No real API calls required

---

## Pre-Deployment (Tomorrow)

### Facebook Page Setup
- [ ] Create Facebook Page for Flo
  - [ ] Name: "Flo" or preferred name
  - [ ] Category: Technology / Personal Blog
  - [ ] Description written
  - [ ] Avatar uploaded
  - [ ] Page published (not draft)
- [ ] Copy Page ID

### Get Credentials
- [ ] Go to Graph API Explorer
- [ ] Select Meta App (879824491249046)
- [ ] Get Page Access Token
  - [ ] Grant `pages_manage_posts` permission
  - [ ] Grant `pages_read_engagement` permission
- [ ] Convert to long-lived token (60 days)
- [ ] Verify token works
- [ ] Get App Secret from Meta Developers

---

## Deployment Steps

### 1. Install Dependencies
```bash
cd /home/flo/flo-social-worker
npm install
```
- [ ] npm install successful
- [ ] No errors in output

### 2. Create KV Namespace
```bash
npx wrangler kv:namespace create "STATE"
```
- [ ] KV namespace created
- [ ] Copy namespace ID
- [ ] Update `wrangler.toml` with real KV ID
- [ ] Replace `placeholder_kv_id` with actual ID

### 3. Set Secrets
```bash
# Page ID
echo "YOUR_PAGE_ID" | npx wrangler secret put FLO_FB_PAGE_ID

# Page Access Token (long-lived)
echo "YOUR_LONG_LIVED_TOKEN" | npx wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN

# App ID (already have: 879824491249046)
echo "879824491249046" | npx wrangler secret put FLO_FB_APP_ID

# App Secret (from Meta Developers)
echo "YOUR_APP_SECRET" | npx wrangler secret put FLO_FB_APP_SECRET
```
- [ ] FLO_FB_PAGE_ID set
- [ ] FLO_FB_PAGE_ACCESS_TOKEN set
- [ ] FLO_FB_APP_ID set
- [ ] FLO_FB_APP_SECRET set

### 4. Verify Secrets
```bash
npx wrangler secret list
```
- [ ] All 4 secrets listed
- [ ] No errors

### 5. Deploy Worker
```bash
npm run deploy
```
- [ ] Deployment successful
- [ ] Worker URL received
- [ ] No errors in output

---

## Post-Deployment Verification

### 6. Test Status Endpoint
```bash
curl https://flo-social-worker.YOUR_ACCOUNT.workers.dev/status
```
Expected response:
```json
{
  "service": "flo-social-worker",
  "status": "running",
  "configured": true
}
```
- [ ] Status endpoint returns 200
- [ ] `configured: true` in response
- [ ] All credentials show as "set"

### 7. Verify Token
```bash
curl https://flo-social-worker.YOUR_ACCOUNT.workers.dev/verify-token
```
Expected response:
```json
{
  "success": true,
  "page_id": "123456789",
  "page_name": "Flo"
}
```
- [ ] Token verification returns success
- [ ] Page name matches
- [ ] No error messages

### 8. Test Post (First Post!)
```bash
curl -X POST https://flo-social-worker.YOUR_ACCOUNT.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "[TEST] Hello from flo-social-worker! This is my first automated post. 🚀"
  }'
```
Expected response:
```json
{
  "success": true,
  "post_id": "123456789_987654321",
  "facebook_url": "https://facebook.com/..."
}
```
- [ ] Post endpoint returns success
- [ ] Post ID received
- [ ] Facebook URL returned
- [ ] **Check Facebook Page - post appeared!**

### 9. Test Daily Update
```bash
curl -X POST https://flo-social-worker.YOUR_ACCOUNT.workers.dev/daily-update
```
- [ ] Daily update endpoint works
- [ ] Content generated
- [ ] Post appeared on Facebook

---

## Integration

### 10. Add to Blog Automation
Choose one:

**Option A: Manual trigger after blog publish**
- [ ] Add curl command to blog automation script

**Option B: Scheduled cron**
- [ ] Add cron to `wrangler.toml`
- [ ] Add scheduled handler to `index.ts`
- [ ] Redeploy worker
- [ ] Verify cron runs

**Option C: Call from Clawdbot**
- [ ] Document worker URL in TOOLS.md
- [ ] Test manual trigger from agent

Integration chosen: _______________
- [ ] Integration implemented
- [ ] Tested successfully

---

## Maintenance Setup

### 11. Token Refresh Reminder
- [ ] Set calendar reminder for 30 days
- [ ] Document current token expiration date
- [ ] Bookmark Graph API Explorer
- [ ] Save token refresh commands

Token expires: _______________ (60 days from setup)
Next refresh: _______________ (30 days from setup)

### 12. Monitoring
- [ ] Bookmark worker URL
- [ ] Save wrangler tail command
- [ ] Test log viewing: `npx wrangler tail flo-social-worker`
- [ ] Set up alerts (optional)

---

## Documentation Updates

### 13. Update TOOLS.md
Add to `/home/flo/clawd/TOOLS.md`:

```markdown
## Facebook Posting (flo-social-worker)

**Worker URL:** https://flo-social-worker.YOUR_ACCOUNT.workers.dev
**Page:** https://facebook.com/YOUR_PAGE_ID
**Status:** Production

### Quick Commands
```bash
# Check status
curl https://flo-social-worker.YOUR_ACCOUNT.workers.dev/status

# Post manually
curl -X POST https://flo-social-worker.YOUR_ACCOUNT.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{"message": "Your message here"}'

# Daily update
curl -X POST https://flo-social-worker.YOUR_ACCOUNT.workers.dev/daily-update
```

### Token Refresh
Every 30 days, refresh token:
1. Go to Graph API Explorer
2. Get new Page Access Token
3. `echo "NEW_TOKEN" | npx wrangler secret put FLO_FB_PAGE_ACCESS_TOKEN`
```

- [ ] TOOLS.md updated
- [ ] Commands tested from docs

---

## Success Criteria

### All must be checked before marking as PRODUCTION READY:

**Development**
- [x] Code complete
- [x] Tests pass
- [x] Documentation complete
- [x] No TODOs in code

**Deployment**
- [ ] Worker deployed
- [ ] All secrets set
- [ ] KV namespace created
- [ ] Bindings configured

**Verification**
- [ ] Status endpoint works
- [ ] Token verification passes
- [ ] Test post successful
- [ ] Post visible on Facebook

**Integration**
- [ ] Integrated with blog/automation
- [ ] Tested end-to-end
- [ ] Monitoring in place
- [ ] Token refresh scheduled

**Documentation**
- [ ] TOOLS.md updated
- [ ] Team knows how to use
- [ ] Troubleshooting guide accessible
- [ ] Credentials backed up securely

---

## Rollback Plan

If something goes wrong:

### During Deployment
```bash
# Cancel deployment
Ctrl+C during deploy

# Or rollback
npx wrangler rollback
```

### After Deployment
```bash
# Delete secrets if needed
npx wrangler secret delete SECRET_NAME

# Delete worker
npx wrangler delete flo-social-worker

# Redeploy from scratch
npm run deploy
```

---

## Support Resources

**Documentation:**
- README.md - General usage
- EXAMPLES.md - Code examples  
- SECRETS.md - Credential setup
- DEPLOYMENT.md - Full deployment guide

**External:**
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Meta Developers](https://developers.facebook.com/apps/)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [Wrangler Docs](https://developers.cloudflare.com/workers/wrangler/)

**Logs:**
```bash
npx wrangler tail flo-social-worker --format=pretty
```

---

## Final Sign-Off

Date deployed: _______________  
Deployed by: _______________  
Worker URL: _______________  
Facebook Page: _______________  
First post ID: _______________  

Status: ⬜ READY FOR DEPLOYMENT | ⬜ DEPLOYED | ⬜ PRODUCTION

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

**Everything working?** ✅  
**Ready to post daily?** 🚀  
**Building in public!** 🦞
