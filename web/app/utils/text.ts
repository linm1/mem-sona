/**
 * Text utility functions for pluralization and type counting
 *
 * Shared utilities extracted from ConnectionsDrawer and ConnectionsSection
 * to eliminate duplication and ensure consistency.
 */

/**
 * Edge interface for type counting
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
 * Pluralize a word based on count
 *
 * @param word - The word to pluralize (e.g., "skill", "tool", "project", "concept")
 * @param count - The count to determine singular (1) or plural (not 1)
 * @returns Singular form if count === 1, plural form otherwise
 *
 * @example
 * ```typescript
 * pluralize('skill', 1) // 'skill'
 * pluralize('skill', 0) // 'skills'
 * pluralize('skill', 5) // 'skills'
 * pluralize('tool', 2) // 'tools'
 * pluralize('project', 1) // 'project'
 * ```
 */
export function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  if (word === 'skill') return 'skills';
  if (word === 'tool') return 'tools';
  if (word === 'project') return 'projects';
  if (word === 'concept') return 'concepts';
  return `${word}s`;
}

/**
 * Calculate counts by node type from an array of edges
 *
 * @param edges - Array of edge objects with targetNodeType property
 * @returns Record mapping node types to their counts
 *
 * @example
 * ```typescript
 * const edges = [
 *   { targetNodeType: 'tool', ... },
 *   { targetNodeType: 'tool', ... },
 *   { targetNodeType: 'skill', ... }
 * ];
 * getTypeCounts(edges) // { tool: 2, skill: 1 }
 * ```
 */
export function getTypeCounts(edges: Edge[]): Record<string, number> {
  return edges.reduce(
    (acc, edge) => {
      const type = edge.targetNodeType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}
