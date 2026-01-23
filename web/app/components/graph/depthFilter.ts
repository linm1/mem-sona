import type { Core, NodeSingular } from 'cytoscape';

/**
 * Depth filter options.
 */
export interface DepthFilterOptions {
  /** Cytoscape instance */
  cy: Core;
  /** Center node ID for depth calculation */
  centerNodeId: string;
  /** Maximum depth (1, 2, or 3 hops) */
  depth: number;
}

/**
 * Result of depth filtering.
 */
export interface DepthFilterResult {
  /** Node IDs within the specified depth */
  visibleNodeIds: Set<string>;
  /** Edge IDs within the specified depth */
  visibleEdgeIds: Set<string>;
  /** Total nodes in graph */
  totalNodes: number;
  /** Nodes hidden by filter */
  hiddenNodes: number;
}

/**
 * Perform BFS traversal to find nodes within N hops of a center node.
 *
 * @param options - Depth filter configuration
 * @returns Set of node IDs within the specified depth
 */
export function getNodesWithinDepth(options: DepthFilterOptions): DepthFilterResult {
  const { cy, centerNodeId, depth } = options;

  const centerNode = cy.getElementById(centerNodeId);
  if (!centerNode.length || !centerNode.isNode()) {
    return {
      visibleNodeIds: new Set(),
      visibleEdgeIds: new Set(),
      totalNodes: cy.nodes().length,
      hiddenNodes: cy.nodes().length,
    };
  }

  // BFS to find nodes within depth
  const visibleNodeIds = new Set<string>([centerNodeId]);
  const visibleEdgeIds = new Set<string>();
  const visited = new Set<string>([centerNodeId]);
  let currentLevel: NodeSingular[] = [centerNode as NodeSingular];

  for (let d = 0; d < depth; d++) {
    const nextLevel: NodeSingular[] = [];

    for (const node of currentLevel) {
      // Get all connected edges
      node.connectedEdges().forEach((edge) => {
        const sourceId = edge.data('source');
        const targetId = edge.data('target');
        const neighborId = sourceId === node.id() ? targetId : sourceId;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          visibleNodeIds.add(neighborId);
          const neighborNode = cy.getElementById(neighborId);
          if (neighborNode.length && neighborNode.isNode()) {
            nextLevel.push(neighborNode as NodeSingular);
          }
        }

        // Add edge if both endpoints are visible
        if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
          visibleEdgeIds.add(edge.id());
        }
      });
    }

    currentLevel = nextLevel;
    if (nextLevel.length === 0) break;
  }

  // Re-check all edges to ensure we have all edges between visible nodes
  cy.edges().forEach((edge) => {
    const sourceId = edge.data('source');
    const targetId = edge.data('target');
    if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
      visibleEdgeIds.add(edge.id());
    }
  });

  const totalNodes = cy.nodes().length;
  const hiddenNodes = totalNodes - visibleNodeIds.size;

  return {
    visibleNodeIds,
    visibleEdgeIds,
    totalNodes,
    hiddenNodes,
  };
}

/**
 * Apply depth filter to the graph by hiding/showing elements.
 * Uses CSS classes for visibility since Cytoscape types are strict.
 *
 * @param cy - Cytoscape instance
 * @param centerNodeId - Center node ID (null to show all)
 * @param depth - Depth limit (null to show all)
 */
export function applyDepthFilter(
  cy: Core,
  centerNodeId: string | null,
  depth: number | null
): void {
  // Show all if no filter
  if (!centerNodeId || !depth) {
    cy.elements().removeClass('depth-hidden');
    cy.elements().style('display', 'element');
    return;
  }

  const result = getNodesWithinDepth({ cy, centerNodeId, depth });

  // Batch update for performance
  cy.batch(() => {
    // Hide all first
    cy.elements().addClass('depth-hidden');
    cy.elements().style('display', 'none');

    // Show visible nodes
    result.visibleNodeIds.forEach((nodeId) => {
      const node = cy.getElementById(nodeId);
      node.removeClass('depth-hidden');
      node.style('display', 'element');
    });

    // Show visible edges
    result.visibleEdgeIds.forEach((edgeId) => {
      const edge = cy.getElementById(edgeId);
      edge.removeClass('depth-hidden');
      edge.style('display', 'element');
    });
  });
}

/**
 * Clear depth filter and show all elements.
 *
 * @param cy - Cytoscape instance
 */
export function clearDepthFilter(cy: Core): void {
  cy.batch(() => {
    cy.elements().removeClass('depth-hidden');
    cy.elements().style('display', 'element');
  });
}
