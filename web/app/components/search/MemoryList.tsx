'use client';

import { MergedResult } from './types';
import { MemoryCard } from './MemoryCard';

/**
 * Props for MemoryList component
 */
interface MemoryListProps {
  results: MergedResult[];
  executionTime?: number;
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
          <MemoryCard
            key={`${result.type}-${index}`}
            result={result}
          />
        ))}
      </div>
    </div>
  );
}
