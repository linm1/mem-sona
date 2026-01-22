import { describe, it, expect } from 'vitest';
import { formatRelativeTime, truncateContent, getScoreIntensity, CONTENT_TRUNCATE_LIMIT } from './formatters';

describe('formatRelativeTime', () => {
  const now = Date.now();

  it('returns "just now" for timestamps less than 10 seconds ago', () => {
    expect(formatRelativeTime(now)).toBe('just now');
    expect(formatRelativeTime(now - 5000)).toBe('just now');
    expect(formatRelativeTime(now - 9000)).toBe('just now');
  });

  it('returns seconds ago for timestamps less than 60 seconds', () => {
    expect(formatRelativeTime(now - 10000)).toBe('10 seconds ago');
    expect(formatRelativeTime(now - 30000)).toBe('30 seconds ago');
    expect(formatRelativeTime(now - 59000)).toBe('59 seconds ago');
  });

  it('handles singular second', () => {
    // Note: 1 second exactly would round down to 1 second
    // But due to timing, this could be 0 or 1 second, so we expect "just now" for safety
    expect(formatRelativeTime(now - 1000)).toBe('just now');
  });

  it('returns "1 minute ago" for exactly 1 minute', () => {
    expect(formatRelativeTime(now - 60000)).toBe('1 minute ago');
  });

  it('returns minutes ago for timestamps less than 60 minutes', () => {
    expect(formatRelativeTime(now - 120000)).toBe('2 minutes ago');
    expect(formatRelativeTime(now - 2700000)).toBe('45 minutes ago');
    expect(formatRelativeTime(now - 3540000)).toBe('59 minutes ago');
  });

  it('returns "1 hour ago" for exactly 1 hour', () => {
    expect(formatRelativeTime(now - 3600000)).toBe('1 hour ago');
  });

  it('returns hours ago for timestamps less than 24 hours', () => {
    expect(formatRelativeTime(now - 7200000)).toBe('2 hours ago');
    expect(formatRelativeTime(now - 82800000)).toBe('23 hours ago');
  });

  it('returns "1 day ago" for exactly 1 day', () => {
    expect(formatRelativeTime(now - 86400000)).toBe('1 day ago');
  });

  it('returns days ago for timestamps more than 1 day', () => {
    expect(formatRelativeTime(now - 172800000)).toBe('2 days ago');
    expect(formatRelativeTime(now - 2592000000)).toBe('30 days ago');
    expect(formatRelativeTime(now - 31536000000)).toBe('365 days ago');
  });

  it('handles edge case of timestamp 0', () => {
    // Should return some large number of days
    const result = formatRelativeTime(0);
    expect(result).toMatch(/\d+ days ago/);
  });

  it('handles very old timestamps', () => {
    // 10 years ago
    const result = formatRelativeTime(now - 315360000000);
    expect(result).toMatch(/\d+ days ago/);
  });
});

describe('truncateContent', () => {
  it('returns unchanged content when under 200 characters', () => {
    const short = 'This is short content';
    expect(truncateContent(short)).toBe(short);

    const exactly199 = 'A'.repeat(199);
    expect(truncateContent(exactly199)).toBe(exactly199);

    const exactly200 = 'A'.repeat(200);
    expect(truncateContent(exactly200)).toBe(exactly200);
  });

  it('truncates content over 200 characters with "..."', () => {
    const long = 'A'.repeat(250);
    const result = truncateContent(long);

    expect(result.length).toBeLessThan(long.length);
    expect(result).toContain('...');
  });

  it('truncates at word boundary when possible', () => {
    const content = 'This is a sentence with many words that will exceed the two hundred character limit when we keep adding more words to make it longer and longer until it passes the threshold and needs to be truncated properly';
    const result = truncateContent(content);

    expect(result).toContain('...');
    // Should not end with partial word before ...
    const beforeEllipsis = result.replace('...', '').trim();
    expect(beforeEllipsis).toMatch(/\w+$/); // ends with complete word
  });

  it('handles content with no word boundaries gracefully', () => {
    const noSpaces = 'A'.repeat(300);
    const result = truncateContent(noSpaces);

    expect(result).toContain('...');
    expect(result.length).toBeLessThan(noSpaces.length);
  });

  it('returns empty string for empty input', () => {
    expect(truncateContent('')).toBe('');
  });

  it('handles whitespace-only content', () => {
    const spaces = '   ';
    expect(truncateContent(spaces)).toBe(spaces);

    const longSpaces = ' '.repeat(250);
    const result = truncateContent(longSpaces);
    expect(result).toBe(longSpaces); // whitespace-only doesn't get truncated
  });

  it('respects custom limit parameter', () => {
    const content = 'A'.repeat(150);
    const result = truncateContent(content, 100);

    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(103); // 100 + "..."
  });

  it('uses CONTENT_TRUNCATE_LIMIT constant by default', () => {
    expect(CONTENT_TRUNCATE_LIMIT).toBe(200);
  });

  it('handles multiline content', () => {
    const multiline = `First line that has some content here
Second line with more text added
Third line that is very long and will push us over the character limit for truncation when we add enough words to make this string exceed the two hundred character limit that we have set as the default truncation threshold
Fourth line with even more content
Fifth line that should definitely not appear in the truncated result`;

    const result = truncateContent(multiline);
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(multiline.length);
  });
});

describe('getScoreIntensity', () => {
  it('returns "score-high" for scores >= 0.7', () => {
    expect(getScoreIntensity(0.7)).toBe('score-high');
    expect(getScoreIntensity(0.75)).toBe('score-high');
    expect(getScoreIntensity(0.9)).toBe('score-high');
    expect(getScoreIntensity(1.0)).toBe('score-high');
  });

  it('returns "score-medium" for scores >= 0.4 and < 0.7', () => {
    expect(getScoreIntensity(0.4)).toBe('score-medium');
    expect(getScoreIntensity(0.5)).toBe('score-medium');
    expect(getScoreIntensity(0.65)).toBe('score-medium');
    expect(getScoreIntensity(0.69)).toBe('score-medium');
  });

  it('returns "score-low" for scores < 0.4', () => {
    expect(getScoreIntensity(0.0)).toBe('score-low');
    expect(getScoreIntensity(0.1)).toBe('score-low');
    expect(getScoreIntensity(0.3)).toBe('score-low');
    expect(getScoreIntensity(0.39)).toBe('score-low');
  });

  it('handles edge cases correctly', () => {
    expect(getScoreIntensity(0)).toBe('score-low');
    expect(getScoreIntensity(1)).toBe('score-high');
    expect(getScoreIntensity(0.4)).toBe('score-medium'); // boundary
    expect(getScoreIntensity(0.7)).toBe('score-high'); // boundary
  });

  it('handles negative scores (edge case)', () => {
    expect(getScoreIntensity(-0.5)).toBe('score-low');
  });

  it('handles scores > 1 (edge case)', () => {
    expect(getScoreIntensity(1.5)).toBe('score-high');
  });
});
