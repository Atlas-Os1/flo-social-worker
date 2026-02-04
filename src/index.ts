/**
 * Flo Social Worker - Automated Facebook Posting
 * 
 * Endpoints:
 * - POST /post-facebook - Manual post to Flo's Facebook Page
 * - POST /daily-update - Generate and post daily update from memory/GitHub
 * - GET /status - Health check and configuration status
 * - GET /verify-token - Verify Facebook credentials
 */

import { postToPage, verifyPageToken, getPostEngagement } from './facebook';
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

  // Bindings
  BLOG?: R2Bucket;
  STATE?: KVNamespace;
  AI?: any;

  // Vars
  BLOG_URL?: string;
  GITHUB_REPOS?: string;
  MEMORY_PATH?: string;
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
            'GET /status',
            'GET /verify-token'
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

      // Generate and post daily update
      if (path === '/daily-update') {
        if (request.method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405 });
        }

        try {
          console.log('[DAILY] Generating daily update...');

          // For now, use placeholder highlights
          // In production, this would read from memory files via R2 or external source
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

          // Generate post content
          const content = generatePost(highlights, {
            includeLink: true,
            blogUrl: env.BLOG_URL || 'https://blog.minte.dev'
          });

          // Validate content
          const validation = validatePost(content);
          if (!validation.valid) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Generated content failed validation',
              errors: validation.errors,
              warnings: validation.warnings
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Log warnings
          if (validation.warnings.length > 0) {
            console.warn('[DAILY] Warnings:', validation.warnings);
          }

          // Format for Facebook
          const formattedMessage = formatForFacebook(content.message);

          // Post to Facebook
          const pageId = env.FLO_FB_PAGE_ID;
          const token = env.FLO_FB_PAGE_ACCESS_TOKEN;

          if (!pageId || !token) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Facebook credentials not configured',
              generated_content: content // Return content for preview
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const result = await postToPage(pageId, token, {
            message: formattedMessage,
            link: content.link
          });

          if (!result.success) {
            return new Response(JSON.stringify({
              success: false,
              error: result.error,
              generated_content: content
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
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

          return new Response(JSON.stringify({
            success: true,
            post_id: result.post_id,
            facebook_url: result.facebook_url,
            highlights_used: content.highlights.length,
            validation_warnings: validation.warnings
          }, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (err: any) {
          console.error('[DAILY] Error:', err);
          return new Response(JSON.stringify({
            success: false,
            error: err.message || 'Internal error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Not found
      return new Response(JSON.stringify({
        error: 'Not Found',
        available_endpoints: [
          'POST /post-facebook',
          'POST /daily-update',
          'GET /status',
          'GET /verify-token'
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
