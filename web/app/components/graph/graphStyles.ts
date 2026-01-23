import type { NodeType, EdgeStatus, EdgeStyleConfig } from './types';

/**
 * Cytoscape stylesheet definition type.
 */
interface CytoscapeStyleDefinition {
  selector: string;
  style: Record<string, unknown>;
}

/**
 * Color palette matching globals.css design system.
 */
export const COLORS = {
  paper: '#fefefe',
  ink: '#323232',
  inkBlack: '#383838',
  muted: '#595456',
  accent: '#03b57b',
  accentHover: '#02a06c',
  highlight: '#ea940c',
  danger: '#FF5F56',
  archived: '#999999',
} as const;

/**
 * Get background color for node based on type.
 * Matches badge colors from globals.css.
 */
export function getNodeTypeColor(type: NodeType): string {
  switch (type) {
    case 'project':
      return COLORS.highlight;
    case 'tool':
      return COLORS.muted;
    case 'skill':
      return COLORS.accent;
    case 'concept':
    default:
      return COLORS.ink;
  }
}

/**
 * Get node size based on type.
 * Projects are largest (most important), concepts smallest.
 */
export function getNodeTypeSize(type: NodeType): number {
  switch (type) {
    case 'project':
      return 50;
    case 'tool':
    case 'skill':
      return 40;
    case 'concept':
    default:
      return 35;
  }
}

/**
 * Get edge style based on status and weight.
 *
 * @param status - Edge status (active, archived, superseded)
 * @param weight - Edge weight (0-1, affects line width)
 */
export function getEdgeStyle(
  status: EdgeStatus,
  weight: number
): EdgeStyleConfig {
  const isArchived = status === 'archived' || status === 'superseded';
  const baseWidth = 1;
  const maxWidth = 4;

  // Calculate width: baseWidth + weight * (maxWidth - baseWidth)
  // weight=0 -> 1, weight=1 -> 4
  const width = baseWidth + weight * (maxWidth - baseWidth);

  // Determine opacity based on status
  let opacity: number;
  if (status === 'superseded') {
    opacity = 0.4;
  } else if (status === 'archived') {
    opacity = 0.5;
  } else {
    opacity = 0.8;
  }

  return {
    lineStyle: isArchived ? 'dashed' : 'solid',
    width,
    color: isArchived ? COLORS.archived : COLORS.muted,
    opacity,
  };
}

/**
 * Generate complete Cytoscape stylesheet.
 * Includes styles for all node types, edge statuses, and interaction states.
 */
export function generateCytoscapeStylesheet(): CytoscapeStyleDefinition[] {
  return [
    // Base node style
    {
      selector: 'node',
      style: {
        'background-color': COLORS.ink,
        label: 'data(label)',
        color: COLORS.ink,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 8,
        'font-size': '10px',
        'font-family': 'Space Mono, monospace',
        'text-transform': 'uppercase',
        'border-width': 2,
        'border-color': COLORS.ink,
        width: 40,
        height: 40,
      },
    },
    // Project nodes - largest, highlight color
    {
      selector: 'node[type="project"]',
      style: {
        'background-color': COLORS.highlight,
        width: 50,
        height: 50,
      },
    },
    // Tool nodes - medium, muted color
    {
      selector: 'node[type="tool"]',
      style: {
        'background-color': COLORS.muted,
        width: 40,
        height: 40,
      },
    },
    // Skill nodes - medium, accent color
    {
      selector: 'node[type="skill"]',
      style: {
        'background-color': COLORS.accent,
        width: 40,
        height: 40,
      },
    },
    // Concept nodes - smallest, ink color
    {
      selector: 'node[type="concept"]',
      style: {
        'background-color': COLORS.ink,
        width: 35,
        height: 35,
      },
    },
    // Selected node - accent border
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': COLORS.accent,
      },
    },
    // Hovered/active node - overlay effect
    {
      selector: 'node:active',
      style: {
        'overlay-color': COLORS.accent,
        'overlay-opacity': 0.2,
      },
    },
    // Base edge style
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': COLORS.muted,
        'target-arrow-color': COLORS.muted,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        opacity: 0.8,
        'font-size': '8px',
        'font-family': 'Space Mono, monospace',
      },
    },
    // Active edges - solid line
    {
      selector: 'edge[status="active"]',
      style: {
        'line-style': 'solid',
      },
    },
    // Archived edges - dashed, muted
    {
      selector: 'edge[status="archived"]',
      style: {
        'line-style': 'dashed',
        'line-color': COLORS.archived,
        'target-arrow-color': COLORS.archived,
        opacity: 0.5,
      },
    },
    // Superseded edges - dashed, most muted
    {
      selector: 'edge[status="superseded"]',
      style: {
        'line-style': 'dashed',
        'line-color': COLORS.archived,
        'target-arrow-color': COLORS.archived,
        opacity: 0.4,
      },
    },
    // Selected edge - accent color
    {
      selector: 'edge:selected',
      style: {
        'line-color': COLORS.accent,
        'target-arrow-color': COLORS.accent,
        width: 3,
      },
    },
  ];
}
