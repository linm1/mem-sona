/**
 * TypeBadge component - displays the type of memory result (item or node)
 */

interface TypeBadgeProps {
  type: 'item' | 'node';
}

/**
 * Badge component for displaying memory result type
 *
 * @example
 * ```tsx
 * <TypeBadge type="item" />
 * <TypeBadge type="node" />
 * ```
 */
export function TypeBadge({ type }: TypeBadgeProps) {
  const typeClass = type === 'item' ? 'badge-project' : 'badge-tool';

  return (
    <span className={`badge-node ${typeClass}`}>
      {type}
    </span>
  );
}
