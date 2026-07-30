/**
 * Flo Social Worker - Automated Facebook Posting
 * 
 * Endpoints:
 * - POST /post-facebook - Manual post to Flo's Facebook Page
 * - POST /daily-update - Generate and post daily update from memory/GitHub
 * - GET /status - Health check and configuration status
 * - GET /verify-token - Verify Facebook credentials
 */

import { postToPage, verifyPageToken, getPageContentPerformance } from './facebook';
import {
  parseMemoryFile,
  generatePost,
  validatePost,
  formatForFacebook,
  type GeneratedContent
} from './content-generator';

export interface Env {
  // Secrets
  FLO_FB_PAGE_ID?: string;
  FLO_FB_PAGE_ACCESS_TOKEN?: string;
  FLO_FB_APP_ID?: string;
  FLO_FB_APP_SECRET?: string;
  FLO_SOCIAL_WORKER_TOKEN?: string;

  // Bindings
  BLOG?: R2Bucket;
  STATE?: KVNamespace;
  AI?: any;

  // Vars
  BLOG_URL?: string;
  GITHUB_REPOS?: string;
  MEMORY_PATH?: string;
}

function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.FLO_SOCIAL_WORKER_TOKEN) {
    return false;
  }

  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token === env.FLO_SOCIAL_WORKER_TOKEN;
}

function buildDailyUpdate(env: Env): {
  content: GeneratedContent;
  formattedMessage: string;
  validation: ReturnType<typeof validatePost>;
} {
  // For now, use placeholder highlights.
  // In production, this would read from memory files via R2 or an external source.
  const highlights = [
    {
      text: 'Built automated Facebook posting system with Graph API',
      source: 'memory' as const
    },
    {
      text: 'Integrated content generation from daily memory files',
      source: 'memory' as const
    },
    {
      text: 'Set up Worker on Cloudflare edge for reliable posting',
      source: 'memory' as const
    }
  ];

  const content = generatePost(highlights, {
    includeLink: true,
    blogUrl: env.BLOG_URL || 'https://blog.minte.dev'
  });
  const validation = validatePost(content);
  const formattedMessage = formatForFacebook(content.message);

  return { content, formattedMessage, validation };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for API access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (path === '/status' || path === '/') {
        const hasPageId = !!env.FLO_FB_PAGE_ID;
        const hasToken = !!env.FLO_FB_PAGE_ACCESS_TOKEN;
        const hasAppId = !!env.FLO_FB_APP_ID;

        return new Response(JSON.stringify({
          service: 'flo-social-worker',
          version: '1.0.0',
          status: 'running',
          configured: hasPageId && hasToken,
          credentials: {
            page_id: hasPageId ? 'set' : 'missing',
            access_token: hasToken ? 'set' : 'missing',
            app_id: hasAppId ? 'set' : 'missing'
          },
          endpoints: [
            'POST /post-facebook',
            'POST /daily-update',
            'POST /daily-update?dryRun=1',
            'GET /preview-daily-update',
            'GET /status',
            'GET /verify-token',
            'GET /content-performance'
          ]
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify Facebook credentials
      if (path === '/verify-token') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', { status: 405 });
        }

        const pageId = env.FLO_FB_PAGE_ID;
        const token = env.FLO_FB_PAGE_ACCESS_TOKEN;

        if (!pageId || !token) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing FLO_FB_PAGE_ID or FLO_FB_PAGE_ACCESS_TOKEN'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const verification = await verifyPageToken(pageId, token);

        return new Response(JSON.stringify({
          success: verification.valid,
          page_id: pageId,
          page_name: verification.name,
          error: verification.error
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Content performance analytics
      if (path === '/content-performance') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', { status: 405 });
        }

        const pageId = env.FLO_FB_PAGE_ID;
        const token = env.FLO_FB_PAGE_ACCESS_TOKEN;

        if (!pageId || !token) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Facebook credentials not configured. Set FLO_FB_PAGE_ID and FLO_FB_PAGE_ACCESS_TOKEN secrets.'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const limit = Number(url.searchParams.get('limit') || '10');
        const sinceDays = Number(url.searchParams.get('since_days') || '30');

        try {
          const report = await getPageContentPerformance(pageId, token, { limit, sinceDays });
          const averageEngagementPerPost = report.analyzed_posts > 0
            ? Number((report.summary.total_engagement / report.analyzed_posts).toFixed(2))
            : 0;

          return new Response(JSON.stringify({
            success: true,
            generated_at: new Date().toISOString(),
            page_id: report.page_id,
            limit: report.limit,
            since_days: report.since_days,
            analyzed_posts: report.analyzed_posts,
            summary: {
              ...report.summary,
              average_engagement_per_post: averageEngagementPerPost
            },
            top_posts: report.top_posts,
            posts: report.posts
          }, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          console.error('[PERFORMANCE] Error:', err);
          return new Response(JSON.stringify({
            success: false,
            error: err.message || 'Failed to fetch content performance'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Manual post to Facebook
      if (path === '/post-facebook') {
        if (request.method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405 });
        }

        try {
          const body = await request.json() as {
            message: string;
            link?: string;
            image_url?: string;
          };

          if (!body.message) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Missing message in request body'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const pageId = env.FLO_FB_PAGE_ID;
          const token = env.FLO_FB_PAGE_ACCESS_TOKEN;

          if (!pageId || !token) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Facebook credentials not configured. Set FLO_FB_PAGE_ID and FLO_FB_PAGE_ACCESS_TOKEN secrets.'
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log('[POST] Posting to Facebook Page:', pageId);

          const result = await postToPage(pageId, token, {
            message: body.message,
            link: body.link,
            image_url: body.image_url
          });

          if (!result.success) {
            console.error('[POST] Failed:', result.error);
            return new Response(JSON.stringify(result), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          console.log('[POST] Success:', result.post_id);

          // Store post info in KV for tracking
          if (env.STATE && result.post_id) {
            const postData = {
              post_id: result.post_id,
              message: body.message,
              link: body.link,
              posted_at: Date.now(),
              facebook_url: result.facebook_url
            };

            await env.STATE.put(
              `post:${result.post_id}`,
              JSON.stringify(postData),
              { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
            );
          }

          return new Response(JSON.stringify({
            success: true,
            post_id: result.post_id,
            facebook_url: result.facebook_url,
            message_preview: body.message.substring(0, 100) + '...'
          }, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (err: any) {
          console.error('[POST] Error:', err);
          return new Response(JSON.stringify({
            success: false,
            error: err.message || 'Internal error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Preview generated daily update without posting to Facebook.
      if (path === '/preview-daily-update') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', { status: 405 });
        }

        const { content, formattedMessage, validation } = buildDailyUpdate(env);
        return jsonResponse({
          success: validation.valid,
          dry_run: true,
          would_post: false,
          generated_content: content,
          formatted_message: formattedMessage,
          highlights_used: content.highlights.length,
          validation_errors: validation.errors,
          validation_warnings: validation.warnings
        }, validation.valid ? 200 : 400, corsHeaders);
      }

      // Generate and post daily update. Use ?dryRun=1 to diagnose without posting.
      if (path === '/daily-update') {
        if (request.method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405 });
        }

        try {
          const dryRun = ['1', 'true', 'yes'].includes((url.searchParams.get('dryRun') || '').toLowerCase());
          console.log(`[DAILY] Generating daily update${dryRun ? ' (dry run)' : ''}...`);

          const { content, formattedMessage, validation } = buildDailyUpdate(env);
          if (!validation.valid) {
            return jsonResponse({
              success: false,
              dry_run: dryRun,
              would_post: false,
              error: 'Generated content failed validation',
              errors: validation.errors,
              warnings: validation.warnings,
              generated_content: content
            }, 400, corsHeaders);
          }

          if (validation.warnings.length > 0) {
            console.warn('[DAILY] Warnings:', validation.warnings);
          }

          if (dryRun) {
            return jsonResponse({
              success: true,
              dry_run: true,
              would_post: true,
              generated_content: content,
              formatted_message: formattedMessage,
              highlights_used: content.highlights.length,
              validation_warnings: validation.warnings
            }, 200, corsHeaders);
          }

          if (!isAuthorized(request, env)) {
            return jsonResponse({
              success: false,
              error: 'Unauthorized daily update request'
            }, 401, corsHeaders);
          }

          // Post to Facebook
          const pageId = env.FLO_FB_PAGE_ID;
          const token = env.FLO_FB_PAGE_ACCESS_TOKEN;

          if (!pageId || !token) {
            return jsonResponse({
              success: false,
              error: 'Facebook credentials not configured',
              generated_content: content
            }, 500, corsHeaders);
          }

          const result = await postToPage(pageId, token, {
            message: formattedMessage,
            link: content.link
          });

          if (!result.success) {
            return jsonResponse({
              success: false,
              error: result.error,
              generated_content: content
            }, 500, corsHeaders);
          }

          // Store in KV
          if (env.STATE && result.post_id) {
            const postData = {
              post_id: result.post_id,
              type: 'daily_update',
              message: formattedMessage,
              highlights: content.highlights,
              posted_at: Date.now(),
              facebook_url: result.facebook_url
            };

            await env.STATE.put(
              `post:${result.post_id}`,
              JSON.stringify(postData),
              { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
            );
          }

          return jsonResponse({
            success: true,
            post_id: result.post_id,
            facebook_url: result.facebook_url,
            highlights_used: content.highlights.length,
            validation_warnings: validation.warnings
          }, 200, corsHeaders);

        } catch (err: any) {
          console.error('[DAILY] Error:', err);
          return jsonResponse({
            success: false,
            error: err.message || 'Internal error'
          }, 500, corsHeaders);
        }
      }

      // Not found
      return new Response(JSON.stringify({
        error: 'Not Found',
        available_endpoints: [
          'POST /post-facebook',
          'POST /daily-update',
          'POST /daily-update?dryRun=1',
          'GET /preview-daily-update',
          'GET /status',
          'GET /verify-token',
          'GET /content-performance'
        ]
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err: any) {
      console.error('[WORKER] Unhandled error:', err);
      return new Response(JSON.stringify({
        success: false,
        error: err.message || 'Internal server error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
