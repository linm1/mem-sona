import type { ElementDefinition } from 'cytoscape';

/**
 * Node type in the knowledge graph.
 * Matches the graphNodes table schema in Convex.
 */
export type NodeType = 'project' | 'tool' | 'skill' | 'concept';

/**
 * Edge status in the knowledge graph.
 * Matches the graphEdges table schema in Convex.
 */
export type EdgeStatus = 'active' | 'archived' | 'superseded';

/**
 * Graph node from Convex database.
 * Mirrors Doc<"graphNodes"> structure.
 */
export interface GraphNode {
  _id: string;
  name: string;
  type: NodeType;
  properties: {
    description?: string;
    status?: string;
    url?: string;
  };
  status: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Graph edge from Convex database.
 * Mirrors Doc<"graphEdges"> structure.
 */
export interface GraphEdge {
  _id: string;
  fromNode: string;
  toNode: string;
  relationship: string;
  weight: number;
  properties: {
    context?: string;
    since?: number;
  };
  status: EdgeStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Cytoscape node element format.
 */
export interface CytoscapeNode extends ElementDefinition {
  data: {
    id: string;
    label: string;
    type: NodeType;
    description?: string;
  };
}

/**
 * Cytoscape edge element format.
 */
export interface CytoscapeEdge extends ElementDefinition {
  data: {
    id: string;
    source: string;
    target: string;
    relationship: string;
    weight: number;
    status: EdgeStatus;
  };
}

/**
 * Union type for all Cytoscape elements.
 */
export type CytoscapeElement = CytoscapeNode | CytoscapeEdge;

/**
 * Props for the GraphViewer component.
 */
export interface GraphViewerProps {
  /** Additional CSS classes */
  className?: string;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Optional filter by node type */
  nodeTypeFilter?: NodeType;
  /** Optional filter by relationship */
  relationshipFilter?: string;
}

/**
 * Data for node tooltip display.
 */
export interface TooltipNodeData {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
}

/**
 * Position coordinates for tooltip.
 */
export interface TooltipPosition {
  x: number;
  y: number;
}

/**
 * Result from useGraphData hook.
 */
export interface UseGraphDataResult {
  elements: CytoscapeElement[];
  isLoading: boolean;
  isEmpty: boolean;
  nodeCount: number;
  edgeCount: number;
  error: Error | null;
}

/**
 * Options for useGraphData hook.
 */
export interface UseGraphDataOptions {
  nodeType?: NodeType;
  relationship?: string;
}

/**
 * Edge style configuration.
 */
export interface EdgeStyleConfig {
  lineStyle: 'solid' | 'dashed';
  width: number;
  color: string;
  opacity: number;
}

/**
 * Connected edge information for node info panel.
 */
export interface ConnectedEdge {
  id: string;
  relationship: string;
  targetId: string;
  targetLabel: string;
  targetType: NodeType;
  weight: number;
  status: EdgeStatus;
  direction: 'outgoing' | 'incoming';
}

/**
 * Selected node data with connected edges for info panel.
 */
export interface SelectedNodeData {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  edges: ConnectedEdge[];
}
