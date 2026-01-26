// convex/retrieval/types.ts
// Type definitions for hybrid search retrieval system

import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Results from vector search on items table.
 * Represents atomic facts retrieved via semantic similarity search.
 *
 * Used when searching the file-based memory layer (resources → items → categories).
 */
export type VectorResult = {
  /** Unique ID of the item in the items table */
  itemId: Id<"items">;
  /** The actual fact/content text */
  content: string;
  /** Raw similarity score from vector search (0-1) */
  score: number;
  /** Unix timestamp (ms) when item was created */
  timestamp: number;
  /** Category classification (e.g., "tech_preferences", "projects") */
  category: string;
};

/**
 * Convex validator for VectorResult type.
 * Used for type-safe argument validation in internal actions.
 */
export const vectorResultValidator = v.object({
  itemId: v.id("items"),
  content: v.string(),
  score: v.number(),
  timestamp: v.number(),
  category: v.string(),
});

/**
 * Results from graph search on nodes table.
 * Represents entities (projects, tools, skills) retrieved via semantic similarity.
 *
 * Used when searching the graph-based memory layer (nodes + edges).
 */
export type GraphResult = {
  /** Unique ID of the node in the graphNodes table */
  nodeId: Id<"graphNodes">;
  /** Node type classification (e.g., "project", "tool", "skill", "person") */
  nodeType: string;
  /** Contextual description of the node */
  context: string;
  /** Raw similarity score from vector search (0-1) */
  score: number;
  /** Unix timestamp (ms) when node was created */
  timestamp: number;
  /** Number of edges connected to this node (relationship count) */
  edges: number;
};

/**
 * Convex validator for GraphResult type.
 * Used for type-safe argument validation in internal actions.
 */
export const graphResultValidator = v.object({
  nodeId: v.id("graphNodes"),
  nodeType: v.string(),
  context: v.string(),
  score: v.number(),
  timestamp: v.number(),
  edges: v.number(),
});

/**
 * Edge/relationship data for graph nodes.
 * Represents a connection from a node to another entity.
 */
export type EdgeData = {
  /** Relationship type (e.g., "uses", "requires", "knows") */
  relationship: string;
  /** Name of the target node */
  targetName: string;
  /** Type of the target node (project, tool, skill, concept) */
  targetNodeType: string;
  /** Relationship strength/confidence (0-1) */
  weight: number;
};

/**
 * Convex validator for EdgeData type.
 */
export const edgeDataValidator = v.object({
  relationship: v.string(),
  targetName: v.string(),
  targetNodeType: v.string(),
  weight: v.number(),
});

/**
 * Merged results from both vector and graph search.
 * Represents the unified output after combining and deduplicating results from both layers.
 *
 * This is the intermediate format before returning to the MCP server.
 */
export type MergedResult = {
  /** Type of memory source: item (file-based) or node (graph-based) */
  type: "item" | "node";
  /** The content/context text to display */
  content: string;
  /** Original similarity score from vector search (0-1) */
  score: number;
  /** Final score after applying time-decay and deduplication (0-1) */
  finalScore: number;
  /** Unix timestamp (ms) when memory was created */
  timestamp: number;
  /** Which search contributed this result: vector-only, graph-only, or both */
  source: "vector" | "graph" | "hybrid";
  /** Node ID for graph nodes (used for graph visualization filtering) */
  nodeId?: string;
  // Item-specific fields (for editing)
  /** Item ID for items (used for editing/deletion) */
  itemId?: string;
  /** Category for items (tech_preferences, projects, etc.) */
  category?: string;
  // Node-specific fields (for editing)
  /** Node name for graph nodes */
  name?: string;
  /** Node type (project, tool, skill, concept) */
  nodeType?: string;
  /** Node description from properties */
  description?: string;
  /** Edge/relationship data for nodes (outgoing edges) */
  edges?: EdgeData[];
};

/**
 * Convex validator for MergedResult type.
 * Used for type-safe argument validation in internal actions.
 */
export const mergedResultValidator = v.object({
  type: v.union(v.literal("item"), v.literal("node")),
  content: v.string(),
  score: v.number(),
  finalScore: v.number(),
  timestamp: v.number(),
  source: v.union(v.literal("vector"), v.literal("graph"), v.literal("hybrid")),
  nodeId: v.optional(v.string()),
  // Item-specific fields (for editing)
  itemId: v.optional(v.string()),
  category: v.optional(v.string()),
  // Node-specific fields (for editing)
  name: v.optional(v.string()),
  nodeType: v.optional(v.string()),
  description: v.optional(v.string()),
  // Edge/relationship data for nodes
  edges: v.optional(v.array(edgeDataValidator)),
});

/**
 * Final hybrid search result returned to MCP server.
 * Contains the complete response for a memory search query.
 *
 * This is what the MCP tool `memory_search` will return to Claude Code/Copilot/Cursor.
 */
export type HybridSearchResult = {
  /** The original search query string */
  query: string;
  /** Array of merged and ranked results */
  results: Array<MergedResult>;
  /** Formatted context string combining all results for LLM consumption */
  context: string;
  /** Query execution time in milliseconds (for performance monitoring) */
  executionTime: number;
};

// ============ RRF (RECIPROCAL RANK FUSION) TYPES ============

/**
 * Input type for vector search results in RRF fusion.
 * Represents atomic facts from the file-based memory layer.
 *
 * IMPORTANT: Results must be sorted by raw score (descending) for proper RRF ranking.
 * Time-decay is NOT applied to these scores - it's applied AFTER fusion.
 */
export type RRFVectorInput = {
  /** Unique ID of the item in the items table */
  itemId: Id<"items">;
  /** The actual fact/content text */
  content: string;
  /** RAW similarity score from vector search (no time-decay applied) */
  rawScore: number;
  /** Unix timestamp (ms) when item was created - needed for post-fusion time-decay */
  timestamp: number;
  /** Category classification (e.g., "tech_preferences", "projects") */
  category: string;
};

/**
 * Convex validator for RRFVectorInput type.
 * Used for type-safe argument validation in internal actions.
 */
export const rrfVectorInputValidator = v.object({
  itemId: v.id("items"),
  content: v.string(),
  rawScore: v.number(),
  timestamp: v.number(),
  category: v.string(),
});

/**
 * Input type for graph search results in RRF fusion.
 * Represents entities (projects, tools, skills) from the graph-based memory layer.
 *
 * IMPORTANT: Results must be sorted by raw score (descending) for proper RRF ranking.
 * Time-decay is NOT applied to these scores - it's applied AFTER fusion.
 */
export type RRFGraphInput = {
  /** Unique ID of the node in the graphNodes table */
  nodeId: Id<"graphNodes">;
  /** Node type classification (e.g., "project", "tool", "skill", "concept") */
  nodeType: string;
  /** Contextual description of the node including relationships */
  context: string;
  /** RAW similarity score from vector search (no time-decay applied) */
  rawScore: number;
  /** Unix timestamp (ms) when node was created - needed for post-fusion time-decay */
  timestamp: number;
  /** Number of edges connected to this node (relationship count) */
  edges: number;
};

/**
 * Convex validator for RRFGraphInput type.
 * Used for type-safe argument validation in internal actions.
 */
export const rrfGraphInputValidator = v.object({
  nodeId: v.id("graphNodes"),
  nodeType: v.string(),
  context: v.string(),
  rawScore: v.number(),
  timestamp: v.number(),
  edges: v.number(),
});

/**
 * Output type from RRF fusion algorithm.
 * Represents a merged result with RRF score and time-decay applied.
 *
 * The finalScore is calculated as: RRF_score × time_decay_factor
 * Where RRF_score = Σ(weight_i × 1/(rank_i + k))
 */
export type RRFFusedResult = {
  /** Type of memory source: item (file-based) or node (graph-based) */
  type: "item" | "node";
  /** The content/context text to display */
  content: string;
  /** RRF score BEFORE time-decay (for debugging/analysis) */
  rrfScore: number;
  /** Final score AFTER applying time-decay: rrfScore × decayFactor */
  finalScore: number;
  /** Unix timestamp (ms) - earliest timestamp if content appeared in both sources */
  timestamp: number;
  /** Which search contributed this result: vector-only, graph-only, or both */
  sources: Array<"vector" | "graph">;
  /** Node ID for graph nodes (used for graph visualization filtering) */
  nodeId?: string;
};

/**
 * Convex validator for RRFFusedResult type.
 * Used for type-safe argument validation in internal actions.
 */
export const rrfFusedResultValidator = v.object({
  type: v.union(v.literal("item"), v.literal("node")),
  content: v.string(),
  rrfScore: v.number(),
  finalScore: v.number(),
  timestamp: v.number(),
  sources: v.array(v.union(v.literal("vector"), v.literal("graph"))),
  nodeId: v.optional(v.string()),
});

// ============ 4-WAY HYBRID SEARCH TYPES ============

/** Source type indicating which search method(s) found the result */
export type SourceType4Way = "vector" | "text" | "hybrid";

/** Result type indicating whether the result is an item or node */
export type ResultType4Way = "item" | "node";

/** Merged item result from 4-way search */
export interface MergedItemResult {
  _id: string;
  content: string;
  category: string;
  createdAt: number;
  rrfScore: number;
  sourceType: SourceType4Way;
  resultType: "item";
  vectorRank?: number;
  textRank?: number;
}

/** Merged node result from 4-way search */
export interface MergedNodeResult {
  _id: string;
  name: string;
  type: string;
  context: string;
  createdAt: number;
  rrfScore: number;
  sourceType: SourceType4Way;
  resultType: "node";
  nodeId: string;
  vectorRank?: number;
  textRank?: number;
  /** Node description from properties (for editing) */
  description?: string;
  /** Edge/relationship data for nodes (outgoing edges) */
  edges?: EdgeData[];
}

/** Combined result (item or node) before time decay */
export interface CombinedResult4Way {
  _id: string;
  content: string;
  createdAt: number;
  rrfScore: number;
  sourceType: SourceType4Way;
  resultType: ResultType4Way;
  nodeId?: string;
  vectorRank?: number;
  textRank?: number;
  // Item metadata (for editing)
  /** Category for items (tech_preferences, projects, etc.) */
  category?: string;
  // Node metadata (for editing)
  /** Node name for graph nodes */
  name?: string;
  /** Node type (project, tool, skill, concept) */
  type?: string;
  /** Node description from properties */
  description?: string;
  /** Edge/relationship data for nodes (outgoing edges) */
  edges?: EdgeData[];
}

/** Final result after time decay is applied */
export interface FinalResult4Way extends CombinedResult4Way {
  finalScore: number;
  decayFactor: number;
  ageDays: number;
}
