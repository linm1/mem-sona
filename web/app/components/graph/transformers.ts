import type {
  GraphNode,
  GraphEdge,
  CytoscapeNode,
  CytoscapeEdge,
  CytoscapeElement,
} from './types';

/**
 * Transform a Convex GraphNode to Cytoscape node format.
 * Maps database fields to visualization-friendly structure.
 */
export function transformNodeToCytoscape(node: GraphNode): CytoscapeNode {
  return {
    data: {
      id: node._id,
      label: node.name,
      type: node.type,
      description: node.properties.description,
    },
  };
}

/**
 * Transform a Convex GraphEdge to Cytoscape edge format.
 * Maps database fields including relationship metadata.
 */
export function transformEdgeToCytoscape(edge: GraphEdge): CytoscapeEdge {
  return {
    data: {
      id: edge._id,
      source: edge.fromNode,
      target: edge.toNode,
      relationship: edge.relationship,
      weight: edge.weight,
      status: edge.status,
    },
  };
}

/**
 * Transform arrays of nodes and edges to Cytoscape elements.
 * Nodes are placed before edges for proper Cytoscape initialization.
 *
 * @param nodes - Array of GraphNode from Convex
 * @param edges - Array of GraphEdge from Convex
 * @returns Combined array of Cytoscape elements
 */
export function transformGraphData(
  nodes: GraphNode[],
  edges: GraphEdge[]
): CytoscapeElement[] {
  const cytoscapeNodes = nodes.map(transformNodeToCytoscape);
  const cytoscapeEdges = edges.map(transformEdgeToCytoscape);
  return [...cytoscapeNodes, ...cytoscapeEdges];
}
