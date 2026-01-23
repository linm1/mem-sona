// convex/retrieval.ts
// Hybrid Search - Combines vector and graph search for comprehensive memory retrieval

import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { SEARCH_CONFIG, RRF_CONFIG } from "./utils/constants";

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
const vectorResultValidator = v.object({
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
const graphResultValidator = v.object({
  nodeId: v.id("graphNodes"),
  nodeType: v.string(),
  context: v.string(),
  score: v.number(),
  timestamp: v.number(),
  edges: v.number(),
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
};

/**
 * Convex validator for MergedResult type.
 * Used for type-safe argument validation in internal actions.
 */
const mergedResultValidator = v.object({
  type: v.union(v.literal("item"), v.literal("node")),
  content: v.string(),
  score: v.number(),
  finalScore: v.number(),
  timestamp: v.number(),
  source: v.union(v.literal("vector"), v.literal("graph"), v.literal("hybrid")),
  nodeId: v.optional(v.string()),
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
const rrfVectorInputValidator = v.object({
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
const rrfGraphInputValidator = v.object({
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
const rrfFusedResultValidator = v.object({
  type: v.union(v.literal("item"), v.literal("node")),
  content: v.string(),
  rrfScore: v.number(),
  finalScore: v.number(),
  timestamp: v.number(),
  sources: v.array(v.union(v.literal("vector"), v.literal("graph"))),
  nodeId: v.optional(v.string()),
});

/**
 * Calculate time-decay factor for memory relevance scoring.
 * Uses configurable half-life: recent memories score higher than old ones.
 *
 * This implements temporal decay to prioritize recent information over stale facts.
 * Formula: decay = 1.0 / (1.0 + (ageDays / halfLifeDays))
 * - 0 days old → 1.0 (full weight)
 * - halfLifeDays old → 0.5 (half weight)
 * - 2*halfLifeDays old → 0.33 (one-third weight)
 * - 365 days old → 0.076 (heavily decayed, with 30-day half-life)
 *
 * @param timestamp - Unix timestamp in milliseconds of when memory was created/updated
 * @returns Decay factor between 0 and 1 (1.0 = current, approaches 0 for very old)
 */
export function calculateTimeDecay(timestamp: number): number {
  const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return 1.0 / (1.0 + (ageDays / SEARCH_CONFIG.TIME_DECAY_HALFLIFE_DAYS));
}

/**
 * Generate deterministic hash of content for deduplication.
 * Used to detect duplicate results when both vector and graph searches return similar content.
 *
 * This prevents showing the same information twice when an entity appears in both
 * the file-based layer (as an item) and the graph layer (as a node).
 *
 * NOTE: This is a simple string hash implementation that works in Convex runtime.
 * For production use in Node.js actions, use crypto.createHash("sha256") instead.
 *
 * @param content - Text content to hash
 * @returns Deterministic hash string
 */
export function hashContent(content: string): string {
  // Simple hash function compatible with Convex runtime (no Node.js APIs)
  // This uses a DJB2 hash algorithm - fast and good distribution
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) + hash) + char; // hash * 33 + char
  }
  // Convert to unsigned 32-bit hex string
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ============ RRF FUSION ALGORITHM ============

/**
 * Weighted Time-Decay Reciprocal Rank Fusion (RRF) algorithm.
 *
 * Combines ranked results from vector and graph search using RRF,
 * then applies time-decay AFTER fusion for clean separation of concerns.
 *
 * Why RRF over score averaging:
 * - Immune to score range differences (vector vs graph scores may differ)
 * - Focuses on ranking consistency, not absolute scores
 * - Duplicates get accumulated RRF scores (boosted, not averaged)
 * - No threshold needed - always returns Top-K results
 *
 * Formula:
 * - RRF_score = Σ(weight_i × 1/(rank_i + k))
 * - final_score = RRF_score × decay_factor
 * - decay_factor = 1 / (1 + age_days / half_life_days)
 *
 * @param vectorResults - Results from vector search, sorted by rawScore (descending)
 * @param graphResults - Results from graph search, sorted by rawScore (descending)
 * @param topK - Maximum number of results to return (default: RRF_CONFIG.DEFAULT_TOP_K)
 * @returns Array of RRFFusedResult sorted by finalScore (descending)
 */
export function weightedTimeDecayRRF(
  vectorResults: Array<RRFVectorInput>,
  graphResults: Array<RRFGraphInput>,
  topK: number = RRF_CONFIG.DEFAULT_TOP_K
): Array<RRFFusedResult> {
  // Map for accumulating RRF scores by content hash
  const fused = new Map<string, {
    type: "item" | "node";
    rrfScore: number;
    timestamp: number;
    content: string;
    sources: Set<"vector" | "graph">;
    nodeId?: string;
  }>();

  // Process vector results (must be sorted by rawScore, descending)
  vectorResults.forEach((item: RRFVectorInput, index: number) => {
    const rank = index + 1; // 1-indexed for RRF formula
    const key = hashContent(item.content);
    const contribution = RRF_CONFIG.VECTOR_WEIGHT * (1 / (rank + RRF_CONFIG.CONSTANT));

    if (fused.has(key)) {
      // Content already exists - accumulate RRF score
      const existing = fused.get(key)!;
      existing.rrfScore += contribution;
      existing.sources.add("vector");
      // Keep earliest timestamp for time-decay (more conservative)
      existing.timestamp = Math.min(existing.timestamp, item.timestamp);
    } else {
      // New content from vector search
      fused.set(key, {
        type: "item",
        rrfScore: contribution,
        timestamp: item.timestamp,
        content: item.content,
        sources: new Set<"vector" | "graph">(["vector"]),
      });
    }
  });

  // Process graph results (must be sorted by rawScore, descending)
  graphResults.forEach((item: RRFGraphInput, index: number) => {
    const rank = index + 1; // 1-indexed for RRF formula
    const key = hashContent(item.context);
    const contribution = RRF_CONFIG.GRAPH_WEIGHT * (1 / (rank + RRF_CONFIG.CONSTANT));

    if (fused.has(key)) {
      // Content already exists - accumulate RRF score
      const existing = fused.get(key)!;
      existing.rrfScore += contribution;
      existing.sources.add("graph");
      // Keep earliest timestamp for time-decay
      existing.timestamp = Math.min(existing.timestamp, item.timestamp);
      // Preserve nodeId if this is a graph result
      if (!existing.nodeId) {
        existing.nodeId = item.nodeId;
      }
    } else {
      // New content from graph search
      fused.set(key, {
        type: "node",
        rrfScore: contribution,
        timestamp: item.timestamp,
        content: item.context,
        sources: new Set<"vector" | "graph">(["graph"]),
        nodeId: item.nodeId,
      });
    }
  });

  // Apply time-decay AFTER fusion and convert to result array
  const results: Array<RRFFusedResult> = Array.from(fused.values()).map((item) => {
    // Calculate time-decay factor using existing function
    const decayFactor = calculateTimeDecay(item.timestamp);

    return {
      type: item.type,
      content: item.content,
      rrfScore: item.rrfScore,
      finalScore: item.rrfScore * decayFactor,
      timestamp: item.timestamp,
      sources: Array.from(item.sources),
      nodeId: item.nodeId,
    };
  });

  // Sort by finalScore (descending) and return Top-K
  results.sort((a: RRFFusedResult, b: RRFFusedResult) => b.finalScore - a.finalScore);
  return results.slice(0, topK);
}

// ============ SEARCH PIPELINES ============

/**
 * Vector search pipeline for file-based memory layer (LEGACY).
 * Searches items table using semantic similarity, applies time-decay scoring.
 *
 * @deprecated Use vectorSearchPipelineRRF for new RRF-based hybrid search.
 * This pipeline is kept for backward compatibility with existing hybridSearch.
 *
 * @param embedding - Query embedding vector (1024 dimensions from voyage-4)
 * @param category - Optional category filter (e.g., "tech_preferences", "projects")
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of VectorResult objects sorted by decayed score (descending)
 */
export const vectorSearchPipeline = internalAction({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<VectorResult>> => {
    const limit = args.limit ?? 20;

    // Build search query with optional category filter
    const searchQuery: {
      vector: number[];
      limit: number;
      filter?: (q: any) => any;
    } = {
      vector: args.embedding,
      limit: limit * 2, // Get extra results for filtering
    };

    // Add category filter if specified
    if (args.category) {
      const category = args.category; // Capture for closure
      searchQuery.filter = (q) => q.eq("category", category);
    }

    // Execute vector search on items table
    const searchResults = await ctx.vectorSearch("items", "by_embedding", searchQuery);

    // Load full item documents
    const itemIds = searchResults.map((result) => result._id);
    const items: Doc<"items">[] = await ctx.runQuery(internal.items.fetchItemsByIds, {
      itemIds,
    });

    // Apply time-decay scoring and build results (LEGACY behavior)
    const results: Array<VectorResult> = items.map((item: Doc<"items">) => {
      // Find the corresponding search result to get the score
      const searchResult = searchResults.find((r) => r._id === item._id);
      const score = searchResult?._score ?? 0;

      // Apply time-decay factor (30-day half-life)
      const decayFactor = calculateTimeDecay(item.createdAt);
      const decayedScore = score * decayFactor;

      // Build VectorResult object
      return {
        itemId: item._id,
        content: item.content,
        score: decayedScore,
        timestamp: item.createdAt,
        category: item.category,
      };
    });

    // Sort by decayed score (highest first)
    results.sort((a: VectorResult, b: VectorResult) => b.score - a.score);

    // Return top N results
    return results.slice(0, limit);
  },
});

/**
 * Vector search pipeline for RRF-based hybrid search.
 * Searches items table using semantic similarity and returns RAW scores.
 *
 * IMPORTANT: This pipeline returns raw scores WITHOUT time-decay applied.
 * Time-decay is applied AFTER RRF fusion in weightedTimeDecayRRF().
 * Results are sorted by raw score (descending) for proper RRF ranking.
 *
 * @param embedding - Query embedding vector (1024 dimensions from voyage-4)
 * @param category - Optional category filter (e.g., "tech_preferences", "projects")
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of RRFVectorInput objects sorted by rawScore (descending)
 */
export const vectorSearchPipelineRRF = internalAction({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<RRFVectorInput>> => {
    const limit = args.limit ?? 20;

    // Build search query with optional category filter
    const searchQuery: {
      vector: number[];
      limit: number;
      filter?: (q: any) => any;
    } = {
      vector: args.embedding,
      limit: limit * 2, // Get extra results for filtering
    };

    // Add category filter if specified
    if (args.category) {
      const category = args.category; // Capture for closure
      searchQuery.filter = (q) => q.eq("category", category);
    }

    // Execute vector search on items table
    const searchResults = await ctx.vectorSearch("items", "by_embedding", searchQuery);

    // Load full item documents
    const itemIds = searchResults.map((result) => result._id);
    const items: Doc<"items">[] = await ctx.runQuery(internal.items.fetchItemsByIds, {
      itemIds,
    });

    // Build results with RAW scores (no time-decay)
    const results: Array<RRFVectorInput> = items.map((item: Doc<"items">) => {
      // Find the corresponding search result to get the raw score
      const searchResult = searchResults.find((r) => r._id === item._id);
      const rawScore = searchResult?._score ?? 0;

      // Build RRFVectorInput object (no time-decay applied)
      return {
        itemId: item._id,
        content: item.content,
        rawScore, // RAW score for RRF ranking
        timestamp: item.createdAt, // Preserved for post-fusion time-decay
        category: item.category,
      };
    });

    // Sort by raw score (highest first) - critical for RRF ranking
    results.sort((a: RRFVectorInput, b: RRFVectorInput) => b.rawScore - a.rawScore);

    // Return top N results
    return results.slice(0, limit);
  },
});

/**
 * Graph search pipeline for relationship-based memory layer (LEGACY).
 * Searches graphNodes table using semantic similarity, expands 1-hop relationships.
 *
 * @deprecated Use graphSearchPipelineRRF for new RRF-based hybrid search.
 * This pipeline is kept for backward compatibility with existing hybridSearch.
 *
 * Context format example:
 * ```
 * project: mem-sona - Personal memory infrastructure for AI agents
 * Relationships:
 *   - uses: Convex
 *   - uses: voyage-4
 *   - requires: TypeScript
 * ```
 *
 * @param embedding - Query embedding vector (1024 dimensions from voyage-4)
 * @param nodeType - Optional node type filter (e.g., "project", "tool", "skill")
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of GraphResult objects sorted by decayed score (descending)
 */
export const graphSearchPipeline = internalAction({
  args: {
    embedding: v.array(v.float64()),
    nodeType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<GraphResult>> => {
    const limit = args.limit ?? 10;

    // Build search query with optional nodeType filter
    const searchQuery: {
      vector: number[];
      limit: number;
      filter?: (q: any) => any;
    } = {
      vector: args.embedding,
      limit: limit * 2, // Get extra results for filtering
    };

    // Add nodeType filter if specified
    if (args.nodeType) {
      const nodeType = args.nodeType; // Capture for closure
      searchQuery.filter = (q) => q.eq("type", nodeType);
    }

    // Execute vector search on graphNodes table
    const searchResults = await ctx.vectorSearch("graphNodes", "by_embedding", searchQuery);

    // Load full node documents and expand 1-hop relationships
    const results: Array<GraphResult> = [];

    for (const searchResult of searchResults) {
      // Load the full node document
      const node = await ctx.runQuery(internal.graph.getNodeInternal, {
        nodeId: searchResult._id,
      });

      if (!node || node.status !== "active") {
        continue; // Skip archived or deleted nodes
      }

      // Get all edges from this node (1-hop expansion)
      const edges: Doc<"graphEdges">[] = await ctx.runQuery(internal.graph.getEdgesFromInternal, {
        fromNodeId: node._id,
      });

      // Filter for active edges only
      const activeEdges = edges.filter((edge: Doc<"graphEdges">) => edge.status === "active");

      // Build relationships context string
      const relationships: Array<string> = [];

      for (const edge of activeEdges) {
        // Load the target node
        const targetNode = await ctx.runQuery(internal.graph.getNodeInternal, {
          nodeId: edge.toNode,
        });

        if (targetNode && targetNode.status === "active") {
          // Format as: "relationship: targetName"
          relationships.push(`${edge.relationship}: ${targetNode.name}`);
        }
      }

      // Format context string
      const description = node.properties.description || "";
      let context = `${node.type}: ${node.name}`;
      if (description) {
        context += ` - ${description}`;
      }
      if (relationships.length > 0) {
        context += `\nRelationships:\n  - ${relationships.join("\n  - ")}`;
      }

      // Get similarity score from search result
      const score = searchResult._score ?? 0;

      // Apply time-decay factor (30-day half-life) - LEGACY behavior
      const decayFactor = calculateTimeDecay(node.createdAt);
      const decayedScore = score * decayFactor;

      // Build GraphResult object
      results.push({
        nodeId: node._id,
        nodeType: node.type,
        context,
        score: decayedScore,
        timestamp: node.createdAt,
        edges: activeEdges.length,
      });
    }

    // Sort by decayed score (highest first)
    results.sort((a: GraphResult, b: GraphResult) => b.score - a.score);

    // Return top N results
    return results.slice(0, limit);
  },
});

/**
 * Graph search pipeline for RRF-based hybrid search.
 * Searches graphNodes table using semantic similarity, expands 1-hop relationships.
 *
 * IMPORTANT: This pipeline returns raw scores WITHOUT time-decay applied.
 * Time-decay is applied AFTER RRF fusion in weightedTimeDecayRRF().
 * Results are sorted by raw score (descending) for proper RRF ranking.
 *
 * Context format example:
 * ```
 * project: mem-sona - Personal memory infrastructure for AI agents
 * Relationships:
 *   - uses: Convex
 *   - uses: voyage-4
 *   - requires: TypeScript
 * ```
 *
 * @param embedding - Query embedding vector (1024 dimensions from voyage-4)
 * @param nodeType - Optional node type filter (e.g., "project", "tool", "skill")
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of RRFGraphInput objects sorted by rawScore (descending)
 */
export const graphSearchPipelineRRF = internalAction({
  args: {
    embedding: v.array(v.float64()),
    nodeType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<RRFGraphInput>> => {
    const limit = args.limit ?? 10;

    // Build search query with optional nodeType filter
    const searchQuery: {
      vector: number[];
      limit: number;
      filter?: (q: any) => any;
    } = {
      vector: args.embedding,
      limit: limit * 2, // Get extra results for filtering
    };

    // Add nodeType filter if specified
    if (args.nodeType) {
      const nodeType = args.nodeType; // Capture for closure
      searchQuery.filter = (q) => q.eq("type", nodeType);
    }

    // Execute vector search on graphNodes table
    const searchResults = await ctx.vectorSearch("graphNodes", "by_embedding", searchQuery);

    // Load full node documents and expand 1-hop relationships
    const results: Array<RRFGraphInput> = [];

    for (const searchResult of searchResults) {
      // Load the full node document
      const node = await ctx.runQuery(internal.graph.getNodeInternal, {
        nodeId: searchResult._id,
      });

      if (!node || node.status !== "active") {
        continue; // Skip archived or deleted nodes
      }

      // Get all edges from this node (1-hop expansion)
      const edges: Doc<"graphEdges">[] = await ctx.runQuery(internal.graph.getEdgesFromInternal, {
        fromNodeId: node._id,
      });

      // Filter for active edges only
      const activeEdges = edges.filter((edge: Doc<"graphEdges">) => edge.status === "active");

      // Build relationships context string
      const relationships: Array<string> = [];

      for (const edge of activeEdges) {
        // Load the target node
        const targetNode = await ctx.runQuery(internal.graph.getNodeInternal, {
          nodeId: edge.toNode,
        });

        if (targetNode && targetNode.status === "active") {
          // Format as: "relationship: targetName"
          relationships.push(`${edge.relationship}: ${targetNode.name}`);
        }
      }

      // Format context string
      const description = node.properties.description || "";
      let context = `${node.type}: ${node.name}`;
      if (description) {
        context += ` - ${description}`;
      }
      if (relationships.length > 0) {
        context += `\nRelationships:\n  - ${relationships.join("\n  - ")}`;
      }

      // Get RAW similarity score from search result (no time-decay)
      const rawScore = searchResult._score ?? 0;

      // Build RRFGraphInput object (no time-decay applied)
      results.push({
        nodeId: node._id,
        nodeType: node.type,
        context,
        rawScore, // RAW score for RRF ranking
        timestamp: node.createdAt, // Preserved for post-fusion time-decay
        edges: activeEdges.length,
      });
    }

    // Sort by raw score (highest first) - critical for RRF ranking
    results.sort((a: RRFGraphInput, b: RRFGraphInput) => b.rawScore - a.rawScore);

    // Return top N results
    return results.slice(0, limit);
  },
});

// ============ RESULT MERGING AND RANKING ============

/**
 * Merge and rank results from both vector and graph search pipelines.
 * Performs deduplication by content hash and combines scores for duplicates.
 *
 * This is a critical step in hybrid search - it ensures we don't show the same
 * information twice (e.g., when "Convex" appears as both an item and a node).
 *
 * Deduplication logic:
 * - If content appears in BOTH sources → average the scores, mark as "hybrid"
 * - If content appears in ONE source → use that score, mark as "vector" or "graph"
 *
 * Example:
 * - Vector result: "Convex is the backend database" (score: 0.89)
 * - Graph result: "Convex is the backend database" (score: 0.92)
 * - Merged: "Convex is the backend database" (finalScore: 0.905, source: "hybrid")
 *
 * @param vectorResults - Results from vectorSearchPipeline
 * @param graphResults - Results from graphSearchPipeline
 * @param query - Original search query (for logging/context)
 * @returns Array of MergedResult objects sorted by finalScore (descending)
 */
export const mergeAndRankResults = internalAction({
  args: {
    vectorResults: v.array(vectorResultValidator),
    graphResults: v.array(graphResultValidator),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<Array<MergedResult>> => {
    // Create map for deduplication (key = content hash)
    const merged = new Map<string, MergedResult>();

    // Process vector results first
    for (const result of args.vectorResults) {
      const key = hashContent(result.content);
      merged.set(key, {
        type: "item",
        content: result.content,
        score: result.score,
        finalScore: result.score,
        timestamp: result.timestamp,
        source: "vector",
      });
    }

    // Process graph results (with deduplication)
    for (const result of args.graphResults) {
      const key = hashContent(result.context);

      if (merged.has(key)) {
        // Content appears in both sources - combine scores
        const existing = merged.get(key)!;
        existing.finalScore = (existing.score + result.score) / 2;
        existing.source = "hybrid"; // Mark as from both sources
      } else {
        // New content from graph only
        merged.set(key, {
          type: "node",
          content: result.context,
          score: result.score,
          finalScore: result.score,
          timestamp: result.timestamp,
          source: "graph",
        });
      }
    }

    // Convert map to array and sort by finalScore (descending)
    const results = Array.from(merged.values());
    results.sort((a, b) => b.finalScore - a.finalScore);

    return results;
  },
});

// ============ CONTEXT ASSEMBLY ============

/**
 * Assemble results into a formatted context window for LLM consumption.
 * Respects token budget to prevent exceeding LLM context limits.
 *
 * This formats the merged results into a markdown string that Claude Code/Copilot/Cursor
 * can use to answer questions about the user's memory.
 *
 * Context format:
 * ```markdown
 * # Memory Search Results for: "What tools does mem-sona use?"
 *
 * ## item (score: 0.905, source: hybrid)
 * Convex is the backend database for mem-sona
 *
 * ## node (score: 0.876, source: graph)
 * project: mem-sona - Personal memory infrastructure for AI agents
 * Relationships:
 *   - uses: Convex
 *   - uses: voyage-4
 * ```
 *
 * @param results - Merged and ranked results from mergeAndRankResults
 * @param maxTokens - Maximum token budget for context window (default: 2000)
 * @param query - Original search query (for context header)
 * @returns Formatted markdown context string
 */
export const assembleContextWindow = internalAction({
  args: {
    results: v.array(mergedResultValidator),
    maxTokens: v.number(),
    query: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    let tokenCount = 0;
    let context = `# Memory Search Results for: "${args.query}"\n\n`;
    let resultsIncluded = 0;

    // Conservative token estimation (4 chars ≈ 1 token)
    const estimateTokens = (text: string): number => {
      return Math.ceil(text.length / 4);
    };

    // Add header tokens
    tokenCount += estimateTokens(context);

    // Iterate through results
    for (const result of args.results) {
      // Format result as markdown
      const entry = `## ${result.type} (score: ${result.finalScore.toFixed(3)}, source: ${result.source})\n${result.content}\n\n`;

      // Check token budget
      const entryTokens = estimateTokens(entry);
      if (tokenCount + entryTokens > args.maxTokens) {
        break; // Stop adding results
      }

      // Add to context
      context += entry;
      tokenCount += entryTokens;
      resultsIncluded++;
    }

    // Add footer with metadata
    context += `\n---\n*Total results: ${resultsIncluded}, Estimated tokens: ${tokenCount}*`;

    return context;
  },
});

// ============ MAIN HYBRID SEARCH ============

/**
 * Main hybrid search action (PUBLIC - called by MCP server).
 * Orchestrates parallel vector + graph search, merges results using RRF, and assembles context.
 *
 * This is the PRIMARY entry point for the `memory_search` MCP tool.
 * It combines the power of semantic search (vector) with relationship traversal (graph)
 * to provide the most relevant memory results for any query.
 *
 * Execution flow (Sprint-004 RRF Update):
 * 1. Generate query embedding (voyage-4, inputType: "query")
 * 2. Parallel search: vectorSearchPipelineRRF + graphSearchPipelineRRF (raw scores)
 * 3. RRF fusion: weightedTimeDecayRRF() combines results with time-decay
 * 4. Map RRFFusedResult to MergedResult for backward compatibility
 * 5. Assemble context: markdown formatting with token budget
 * 6. Return HybridSearchResult with execution time
 *
 * Key changes from legacy implementation:
 * - Uses RRF pipelines that return RAW scores (no time-decay applied)
 * - Uses weightedTimeDecayRRF() for fusion (replaces mergeAndRankResults)
 * - No threshold filtering - RRF returns Top-K directly (default: 20)
 * - Time-decay applied AFTER fusion for cleaner scoring
 *
 * Performance target: < 500ms end-to-end
 *
 * Example usage from MCP server:
 * ```typescript
 * const result = await convex.action(api.retrieval.hybridSearch, {
 *   query: "What tools does mem-sona use?",
 *   maxTokens: 2000,
 * });
 * console.log(result.context); // Formatted context for LLM
 * console.log(result.executionTime); // Performance monitoring
 * ```
 *
 * @param query - Search query string (e.g., "What tools does mem-sona use?")
 * @param maxTokens - Optional token budget for context window (default: 2000)
 * @returns HybridSearchResult with merged results, context, and execution time
 */
export const hybridSearch = action({
  args: {
    query: v.string(),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<HybridSearchResult> => {
    // Track execution time
    const startTime = Date.now();

    // Generate query embedding (voyage-4, inputType: "query")
    const embedding = await ctx.runAction(internal.items.generateEmbedding, {
      text: args.query,
      inputType: "query", // Voyage AI optimization hint for search queries
    });

    // Parallel search: RRF pipelines return RAW scores (no time-decay)
    const [vectorResults, graphResults] = await Promise.all([
      ctx.runAction(internal.retrieval.vectorSearchPipelineRRF, {
        embedding,
        limit: 20,
      }),
      ctx.runAction(internal.retrieval.graphSearchPipelineRRF, {
        embedding,
        limit: 10,
      }),
    ]);

    // RRF fusion with time-decay (replaces mergeAndRankResults + threshold filtering)
    // Returns Top-K results directly - no additional filtering needed
    const rrfResults: Array<RRFFusedResult> = weightedTimeDecayRRF(
      vectorResults,
      graphResults,
      RRF_CONFIG.DEFAULT_TOP_K
    );

    // Map RRFFusedResult to MergedResult for backward compatibility with assembleContextWindow
    // This preserves the existing context assembly logic and output format
    const mergedResults: Array<MergedResult> = rrfResults.map((r: RRFFusedResult): MergedResult => {
      // Determine source: "hybrid" if from both, otherwise first source
      let source: "vector" | "graph" | "hybrid";
      if (r.sources.length > 1) {
        source = "hybrid";
      } else {
        source = r.sources[0] || "vector";
      }

      return {
        type: r.type,
        content: r.content,
        score: r.rrfScore, // Use RRF score as original score
        finalScore: r.finalScore, // RRF score * time-decay
        timestamp: r.timestamp,
        source,
        nodeId: r.nodeId, // Preserve nodeId for graph visualization
      };
    });

    // Assemble context (markdown formatting with token budget)
    const maxTokens = args.maxTokens ?? 2000;
    const context = await ctx.runAction(internal.retrieval.assembleContextWindow, {
      results: mergedResults,
      maxTokens,
      query: args.query,
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Return HybridSearchResult
    return {
      query: args.query,
      results: mergedResults,
      context,
      executionTime,
    };
  },
});
