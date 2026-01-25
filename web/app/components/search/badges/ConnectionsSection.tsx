import type { ReactNode } from 'react';

/**
 * ConnectionsSection component - collapsible list of node connections
 *
 * Displays relationships at the bottom of memory cards in a format
 * matching the /graph page's NodeInfoPanel:
 * - Collapsible via native <details> element
 * - Type counts summary (e.g., "3 concepts 8 tools 1 skill")
 * - List of connections with arrows and colored target badges
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

export interface ConnectionsSectionProps {
  /** List of edges/connections to display */
  edges: Edge[];
  /** Whether connections section is open by default */
  defaultOpen?: boolean;
}

/**
 * Type badge background color mapping (matches NodeInfoPanel)
 */
const TYPE_COLORS: Record<string, string> = {
  project: 'bg-highlight text-paper',
  tool: 'bg-muted text-paper',
  skill: 'bg-accent text-paper',
  concept: 'bg-ink text-paper',
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
  // Handle special pluralization
  if (word === 'skill') return 'skills';
  if (word === 'tool') return 'tools';
  if (word === 'project') return 'projects';
  if (word === 'concept') return 'concepts';
  return `${word}s`;
}

/**
 * Individual edge item in the connections list
 */
function EdgeItem({ edge }: { edge: Edge }) {
  const colorClass = TYPE_COLORS[edge.targetNodeType] || TYPE_COLORS.concept;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted">→</span>
      <span className="font-mono text-accent">{edge.relationship}</span>
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
 * Collapsible connections section for memory cards
 *
 * @example
 * ```tsx
 * <ConnectionsSection
 *   edges={result.edges}
 *   defaultOpen={false}
 * />
 * ```
 */
export function ConnectionsSection({
  edges,
  defaultOpen = false,
}: ConnectionsSectionProps): ReactNode {
  // Return null for empty edges
  if (edges.length === 0) {
    return null;
  }

  const typeCounts = getTypeCounts(edges);
  const connectionLabel = edges.length === 1 ? 'connection' : 'connections';

  return (
    <div className="border-t border-ink/10 pt-3 mt-auto">
      {/* Type counts summary */}
      <div className="flex gap-2 flex-wrap mb-2">
        {Object.entries(typeCounts).map(([nodeType, count]) => (
          <span
            key={nodeType}
            className={`text-xs font-mono ${
              nodeType === 'project'
                ? 'text-highlight'
                : nodeType === 'skill'
                  ? 'text-accent'
                  : 'text-muted'
            }`}
          >
            {count} {pluralize(nodeType, count)}
          </span>
        ))}
      </div>

      {/* Collapsible connections list */}
      <details className="group" role="group" open={defaultOpen}>
        <summary className="text-xs font-mono-brutal text-muted cursor-pointer hover:text-ink mb-2 list-none">
          ▼ {edges.length} {connectionLabel}
        </summary>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {edges.map((edge, idx) => (
            <EdgeItem key={`${edge.relationship}-${edge.targetName}-${idx}`} edge={edge} />
          ))}
        </div>
      </details>
    </div>
  );
}
