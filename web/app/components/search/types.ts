/**
 * Shared type definitions for Memory Explorer Search
 * These types match the Convex API response structure
 */

export type MergedResult = {
  type: "item" | "node";
  content: string;
  score: number;
  finalScore: number;
  timestamp: number;
  source: "vector" | "graph" | "hybrid";
  /** Node ID for graph nodes (used for graph visualization filtering) */
  nodeId?: string;

  // For editing (Item-specific fields)
  /** Item ID for items (used for editing/deletion) */
  itemId?: string;
  /** Category for items (tech_preferences, projects, etc.) */
  category?: string;
  /** Number of times this item has been accessed */
  accessCount?: number;

  // For editing (Node-specific fields)
  /** Node name for graph nodes */
  name?: string;
  /** Node type (project, tool, skill, concept) */
  nodeType?: string;
  /** Node description from properties */
  description?: string;
  /** Node status (active, archived) */
  status?: string;
};

export type HybridSearchResult = {
  query: string;
  results: Array<MergedResult>;
  context: string;
  executionTime: number;
};
