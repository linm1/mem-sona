'use client';

import { useEffect, useRef, type MouseEvent, type KeyboardEvent, type ReactNode } from 'react';
import { EdgeItem, type Edge } from '@/app/components/shared/EdgeItem';
import { pluralize, getTypeCounts } from '@/app/utils/text';
import { LinkIcon, CloseIcon } from '@/app/components/icons';

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
 * Type count text color mapping
 */
const TYPE_TEXT_COLORS: Record<string, string> = {
  project: 'text-highlight',
  tool: 'text-muted',
  skill: 'text-accent',
  concept: 'text-muted',
};

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
              <div key={`${edge.relationship}-${edge.targetName}-${idx}`} className="py-1">
                <EdgeItem edge={edge} variant="default" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
