import type { ReactNode } from 'react';

/**
 * Edge data for graph connections
 * Shared type definition used across ConnectionsDrawer, ConnectionsSection, and types.ts
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
 * Props for EdgeItem component
 */
export interface EdgeItemProps {
  /** Edge data to display */
  edge: Edge;
  /** Visual variant - 'default' includes min-width on relationship, 'compact' does not */
  variant?: 'default' | 'compact';
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
 * EdgeItem - Displays a single edge/relationship in a consistent format
 *
 * Renders as: → relationship → TARGET_NAME
 * Where TARGET_NAME is a colored badge based on node type.
 *
 * Used by:
 * - ConnectionsDrawer (default variant with min-width)
 * - ConnectionsSection (compact variant without min-width)
 *
 * @example
 * ```tsx
 * <EdgeItem
 *   edge={{
 *     relationship: 'uses',
 *     targetName: 'Convex',
 *     targetNodeType: 'tool',
 *     weight: 0.8
 *   }}
 *   variant="default"
 * />
 * ```
 */
export function EdgeItem({
  edge,
  variant = 'default',
}: EdgeItemProps): ReactNode {
  const colorClass = TYPE_COLORS[edge.targetNodeType] || TYPE_COLORS.concept;
  const relationshipClass =
    variant === 'default' ? 'font-mono text-accent min-w-[80px]' : 'font-mono text-accent';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted">→</span>
      <span className={relationshipClass}>{edge.relationship}</span>
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
