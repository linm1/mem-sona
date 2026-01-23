import type { TooltipNodeData, TooltipPosition, NodeType } from './types';

/**
 * Props for NodeTooltip component.
 */
interface NodeTooltipProps {
  /** Node data to display, or null to hide tooltip */
  node: TooltipNodeData | null;
  /** Position for the tooltip */
  position: TooltipPosition;
}

/**
 * Get the badge class for a node type.
 */
function getTypeBadgeClass(type: NodeType): string {
  switch (type) {
    case 'project':
      return 'bg-highlight text-paper';
    case 'tool':
      return 'bg-muted text-paper';
    case 'skill':
      return 'bg-accent text-paper';
    case 'concept':
    default:
      return 'bg-ink text-paper';
  }
}

/**
 * Tooltip component for displaying node details on hover.
 * Shows node label, type badge, and description.
 */
export function NodeTooltip({ node, position }: NodeTooltipProps) {
  if (!node) return null;

  const badgeClass = getTypeBadgeClass(node.type);

  return (
    <div
      data-testid="node-tooltip"
      className="absolute z-50 min-w-[200px] max-w-[300px] p-3 bg-paper border-2 border-ink pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      <div className="space-y-2">
        {/* Header with label and type badge */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wide truncate">
            {node.label}
          </h3>
          <span
            className={`px-2 py-0.5 text-xs font-mono uppercase ${badgeClass}`}
          >
            {node.type}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-muted">
          {node.description || 'No description'}
        </p>
      </div>
    </div>
  );
}
