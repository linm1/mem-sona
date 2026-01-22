import { MergedResult } from './types';
import { TypeBadge, SourceBadge } from './badges';
import { ScoreBar } from './ScoreBar';
import { formatRelativeTime, truncateContent } from '../../utils/formatters';

/**
 * Props for MemoryCard component
 */
interface MemoryCardProps {
  /** Memory search result to display */
  result: MergedResult;
  /** Maximum character length before truncation (default: 200) */
  truncateLimit?: number;
}

/**
 * MemoryCard component - displays a single memory search result
 *
 * Renders a card with:
 * - Type and source badges
 * - Score display with visual bar
 * - Timestamp
 * - Content (truncated if needed)
 *
 * @example
 * ```tsx
 * <MemoryCard result={searchResult} />
 * <MemoryCard result={searchResult} truncateLimit={100} />
 * ```
 */
export function MemoryCard({ result, truncateLimit = 200 }: MemoryCardProps) {
  const displayContent = truncateContent(result.content, truncateLimit);
  const formattedScore = result.finalScore.toFixed(2);
  const relativeTime = formatRelativeTime(result.timestamp);

  return (
    <div
      data-testid="memory-card"
      className="card-brutal p-4 space-y-3"
    >
      {/* Header: Type, Source, Score, Timestamp */}
      <div className="flex items-center gap-2 flex-wrap">
        <TypeBadge type={result.type} />
        <SourceBadge source={result.source} />

        {/* Score */}
        <span className="text-xs font-mono text-muted">
          score: {formattedScore}
        </span>

        {/* Timestamp */}
        <span className="text-xs text-muted ml-auto">
          {relativeTime}
        </span>
      </div>

      {/* Score Bar */}
      <ScoreBar score={result.finalScore} />

      {/* Content */}
      <div className="text-body text-sm whitespace-pre-wrap">
        {displayContent}
      </div>
    </div>
  );
}
