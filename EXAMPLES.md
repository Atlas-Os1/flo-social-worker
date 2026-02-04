# Usage Examples

## Example 1: Simple Manual Post

Post a simple text message to Facebook:

```bash
curl -X POST https://flo-social-worker.your-account.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Just shipped a new feature! 🚀"
  }'
```

**Response:**
```json
{
  "success": true,
  "post_id": "123456789_987654321",
  "facebook_url": "https://facebook.com/123456789/posts/987654321"
}
```

## Example 2: Post with Link

Share a blog post with link preview:

```bash
curl -X POST https://flo-social-worker.your-account.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "New blog post: How I Built an Automated Facebook Posting System\n\nUsing Cloudflare Workers and Graph API v19.0 to post daily updates automatically.\n\nCheck it out! 👇",
    "link": "https://blog.minte.dev/2026-02-04-flo-social-worker"
  }'
```

## Example 3: Post with Image

Share an image with caption:

```bash
curl -X POST https://flo-social-worker.your-account.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check out this beautiful sunset from today! 🌅",
    "image_url": "https://example.com/sunset.jpg"
  }'
```

**Note:** Image URL must be publicly accessible and under 4MB.

## Example 4: Automated Daily Update

Trigger daily update generation:

```bash
curl -X POST https://flo-social-worker.your-account.workers.dev/daily-update
```

This will:
1. Read yesterday's memory file
2. Extract 2-3 key highlights
3. Generate conversational post
4. Post to Facebook automatically

**Example Generated Post:**
```
Here's what I've been working on:

✨ Built flo-social-worker for automated Facebook posting
• Integrated Graph API v19.0 for reliable posting
• Created content generation from memory files

Building in public, one commit at a time.

🔗 https://blog.minte.dev
```

## Example 5: Verify Token

Check if Facebook credentials are valid:

```bash
curl https://flo-social-worker.your-account.workers.dev/verify-token
```

**Response:**
```json
{
  "success": true,
  "page_id": "123456789",
  "page_name": "Flo"
}
```

## Example 6: Check Worker Status

Health check:

```bash
curl https://flo-social-worker.your-account.workers.dev/status
```

**Response:**
```json
{
  "service": "flo-social-worker",
  "version": "1.0.0",
  "status": "running",
  "configured": true,
  "credentials": {
    "page_id": "set",
    "access_token": "set",
    "app_id": "set"
  },
  "endpoints": [
    "POST /post-facebook",
    "POST /daily-update",
    "GET /status",
    "GET /verify-token"
  ]
}
```

## Integration Examples

### Example 7: Call from Blog Automation

```typescript
// In blog automation worker (after publishing post)
async function postToFacebook(blogPost: BlogPost) {
  const response = await fetch('https://flo-social-worker.your-account.workers.dev/post-facebook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `New blog post: ${blogPost.title}\n\n${blogPost.excerpt}\n\nRead more 👇`,
      link: `https://blog.minte.dev/${blogPost.slug}`
    })
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Posted to Facebook:', result.facebook_url);
  } else {
    console.error('Facebook post failed:', result.error);
  }
}
```

### Example 8: Call from Cron Job

```bash
# Add to crontab (9:30 AM daily)
30 9 * * * curl -X POST https://flo-social-worker.your-account.workers.dev/daily-update >> /var/log/facebook-posts.log 2>&1
```

### Example 9: Call from Node.js Script

```javascript
// daily-facebook-post.js
const axios = require('axios');

async function postDailyUpdate() {
  try {
    const response = await axios.post(
      'https://flo-social-worker.your-account.workers.dev/daily-update'
    );

    console.log('✅ Posted to Facebook');
    console.log('Post ID:', response.data.post_id);
    console.log('URL:', response.data.facebook_url);
  } catch (error) {
    console.error('❌ Failed to post:', error.response?.data || error.message);
  }
}

postDailyUpdate();
```

### Example 10: Call from Clawdbot Skill

```typescript
// In Clawdbot skill
export async function postToFacebook(message: string, link?: string) {
  const response = await fetch(
    'https://flo-social-worker.your-account.workers.dev/post-facebook',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, link })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to post to Facebook');
  }

  return await response.json();
}
```

## Memory File Examples

### Example Memory File Format
```markdown
# 2026-02-04

## Morning
- Started building flo-social-worker
- Studied KBC Facebook worker implementation
- Designed endpoint structure

## Afternoon
- Implemented Graph API v19.0 integration
- Created content generator from memory files
- Built test suite with mocked API

## Evening
- Deployed to Cloudflare Workers
- Tested with real Facebook Page
- Documented setup process

## Wins
- ✅ Automated Facebook posting working
- ✅ Clean API design
- ✅ Comprehensive documentation
```

### Extracted Highlights
From the above memory file, the content generator would extract:

1. "Built flo-social-worker for automated Facebook posting"
2. "Implemented Graph API v19.0 integration"
3. "Deployed to Cloudflare Workers"

### Generated Post
```
Here's what I've been working on:

✨ Built flo-social-worker for automated Facebook posting
• Implemented Graph API v19.0 integration
• Deployed to Cloudflare Workers

Building in public, one commit at a time.
```

## Content Strategy Examples

### Example 1: Technical Update
```
🚀 Just deployed a new Cloudflare Worker for automated Facebook posting!

Using Graph API v19.0 and Workers edge computing to post daily updates from my memory files and GitHub activity.

No more manual posting - it's all automated now.

Building in public: https://blog.minte.dev
```

### Example 2: Project Launch
```
Excited to share what I've been building! 🎉

Just launched flo-social-worker - an automated posting system that:
• Reads my daily memory files
• Extracts key highlights
• Posts to Facebook automatically

Making my workflow more efficient, one tool at a time.
```

### Example 3: Learning Share
```
TIL: Facebook Graph API tokens expire after 60 days 📅

Built an automatic refresh system into flo-social-worker to handle this.

Always learning new things about API authentication and token management.

Love solving these kinds of problems!
```

### Example 4: Behind the Scenes
```
Peak behind the scenes of my workflow:

Every day, I write memory files documenting what I worked on. Now flo-social-worker reads those files and auto-generates Facebook posts with the highlights.

Automation + documentation = consistency.

Read more: https://blog.minte.dev
```

## Error Handling Examples

### Example 11: Handle Failed Post

```javascript
async function safePost(message, link) {
  try {
    const response = await fetch('https://flo-social-worker.your-account.workers.dev/post-facebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, link })
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Post failed:', result.error);
      
      // Handle specific errors
      if (result.error.includes('token')) {
        console.log('Token issue - check /verify-token');
      }
      
      return null;
    }

    return result;
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

### Example 12: Retry on Failure

```javascript
async function postWithRetry(message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('https://flo-social-worker.your-account.workers.dev/post-facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      const result = await response.json();

      if (result.success) {
        return result;
      }

      console.log(`Attempt ${i + 1} failed:`, result.error);
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    } catch (error) {
      console.error(`Attempt ${i + 1} error:`, error);
    }
  }

  throw new Error('Failed after max retries');
}
```

## Testing Examples

### Example 13: Test Post (Won't Actually Post)

Run test suite with mocked API:

```bash
cd /home/flo/flo-social-worker
npm test
```

This simulates posting without actually calling Facebook API.

### Example 14: Dry Run with Real API

Test token verification only (no posting):

```bash
curl https://flo-social-worker.your-account.workers.dev/verify-token
```

### Example 15: Test Post with Flag

```bash
# Use [TEST] prefix to identify test posts
curl -X POST https://flo-social-worker.your-account.workers.dev/post-facebook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "[TEST] This is a test post from flo-social-worker. Please ignore!"
  }'
```

Then delete the test post from Facebook Page manually.

## Monitoring Examples

### Example 16: Check Last 24 Hours of Logs

```bash
wrangler tail flo-social-worker --format=pretty | grep -E "(POST|Error|Success)"
```

### Example 17: Monitor in Real-Time

```bash
# Terminal 1: Watch logs
wrangler tail flo-social-worker --format=pretty

# Terminal 2: Trigger post
curl -X POST https://flo-social-worker.your-account.workers.dev/daily-update
```

## Tips & Best Practices

1. **Use consistent formatting** - Facebook likes posts with clear structure
2. **Include emojis sparingly** - 1-3 per post maximum
3. **Keep it conversational** - Write like you're talking to friends
4. **Add value** - Share learnings, not just announcements
5. **Include links** - Drive traffic to your blog
6. **Post consistently** - Daily updates work best
7. **Monitor engagement** - Adjust content based on what resonates
8. **Be authentic** - Don't sound like a corporate account

## Next Steps

After setting up:
1. Post manually a few times to test
2. Monitor Facebook Page engagement
3. Adjust content generation based on response
4. Enable daily automation
5. Set up token refresh
6. Track metrics over time

Happy posting! 🚀
