/**
 * Utility functions for formatting data in the Memory Explorer UI
 */

/**
 * Content truncation limit (characters)
 */
export const CONTENT_TRUNCATE_LIMIT = 200;

/**
 * Format a timestamp to a relative time string (e.g., "2 hours ago", "just now")
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(Date.now()) // "just now"
 * formatRelativeTime(Date.now() - 3600000) // "1 hour ago"
 * ```
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Handle "just now" for timestamps less than 10 seconds (including current moment)
  if (diffSec < 10) return 'just now';

  // Handle singular and plural seconds
  if (diffSec === 1) return '1 second ago';
  if (diffSec < 60) return `${diffSec} seconds ago`;

  // Handle minutes
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;

  // Handle hours
  if (diffHour === 1) return '1 hour ago';
  if (diffHour < 24) return `${diffHour} hours ago`;

  // Handle days
  if (diffDay === 1) return '1 day ago';
  return `${diffDay} days ago`;
}

/**
 * Truncate content to a specified limit, preferring word boundaries
 *
 * @param content - Content string to truncate
 * @param limit - Maximum character length (default: 200)
 * @returns Truncated string with "..." if truncated, original string otherwise
 *
 * @example
 * ```ts
 * truncateContent("Short text") // "Short text"
 * truncateContent("A".repeat(300)) // "AAA...AAA..." (truncated)
 * ```
 */
export function truncateContent(content: string, limit = CONTENT_TRUNCATE_LIMIT): string {
  // Return unchanged if content is within limit
  if (content.length <= limit) {
    return content;
  }

  // Return unchanged if content is only whitespace
  if (content.trim().length === 0) {
    return content;
  }

  // Truncate to limit
  let truncated = content.slice(0, limit);

  // Try to find word boundary within 80% of limit
  const minLength = Math.floor(limit * 0.8);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > minLength) {
    // Truncate at word boundary
    truncated = truncated.slice(0, lastSpace);
  }

  return truncated + '...';
}

/**
 * Get CSS class name for score intensity visualization
 *
 * @param score - Normalized score value (0-1)
 * @returns CSS class name: "score-high", "score-medium", or "score-low"
 *
 * @example
 * ```ts
 * getScoreIntensity(0.9) // "score-high"
 * getScoreIntensity(0.5) // "score-medium"
 * getScoreIntensity(0.2) // "score-low"
 * ```
 */
export function getScoreIntensity(score: number): string {
  if (score >= 0.7) return 'score-high';
  if (score >= 0.4) return 'score-medium';
  return 'score-low';
}
