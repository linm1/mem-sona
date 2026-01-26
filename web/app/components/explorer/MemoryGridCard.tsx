'use client';

import { useCallback, useRef, useState, KeyboardEvent, MouseEvent } from 'react';
import { MergedResult } from '../search/types';
import { TypeBadge, SourceBadge } from '../search/badges';
import { formatRelativeTime, getScoreIntensity } from '../../utils/formatters';
import { getNodeTypeBadgeClass } from '../../utils/nodeTypes';
import { ConnectionsIndicator, ConnectionsDrawer } from './ConnectionsDrawer';

/**
 * Props for MemoryGridCard component
 */
interface MemoryGridCardProps {
  /** Memory search result to display */
  result: MergedResult;
  /** Callback when card is clicked, receives card's DOMRect for FLIP animation */
  onClick: (rect: DOMRect) => void;
}

/**
 * Truncate content to a maximum of 120 characters for grid cards
 */
function truncateGridContent(content: string, maxLength = 120): string {
  if (content.length <= maxLength) return content;

  // Try to find a word boundary
  const truncated = content.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Get the display title for a result
 */
function getDisplayTitle(result: MergedResult): string {
  if (result.type === 'node' && result.name) {
    return result.name;
  }
  // For items, return truncated content as title
  return truncateGridContent(result.content, 60);
}

/**
 * Get the display description for a result
 */
function getDisplayDescription(result: MergedResult): string | null {
  if (result.type === 'node') {
    return result.description || null;
  }
  // For items, content is used as title, so no separate description needed
  // unless the content is very long
  if (result.content.length > 60) {
    return truncateGridContent(result.content.slice(60), 100);
  }
  return null;
}

/**
 * Get the classification label (category for items, nodeType for nodes)
 */
function getClassificationLabel(result: MergedResult): string | null {
  if (result.type === 'item' && result.category) {
    return result.category;
  }
  if (result.type === 'node' && result.nodeType) {
    return result.nodeType;
  }
  return null;
}

/**
 * MemoryGridCard component - compact card for 3x3 grid display
 *
 * Displays memory search results in a clickable card format.
 * Handles both Items (atomic facts) and GraphNodes (entities).
 *
 * Features:
 * - Type and source badges
 * - Score visualization
 * - Timestamp
 * - Truncated content/name
 * - Keyboard accessible (Enter/Space to activate)
 * - FLIP animation support via DOMRect callback
 * - Connections indicator with drawer (for nodes)
 *
 * @example
 * ```tsx
 * <MemoryGridCard
 *   result={searchResult}
 *   onClick={(rect) => openEditor(result, rect)}
 * />
 * ```
 */
export function MemoryGridCard({ result, onClick }: MemoryGridCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      onClick(rect);
    }
  }, [onClick]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const handleConnectionsClick = useCallback(() => {
    // stopPropagation is already called in ConnectionsIndicator
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const title = getDisplayTitle(result);
  const description = getDisplayDescription(result);
  const classification = getClassificationLabel(result);
  const scoreIntensity = getScoreIntensity(result.finalScore);
  const relativeTime = formatRelativeTime(result.timestamp);

  const hasConnections = result.type === 'node' && result.edges && result.edges.length > 0;

  return (
    <>
      <div
        ref={cardRef}
        data-testid="memory-grid-card"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="card-brutal p-4 cursor-pointer min-h-[180px] flex flex-col"
      >
        {/* Header: Type, Source, Classification badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <TypeBadge type={result.type} />
          <SourceBadge source={result.source} />

          {/* Classification badge (category for items, nodeType for nodes) */}
          {classification && (
            <span className={`badge-node ${result.type === 'node' && result.nodeType ? getNodeTypeBadgeClass(result.nodeType) : 'badge-concept'}`}>
              {classification}
            </span>
          )}
        </div>

        {/* Title: Name for nodes, truncated content for items */}
        <h3 className="font-mono-brutal text-sm font-bold text-ink mb-1 line-clamp-2">
          {title}
        </h3>

        {/* Description (if available) */}
        {description && (
          <p className="text-body text-xs text-muted line-clamp-3 flex-grow">
            {description}
          </p>
        )}

        {/* For items with short content, show full content */}
        {result.type === 'item' && result.content.length > 60 && (
          <p className="text-body text-xs text-muted line-clamp-3 flex-grow">
            {truncateGridContent(result.content, 120)}
          </p>
        )}

        {/* Spacer */}
        {!description && result.type !== 'item' && <div className="flex-grow" />}

        {/* Footer: Score, Timestamp, Access count, Connections */}
        <div className="mt-auto pt-3 border-t border-ink/10">
          {/* Score bar */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-16 h-1.5 ${scoreIntensity} border border-ink`} />
            <span className="font-mono text-xs font-bold text-ink">
              {result.finalScore.toFixed(2)}
            </span>
          </div>

          {/* Metadata row: timestamp left, connections/accessCount right */}
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-mono">{relativeTime}</span>

            <div className="flex items-center gap-2">
              {/* Access count for items */}
              {result.type === 'item' && result.accessCount !== undefined && (
                <span className="font-mono">{result.accessCount}x</span>
              )}

              {/* Connections indicator for nodes */}
              {hasConnections && (
                <ConnectionsIndicator
                  count={result.edges!.length}
                  onClick={handleConnectionsClick}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connections drawer (rendered outside card to avoid click propagation) */}
      {hasConnections && (
        <ConnectionsDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          nodeName={result.name || title}
          edges={result.edges!}
        />
      )}
    </>
  );
}
