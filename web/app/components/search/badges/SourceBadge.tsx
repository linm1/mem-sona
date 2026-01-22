/**
 * SourceBadge component - displays the source of memory result (vector, graph, or hybrid)
 */

interface SourceBadgeProps {
  source: 'vector' | 'graph' | 'hybrid';
}

/**
 * Badge component for displaying memory result source
 *
 * @example
 * ```tsx
 * <SourceBadge source="vector" />
 * <SourceBadge source="graph" />
 * <SourceBadge source="hybrid" />
 * ```
 */
export function SourceBadge({ source }: SourceBadgeProps) {
  const sourceClass =
    source === 'vector'
      ? 'badge-skill'
      : source === 'graph'
      ? 'badge-tool'
      : 'badge-concept';

  return (
    <span className={`badge-node ${sourceClass}`}>
      {source}
    </span>
  );
}
