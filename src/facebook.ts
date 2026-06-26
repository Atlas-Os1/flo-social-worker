/**
 * Facebook Graph API v19.0 Integration for Flo's Personal Page
 * Based on KBC Facebook worker implementation
 */

export interface FacebookPostOptions {
  message: string;
  link?: string;
  image_url?: string;
}

export interface FacebookPostResponse {
  success: boolean;
  post_id?: string;
  facebook_url?: string;
  error?: string;
}

export interface FacebookContentPerformanceOptions {
  limit?: number;
  sinceDays?: number;
}

export interface FacebookContentPerformanceMetricMap {
  [metric: string]: number | null;
}

export interface FacebookContentPerformancePost {
  id: string;
  created_time?: string;
  permalink_url?: string;
  message_preview?: string;
  full_picture?: string;
  status_type?: string;
  media_types: string[];
  engagement: {
    reactions: number;
    comments: number;
    shares: number;
    total: number;
  };
  insights: FacebookContentPerformanceMetricMap;
  insight_warnings: string[];
  score: number;
}

export interface FacebookContentPerformanceReport {
  page_id: string;
  limit: number;
  since_days: number;
  analyzed_posts: number;
  top_posts: FacebookContentPerformancePost[];
  posts: FacebookContentPerformancePost[];
  summary: {
    total_reactions: number;
    total_comments: number;
    total_shares: number;
    total_engagement: number;
  };
}

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

async function graphRequest(path: string, accessToken: string, params: Record<string, string | number | undefined> = {}): Promise<any> {
  const url = new URL(`${GRAPH_API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    let message = `Graph API request failed (${response.status})`;
    try {
      const error = (await response.json()) as any;
      message = error?.error?.message || error?.message || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response.json();
}

function sumEngagement(post: any): { reactions: number; comments: number; shares: number; total: number } {
  const reactions = post?.reactions?.summary?.total_count || 0;
  const comments = post?.comments?.summary?.total_count || 0;
  const shares = post?.shares?.count || 0;
  return {
    reactions,
    comments,
    shares,
    total: reactions + comments + shares
  };
}

function extractMediaTypes(post: any): string[] {
  const attachments = post?.attachments?.data || [];
  const mediaTypes = new Set<string>();
  for (const attachment of attachments) {
    if (attachment?.media_type) {
      mediaTypes.add(String(attachment.media_type));
    }
    const subattachments = attachment?.subattachments?.data || [];
    for (const sub of subattachments) {
      if (sub?.media_type) {
        mediaTypes.add(String(sub.media_type));
      }
    }
  }
  return [...mediaTypes];
}

async function fetchPostInsights(postId: string, accessToken: string): Promise<{ insights: FacebookContentPerformanceMetricMap; warnings: string[] }> {
  const metricNames = [
    'post_impressions',
    'post_impressions_unique',
    'post_engaged_users',
    'post_video_views',
    'post_video_views_unique',
    'post_video_complete_views',
    'post_video_avg_time_watched',
    'post_video_retention_graph'
  ];

  try {
    const result = await graphRequest(`${postId}/insights`, accessToken, {
      metric: metricNames.join(',')
    });

    const insights: FacebookContentPerformanceMetricMap = {};
    for (const metric of result?.data || []) {
      const value = metric?.values?.[0]?.value;
      insights[String(metric?.name)] = typeof value === 'number' ? value : null;
    }

    const warnings = metricNames
      .filter((name) => !(name in insights))
      .map((name) => `Metric unavailable: ${name}`);

    return { insights, warnings };
  } catch (error: any) {
    return {
      insights: {},
      warnings: [`Insights unavailable: ${error?.message || 'unknown error'}`]
    };
  }
}

function scoreContent(post: { engagement: { reactions: number; comments: number; shares: number }; insights: FacebookContentPerformanceMetricMap; media_types: string[] }): number {
  const engagementScore = post.engagement.reactions + (post.engagement.comments * 2) + (post.engagement.shares * 3);
  const viewBoost = (post.insights.post_video_views || 0) / 50;
  const impressionBoost = (post.insights.post_impressions || 0) / 500;
  const videoBonus = post.media_types.some((type) => String(type).toLowerCase().includes('video')) ? 25 : 0;
  return Math.round(engagementScore + viewBoost + impressionBoost + videoBonus);
}

export async function getPageContentPerformance(
  pageId: string,
  accessToken: string,
  options: FacebookContentPerformanceOptions = {}
): Promise<FacebookContentPerformanceReport> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
  const sinceDays = Math.min(Math.max(options.sinceDays ?? 30, 1), 365);
  const since = Math.floor(Date.now() / 1000) - (sinceDays * 24 * 60 * 60);

  const feed = await graphRequest(`${pageId}/posts`, accessToken, {
    limit,
    since,
    fields: 'id,message,created_time,permalink_url,status_type,full_picture,attachments{media_type,media,url,subattachments{media_type,media,url}},shares,comments.summary(true).limit(0),reactions.summary(true).limit(0)',
    order: 'reverse_chronological'
  });

  const rawPosts = (feed?.data || []).slice(0, limit);
  const analyzed = await Promise.all(rawPosts.map(async (post: any) => {
    const engagement = sumEngagement(post);
    const { insights, warnings } = await fetchPostInsights(String(post.id), accessToken);
    const mediaTypes = extractMediaTypes(post);
    return {
      id: String(post.id),
      created_time: post?.created_time,
      permalink_url: post?.permalink_url,
      message_preview: typeof post?.message === 'string' ? post.message.slice(0, 180) : undefined,
      full_picture: post?.full_picture,
      status_type: post?.status_type,
      media_types: mediaTypes,
      engagement,
      insights,
      insight_warnings: warnings,
      score: 0
    } as FacebookContentPerformancePost;
  }));

  const scored = analyzed.map((post) => ({ ...post, score: scoreContent(post) }));
  const ranked = [...scored].sort((a, b) => b.score - a.score);

  const summary = ranked.reduce(
    (acc, post) => {
      acc.total_reactions += post.engagement.reactions;
      acc.total_comments += post.engagement.comments;
      acc.total_shares += post.engagement.shares;
      acc.total_engagement += post.engagement.total;
      return acc;
    },
    { total_reactions: 0, total_comments: 0, total_shares: 0, total_engagement: 0 }
  );

  return {
    page_id: pageId,
    limit,
    since_days: sinceDays,
    analyzed_posts: ranked.length,
    top_posts: ranked.slice(0, 5),
    posts: ranked,
    summary
  };
}

/**
 * Post to Facebook Page using Official Graph API v19.0
 * Requires long-lived Page Access Token
 */
export async function postToPage(
  pageId: string,
  accessToken: string,
  options: FacebookPostOptions
): Promise<FacebookPostResponse> {
  try {
    const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;

    const body: any = {
      message: options.message,
      access_token: accessToken
    };

    if (options.link) {
      body.link = options.link;
    }

    // If image URL provided, use photos endpoint instead
    if (options.image_url) {
      const photoUrl = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      const photoBody = new URLSearchParams({
        message: options.message,
        url: options.image_url,
        access_token: accessToken
      });

      const response = await fetch(photoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: photoBody.toString()
      });

      if (!response.ok) {
        const error = (await response.json()) as any;
        console.warn('Photo upload failed, falling back to link post:', error.error?.message);
        // Fall through to regular post with link
      } else {
        const result = (await response.json()) as any;
        const postId = result.id || result.post_id;
        return {
          success: true,
          post_id: postId,
          facebook_url: `https://facebook.com/${postId.replace('_', '/posts/')}`
        };
      }
    }

    // Regular post (no image or fallback from photo upload)
    const formBody = new URLSearchParams(body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody.toString()
    });

    if (!response.ok) {
      const error = (await response.json()) as any;
      return {
        success: false,
        error: error.error?.message || 'Unknown error posting to page'
      };
    }

    const result = (await response.json()) as any;
    const postId = result.id;
    return {
      success: true,
      post_id: postId,
      facebook_url: `https://facebook.com/${postId.replace('_', '/posts/')}`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Verify access token is valid and get Page info
 */
export async function verifyPageToken(
  pageId: string,
  accessToken: string
): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v19.0/${pageId}?fields=id,name,access_token&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = (await response.json()) as any;
      return {
        valid: false,
        error: error.error?.message || 'Invalid token'
      };
    }

    const result = (await response.json()) as any;
    return {
      valid: true,
      name: result.name
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Get post engagement stats (likes, comments, shares)
 */
export async function getPostEngagement(
  postId: string,
  accessToken: string
): Promise<{ likes: number; comments: number; shares: number }> {
  try {
    const result = await graphRequest(postId, accessToken, {
      fields: 'likes.summary(true),comments.summary(true),shares'
    });
    return {
      likes: result.likes?.summary?.total_count || 0,
      comments: result.comments?.summary?.total_count || 0,
      shares: result.shares?.count || 0
    };
  } catch (error: any) {
    console.error('Error fetching engagement:', error);
    return { likes: 0, comments: 0, shares: 0 };
  }
}

/**
 * Extend Page Access Token (refresh to 60 days)
 * Call this periodically to keep token fresh
 */
export async function extendAccessToken(
  currentToken: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${GRAPH_API_BASE}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', currentToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    let message = 'Failed to extend token';
    try {
      const error = (await response.json()) as any;
      message = error?.error?.message || error?.message || message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  const result = (await response.json()) as any;
  return {
    access_token: result.access_token,
    expires_in: result.expires_in || 5184000 // Default 60 days
  };
}
