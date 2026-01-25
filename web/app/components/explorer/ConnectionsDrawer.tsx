'use client';

import { useEffect, useRef, type MouseEvent, type KeyboardEvent, type ReactNode } from 'react';

/**
 * Edge data for connections
 */
export interface Edge {
  /** Relationship type (e.g., "uses", "requires", "follows") */
  relationship: string;
  /** Name of the target node */
  targetName: string;
  /** Type of target node (project, tool, skill, concept) */
  targetNodeType: string;
  /** Relationship strength/confidence (0-1) */
  weight: number;
}

/**
 * Props for ConnectionsDrawer component
 */
export interface ConnectionsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Node name to display in header */
  nodeName: string;
  /** List of edges/connections */
  edges: Edge[];
}

/**
 * Props for ConnectionsIndicator component
 */
export interface ConnectionsIndicatorProps {
  /** Number of connections */
  count: number;
  /** Callback when indicator is clicked */
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Type badge background color mapping
 */
const TYPE_COLORS: Record<string, string> = {
  project: 'bg-highlight text-paper',
  tool: 'bg-muted text-paper',
  skill: 'bg-accent text-paper',
  concept: 'bg-ink text-paper',
};

/**
 * Type count text color mapping
 */
const TYPE_TEXT_COLORS: Record<string, string> = {
  project: 'text-highlight',
  tool: 'text-muted',
  skill: 'text-accent',
  concept: 'text-muted',
};

/**
 * Calculate counts by node type
 */
function getTypeCounts(edges: Edge[]): Record<string, number> {
  return edges.reduce(
    (acc, edge) => {
      const type = edge.targetNodeType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Pluralize a word based on count
 */
function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  if (word === 'skill') return 'skills';
  if (word === 'tool') return 'tools';
  if (word === 'project') return 'projects';
  if (word === 'concept') return 'concepts';
  return `${word}s`;
}

/**
 * Link icon SVG
 */
function LinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * Close icon SVG
 */
function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Individual edge item in the connections list
 */
function EdgeItem({ edge }: { edge: Edge }) {
  const colorClass = TYPE_COLORS[edge.targetNodeType] || TYPE_COLORS.concept;

  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <span className="text-muted">→</span>
      <span className="font-mono text-accent min-w-[80px]">{edge.relationship}</span>
      <span className="text-muted">→</span>
      <span
        className={`px-1.5 py-0.5 border border-ink font-mono uppercase ${colorClass}`}
        style={{ fontSize: '10px' }}
      >
        {edge.targetName}
      </span>
    </div>
  );
}

/**
 * Compact connection indicator (icon + count) for memory cards
 * Positioned at bottom-right, aligned with timestamp
 */
export function ConnectionsIndicator({
  count,
  onClick,
}: ConnectionsIndicatorProps): ReactNode {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick(event);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="font-mono text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors"
      aria-label={`View ${count} connections`}
    >
      <LinkIcon />
      <span>{count}</span>
    </button>
  );
}

/**
 * Bottom drawer showing all connections for a node
 * Includes color-coded type counts and edge list
 */
export function ConnectionsDrawer({
  isOpen,
  onClose,
  nodeName,
  edges,
}: ConnectionsDrawerProps): ReactNode {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when drawer opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const typeCounts = getTypeCounts(edges);

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="drawer-backdrop"
        className="fixed inset-0 bg-ink/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        data-testid="connections-drawer"
        className="fixed bottom-0 left-0 right-0 bg-paper border-t-2 border-ink shadow-brutal z-50 max-h-[50vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ink/10">
          <div>
            <h3 className="font-mono-brutal font-bold text-ink">{nodeName}</h3>
            {/* Type counts */}
            <div className="flex gap-3 mt-1">
              {Object.entries(typeCounts).map(([nodeType, count]) => (
                <span
                  key={nodeType}
                  className={`text-xs font-mono ${TYPE_TEXT_COLORS[nodeType] || 'text-muted'}`}
                >
                  {count} {pluralize(nodeType, count)}
                </span>
              ))}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-ink hover:text-highlight transition-colors p-1"
            aria-label="Close drawer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Edge list */}
        <div className="p-4 overflow-y-auto max-h-[calc(50vh-80px)]">
          <div className="space-y-1">
            {edges.map((edge, idx) => (
              <EdgeItem
                key={`${edge.relationship}-${edge.targetName}-${idx}`}
                edge={edge}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
