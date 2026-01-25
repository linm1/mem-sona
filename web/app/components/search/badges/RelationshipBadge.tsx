/**
 * RelationshipBadge component - displays graph edge relationships
 * Shows the relationship type and target node name with color coding
 */

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
 * Get badge class based on target node type
 */
function getNodeTypeBadgeClass(nodeType: string): string {
  switch (nodeType) {
    case 'project':
      return 'badge-project';
    case 'tool':
      return 'badge-tool';
    case 'skill':
      return 'badge-skill';
    case 'concept':
      return 'badge-concept';
    default:
      return 'badge-concept';
  }
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

  // Opacity scales from 0.5 (low weight) to 1.0 (high weight)
  const opacity = 0.5 + weight * 0.5;

  return (
    <span
      className={`badge-relationship ${badgeClass}`}
      style={{ opacity }}
      title={`${relationship} (${Math.round(weight * 100)}% strength)`}
    >
      {relationship}: {targetName}
    </span>
  );
}
