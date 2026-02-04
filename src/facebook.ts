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
        const error = await response.json();
        console.warn('Photo upload failed, falling back to link post:', error.error?.message);
        // Fall through to regular post with link
      } else {
        const result = await response.json();
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
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || 'Unknown error posting to page'
      };
    }

    const result = await response.json();
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
      const error = await response.json();
      return {
        valid: false,
        error: error.error?.message || 'Invalid token'
      };
    }

    const result = await response.json();
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
    const url = `https://graph.facebook.com/v19.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch post engagement');
    }

    const result = await response.json();
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
  const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to extend token');
  }

  const result = await response.json();
  return {
    access_token: result.access_token,
    expires_in: result.expires_in || 5184000 // Default 60 days
  };
}
