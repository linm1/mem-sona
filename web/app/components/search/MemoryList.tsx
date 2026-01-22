'use client';

import { MergedResult } from './types';

/**
 * Props for MemoryList component
 */
interface MemoryListProps {
  results: MergedResult[];
  executionTime?: number;
}

/**
 * Format timestamp to relative time string
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour === 1) return '1 hour ago';
  if (diffHour < 24) return `${diffHour} hours ago`;
  if (diffDay === 1) return '1 day ago';
  return `${diffDay} days ago`;
}

/**
 * Get score intensity class based on finalScore
 */
function getScoreIntensity(score: number): string {
  if (score >= 0.7) return 'score-high';
  if (score >= 0.4) return 'score-medium';
  return 'score-low';
}

/**
 * Memory result list component.
 * Displays search results with scores, types, and timestamps.
 *
 * @example
 * ```tsx
 * <MemoryList
 *   results={searchResults}
 *   executionTime={250}
 * />
 * ```
 */
export function MemoryList({ results, executionTime }: MemoryListProps) {
  // Empty state
  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted">No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Result count and execution time */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-mono-brutal">
          {results.length} results
        </span>
        {executionTime !== undefined && (
          <span className="font-mono-brutal">
            {executionTime}ms
          </span>
        )}
      </div>

      {/* Results list */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={`${result.type}-${index}`}
            className="card-brutal p-4 space-y-3"
          >
            {/* Header: Type, Source, Score */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type badge */}
              <span
                className={`badge-node ${
                  result.type === 'item' ? 'badge-project' : 'badge-tool'
                }`}
              >
                {result.type}
              </span>

              {/* Source badge */}
              <span
                className={`badge-node ${
                  result.source === 'vector'
                    ? 'badge-skill'
                    : result.source === 'graph'
                    ? 'badge-tool'
                    : 'badge-concept'
                }`}
              >
                {result.source}
              </span>

              {/* Score */}
              <span className="text-xs font-mono text-muted">
                score: {result.finalScore.toFixed(2)}
              </span>

              {/* Timestamp */}
              <span className="text-xs text-muted ml-auto">
                {formatRelativeTime(result.timestamp)}
              </span>
            </div>

            {/* Score bar */}
            <div className="w-full h-1 bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all ${getScoreIntensity(
                  result.finalScore
                )}`}
                style={{ width: `${result.finalScore * 100}%` }}
              />
            </div>

            {/* Content */}
            <div className="text-body text-sm whitespace-pre-wrap">
              {result.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
