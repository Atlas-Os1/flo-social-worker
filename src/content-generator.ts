/**
 * Content generation for Flo's Facebook posts
 * Extracts highlights from daily memory files and GitHub activity
 */

export interface ContentHighlight {
  text: string;
  source: 'memory' | 'github' | 'blog';
  timestamp?: number;
  url?: string;
}

export interface GeneratedContent {
  message: string;
  link?: string;
  highlights: ContentHighlight[];
}

/**
 * Parse memory file and extract key highlights
 * Looks for work accomplishments, deployments, and interesting moments
 */
export function parseMemoryFile(content: string): ContentHighlight[] {
  const highlights: ContentHighlight[] = [];
  const lines = content.split('\n');

  // Look for interesting patterns in memory files
  const patterns = [
    /deployed/i,
    /launched/i,
    /built/i,
    /created/i,
    /fixed/i,
    /implemented/i,
    /shipped/i,
    /completed/i,
    /published/i
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and headers
    if (!trimmed || trimmed.startsWith('#') || trimmed.length < 20) {
      continue;
    }

    // Check if line contains interesting keywords
    const isInteresting = patterns.some(pattern => pattern.test(trimmed));
    
    if (isInteresting && trimmed.length < 200) {
      highlights.push({
        text: trimmed.replace(/^[-*]\s*/, ''), // Remove bullet points
        source: 'memory'
      });
    }
  }

  return highlights.slice(0, 5); // Top 5 highlights
}

/**
 * Mock GitHub activity parser
 * In production, this would fetch from GitHub API
 */
export function parseGitHubActivity(repos: string[]): ContentHighlight[] {
  // This is a placeholder - in production, fetch from GitHub API
  // For now, return empty array (will be populated manually or via real API)
  return [];
}

/**
 * Generate conversational Facebook post from highlights
 * Authentic, personal tone - not corporate
 */
export function generatePost(highlights: ContentHighlight[], context: {
  includeLink?: boolean;
  blogUrl?: string;
}): GeneratedContent {
  if (highlights.length === 0) {
    return {
      message: "Working on some exciting projects today. More updates soon! 🚀",
      highlights: []
    };
  }

  // Pick 2-3 best highlights
  const topHighlights = highlights.slice(0, 3);
  
  // Build conversational message
  let message = "Here's what I've been working on:\n\n";
  
  topHighlights.forEach((highlight, idx) => {
    // Make it conversational
    if (idx === 0) {
      message += `✨ ${highlight.text}\n`;
    } else {
      message += `• ${highlight.text}\n`;
    }
  });

  // Add personal touch
  const touches = [
    "\n\nBuilding in public, one commit at a time.",
    "\n\nAlways learning, always building.",
    "\n\nAnother day of solving problems with code.",
    "\n\nSlow and steady progress.",
    "\n\nMaking things happen, one step at a time."
  ];
  
  message += touches[Math.floor(Math.random() * touches.length)];

  // Keep it within Facebook's sweet spot (60-150 words)
  const wordCount = message.split(/\s+/).length;
  if (wordCount > 150) {
    // Trim to 2 highlights if too long
    const shortened = topHighlights.slice(0, 2);
    message = "Here's what I've been working on:\n\n";
    shortened.forEach((highlight, idx) => {
      if (idx === 0) {
        message += `✨ ${highlight.text}\n`;
      } else {
        message += `• ${highlight.text}\n`;
      }
    });
    message += touches[0];
  }

  const result: GeneratedContent = {
    message,
    highlights: topHighlights
  };

  // Add blog link if requested
  if (context.includeLink && context.blogUrl) {
    result.link = context.blogUrl;
  }

  return result;
}

/**
 * Read yesterday's memory file and extract highlights
 * This would be called by the worker with actual file access
 */
export async function getYesterdayHighlights(
  memoryPath: string
): Promise<ContentHighlight[]> {
  // Get yesterday's date in YYYY-MM-DD format
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const filePath = `${memoryPath}/${dateStr}.md`;
  
  // In a real Cloudflare Worker, you'd fetch this from R2 or external source
  // For now, return placeholder
  console.log(`Would read from: ${filePath}`);
  
  return [
    {
      text: "Built flo-social-worker for automated Facebook posting",
      source: 'memory'
    },
    {
      text: "Integrated Graph API v19.0 for reliable posting",
      source: 'memory'
    }
  ];
}

/**
 * Format content for Facebook's best practices
 * - 60-150 words optimal
 * - Personal, authentic tone
 * - Clear structure with line breaks
 */
export function formatForFacebook(content: string): string {
  // Remove excessive newlines
  let formatted = content.replace(/\n{3,}/g, '\n\n');
  
  // Ensure line breaks between sections
  formatted = formatted.replace(/\.\s+([A-Z])/g, '.\n\n$1');
  
  // Remove markdown formatting that doesn't work on Facebook
  formatted = formatted.replace(/\*\*/g, ''); // Remove bold
  formatted = formatted.replace(/\*/g, ''); // Remove italic
  formatted = formatted.replace(/`/g, ''); // Remove code blocks
  
  return formatted.trim();
}

/**
 * Validate post content meets Facebook requirements
 */
export function validatePost(content: GeneratedContent): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check message exists and has content
  if (!content.message || content.message.trim().length === 0) {
    errors.push('Message is empty');
  }

  // Check length
  const wordCount = content.message.split(/\s+/).length;
  if (wordCount < 10) {
    warnings.push('Message is very short (under 10 words)');
  }
  if (wordCount > 200) {
    warnings.push('Message is long (over 200 words) - may get cut off');
  }

  // Check for spam patterns
  const hashtagCount = (content.message.match(/#/g) || []).length;
  if (hashtagCount > 5) {
    warnings.push('Too many hashtags - may look spammy');
  }

  const emojiCount = (content.message.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount > 10) {
    warnings.push('Too many emojis');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
