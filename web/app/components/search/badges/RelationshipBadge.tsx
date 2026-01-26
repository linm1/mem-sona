/**
 * RelationshipBadge component - displays graph edge relationships
 * Shows the relationship type and target node name with color coding
 */

import { getNodeTypeBadgeClass } from '@/app/utils/nodeTypes';

interface RelationshipBadgeProps {
  /** Relationship type (e.g., "uses", "requires", "knows") */
  relationship: string;
  /** Name of the target node */
  targetName: string;
  /** Type of the target node (project, tool, skill, concept) */
  targetNodeType: string;
  /** Relationship strength/confidence (0-1) */
  weight: number;
}

/**
 * Badge component for displaying graph edge relationships
 *
 * @example
 * ```tsx
 * <RelationshipBadge
 *   relationship="uses"
 *   targetName="Convex"
 *   targetNodeType="tool"
 *   weight={0.8}
 * />
 * ```
 */
export function RelationshipBadge({
  relationship,
  targetName,
  targetNodeType,
  weight,
}: RelationshipBadgeProps) {
  const badgeClass = getNodeTypeBadgeClass(targetNodeType);

  return (
    <span
      className={`badge-relationship ${badgeClass}`}
      title={`${relationship} (${Math.round(weight * 100)}% strength)`}
    >
      {relationship}: {targetName}
    </span>
  );
}
