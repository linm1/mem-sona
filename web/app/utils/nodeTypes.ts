/**
 * Node Type Utilities
 *
 * Shared constants and functions for working with graph node types.
 * Provides consistent color mappings and badge class generation.
 */

/**
 * Color mappings for node type badges
 * Used for displaying node types with consistent visual styling
 */
export const NODE_TYPE_COLORS: Record<string, string> = {
  project: 'bg-highlight text-paper',
  tool: 'bg-muted text-paper',
  skill: 'bg-accent text-paper',
  concept: 'bg-ink text-paper',
};

/**
 * Get the badge class for a given node type
 *
 * @param nodeType - The type of node (project, tool, skill, concept)
 * @returns CSS class name for the badge
 *
 * @example
 * ```typescript
 * const badgeClass = getNodeTypeBadgeClass('tool');
 * // Returns: 'badge-tool'
 * ```
 */
export function getNodeTypeBadgeClass(nodeType: string): string {
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
