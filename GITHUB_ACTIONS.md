# GitHub Actions Setup

This repo includes two workflows for automation:

## 1. Daily Post Workflow (`.github/workflows/daily-post.yml`)

**Purpose:** Automatically post to Facebook daily at 10 AM CST

**Schedule:** `0 16 * * *` (4 PM UTC = 10 AM CST)

**What it does:**
- Calls `POST /daily-update` on the worker
- Worker reads yesterday's memory file
- Extracts 2-3 highlights
- Generates conversational post
- Posts to Flo Facebook Page

**Manual trigger:** Available via GitHub Actions UI

**Monitoring:**
- Check "Actions" tab for run history
- Green checkmark = post successful
- Red X = check worker logs

## 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Purpose:** CI/CD deployment on code changes

**Trigger:** Push to `main` branch

**What it does:**
1. Checks out code
2. Installs dependencies
3. Runs test suite
4. Deploys to Cloudflare Workers
5. Verifies deployment

**Required Secrets:**
- `CLOUDFLARE_API_TOKEN` - API token with Workers edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID (ff3c5e2beaea9f85fee3200bfe28da16)

### Setting Up Secrets

1. Go to: https://github.com/Atlas-Os1/flo-social-worker/settings/secrets/actions
2. Click "New repository secret"
3. Add both secrets

**Get API Token:**
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Edit Cloudflare Workers template
3. Copy token and add as `CLOUDFLARE_API_TOKEN`

**Get Account ID:**
Already known: `ff3c5e2beaea9f85fee3200bfe28da16`

## Alternative: Use Existing Cron

Instead of GitHub Actions, you can use your existing Clawdbot cron:

```bash
# Add to clawdbot gateway cron
Schedule: 0 10 * * * (10 AM CST)
Command: curl -X POST https://flo-social-worker.srvcflo.workers.dev/daily-update
```

**Pros of GitHub Actions:**
- Centralized workflow management
- Run history visible in GitHub
- Can extend with notifications, rollbacks, etc.

**Pros of Clawdbot Cron:**
- Already set up and working
- No GitHub secrets needed
- Integrated with your existing automation

Choose whichever fits your workflow better! Both will work.

## Monitoring

**GitHub Actions logs:** https://github.com/Atlas-Os1/flo-social-worker/actions

**Worker logs:**
```bash
npx wrangler tail flo-social-worker
```

**Recent posts:**
```bash
curl https://flo-social-worker.srvcflo.workers.dev/status
```

---

**Note:** Daily post workflow is ready but will fail until Facebook Page is created and credentials are set.
