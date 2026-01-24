import { useCallback } from 'react';
import { MergedResult } from '../search/types';
import { MemoryGridCard } from './MemoryGridCard';

/**
 * Props for MemoryGrid component
 */
interface MemoryGridProps {
  /** Array of search results to display */
  results: MergedResult[];
  /** Callback when a card is clicked, receives result and card's DOMRect for FLIP animation */
  onCardClick: (result: MergedResult, rect: DOMRect) => void;
  /** Optional execution time in milliseconds to display */
  executionTime?: number;
}

/**
 * MemoryGrid component - 3x3 responsive grid container for memory results
 *
 * Displays search results in a responsive grid layout:
 * - 1 column on mobile (< 768px)
 * - 2 columns on tablet (768px - 1024px)
 * - 3 columns on desktop (> 1024px)
 *
 * Features:
 * - Responsive grid layout
 * - Results count display
 * - Optional execution time display
 * - Empty state handling
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <MemoryGrid
 *   results={searchResults}
 *   onCardClick={(result, rect) => openEditor(result, rect)}
 *   executionTime={125}
 * />
 * ```
 */
export function MemoryGrid({ results, onCardClick, executionTime }: MemoryGridProps) {
  const handleCardClick = useCallback(
    (result: MergedResult) => (rect: DOMRect) => {
      onCardClick(result, rect);
    },
    [onCardClick]
  );

  // Empty state
  if (results.length === 0) {
    return (
      <div
        data-testid="memory-grid"
        role="grid"
        aria-label="Memory results"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div className="col-span-full text-center py-12">
          <p className="text-muted text-sm font-mono-brutal">
            No memories found
          </p>
          <p className="text-muted text-xs mt-2">
            Try searching for something or add new memories
          </p>
        </div>
      </div>
    );
  }

  const resultCount = results.length;
  const resultLabel = resultCount === 1 ? 'result' : 'results';

  return (
    <div className="space-y-4">
      {/* Header: Results count and execution time */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono text-muted">
          {resultCount} {resultLabel}
        </span>
        {executionTime !== undefined && (
          <span className="font-mono text-xs text-muted">
            {executionTime}ms
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        data-testid="memory-grid"
        role="grid"
        aria-label="Memory results"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {results.map((result, index) => (
          <MemoryGridCard
            key={result.itemId || result.nodeId || `result-${index}`}
            result={result}
            onClick={handleCardClick(result)}
          />
        ))}
      </div>
    </div>
  );
}
