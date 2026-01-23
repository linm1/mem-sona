'use client';

import { useMemo } from 'react';
import Link from 'next/link';
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
 * Includes "View in Graph" link when results contain graph nodes.
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
  // Maximum node IDs to include in URL (avoid URL length limits ~2000 chars)
  const MAX_NODE_IDS_IN_URL = 50;

  // Extract node IDs for graph visualization
  const nodeIds = useMemo(() => {
    return results
      .filter((r) => r.type === 'node' && r.nodeId)
      .map((r) => r.nodeId as string);
  }, [results]);

  // Generate graph URL with filter parameter (limited to prevent URL overflow)
  const graphUrl = useMemo(() => {
    if (nodeIds.length === 0) return null;
    const limitedIds = nodeIds.slice(0, MAX_NODE_IDS_IN_URL);
    return `/graph?filter=${limitedIds.join(',')}`;
  }, [nodeIds]);

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
      {/* Result count, execution time, and View in Graph link */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-mono-brutal">
          {results.length} results
        </span>
        <div className="flex items-center gap-4">
          {graphUrl && (
            <Link
              href={graphUrl}
              className="flex items-center gap-1 text-accent hover:underline font-mono-brutal"
            >
              <span>
                {nodeIds.length > MAX_NODE_IDS_IN_URL
                  ? `${MAX_NODE_IDS_IN_URL} of ${nodeIds.length} nodes`
                  : `${nodeIds.length} nodes`}
              </span>
              <span>- View in Graph</span>
            </Link>
          )}
          {executionTime !== undefined && (
            <span className="font-mono-brutal">
              {executionTime}ms
            </span>
          )}
        </div>
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
