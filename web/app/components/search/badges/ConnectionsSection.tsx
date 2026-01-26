import type { ReactNode } from 'react';
import { NODE_TYPE_COLORS } from '@/app/utils/nodeTypes';
import { pluralize, getTypeCounts, type Edge } from '@/app/utils/text';

/**
 * ConnectionsSection component - collapsible list of node connections
 *
 * Displays relationships at the bottom of memory cards in a format
 * matching the /graph page's NodeInfoPanel:
 * - Collapsible via native <details> element
 * - Type counts summary (e.g., "3 concepts 8 tools 1 skill")
 * - List of connections with arrows and colored target badges
 */

export interface ConnectionsSectionProps {
  /** List of edges/connections to display */
  edges: Edge[];
  /** Whether connections section is open by default */
  defaultOpen?: boolean;
}

/**
 * Individual edge item in the connections list
 */
function EdgeItem({ edge }: { edge: Edge }) {
  const colorClass = NODE_TYPE_COLORS[edge.targetNodeType] || NODE_TYPE_COLORS.concept;

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
