// convex/retrieval/index.ts
// Main entry point for hybrid search - re-exports all modules and main actions

// Re-export all types
export type {
  VectorResult,
  GraphResult,
  EdgeData,
  MergedResult,
  HybridSearchResult,
  RRFVectorInput,
  RRFGraphInput,
  RRFFusedResult,
  SourceType4Way,
  ResultType4Way,
  MergedItemResult,
  MergedNodeResult,
  CombinedResult4Way,
  FinalResult4Way,
} from "./types";

// Re-export validators
export {
  vectorResultValidator,
  graphResultValidator,
  edgeDataValidator,
  mergedResultValidator,
  rrfVectorInputValidator,
  rrfGraphInputValidator,
  rrfFusedResultValidator,
} from "./types";

// Re-export RRF functions
export {
  calculateTimeDecay,
  hashContent,
  weightedTimeDecayRRF,
} from "./rrf";

// Re-export 4-way hybrid search functions
export {
  calculateRRFScore,
  mergeItemsRRF,
  mergeNodesRRF,
  combineItemsAndNodes,
  applyTimeDecayToResults,
  selectTopK,
  hybridSearch4WayHandler,
} from "./fourWay";

// Import dependencies for main actions
import { v } from "convex/values";
import { Doc, Id } from "../_generated/dataModel";
import { internalAction, action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { RRF_CONFIG } from "../utils/constants";
import { calculateTimeDecay, hashContent } from "./rrf";
import { hybridSearch4WayHandler } from "./fourWay";
import {
  vectorResultValidator,
  graphResultValidator,
  mergedResultValidator,
  type VectorResult,
  type GraphResult,
  type MergedResult,
  type HybridSearchResult,
  type EdgeData,
  type FinalResult4Way,
} from "./types";

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
 * Graph search pipeline for relationship-based memory layer (LEGACY).
 * Searches graphNodes table using semantic similarity, expands 1-hop relationships.
 *
 * @deprecated Use graphSearchPipelineRRF for new RRF-based hybrid search.
 * This pipeline is kept for backward compatibility with existing hybridSearch.
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
 * Vector search pipeline returning raw item documents.
 * Used by the 4-way hybrid search to get items for RRF merging.
 *
 * @param embedding - Query embedding vector (1024 dimensions from voyage-4)
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of item documents sorted by vector similarity (descending)
 */
export const vectorSearchItemsDocs = internalAction({
  args: {
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"items">[]> => {
    const limit = args.limit ?? 20;

    // Execute vector search on items table
    const searchResults = await ctx.vectorSearch("items", "by_embedding", {
      vector: args.embedding,
      limit: limit,
    });

    // Load full item documents (sorted by vector similarity from search)
    const itemIds = searchResults.map((result) => result._id);
    const items: Doc<"items">[] = await ctx.runQuery(internal.items.fetchItemsByIds, {
      itemIds,
    });

    // Preserve the order from vector search (sorted by similarity)
    const itemMap = new Map(items.map((item) => [item._id, item]));
    return itemIds.map((id) => itemMap.get(id)).filter((item): item is Doc<"items"> => item !== undefined);
  },
});

/**
 * Vector search pipeline returning raw graph node documents.
 * Used by the 4-way hybrid search to get nodes for RRF merging.
 *
 * @param embedding - Query embedding vector (1024 dimensions from voyage-4)
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of node documents sorted by vector similarity (descending)
 */
export const vectorSearchNodesDocs = internalAction({
  args: {
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"graphNodes">[]> => {
    const limit = args.limit ?? 10;

    // Execute vector search on graphNodes table
    const searchResults = await ctx.vectorSearch("graphNodes", "by_embedding", {
      vector: args.embedding,
      limit: limit * 2, // Get extra results for filtering inactive nodes
    });

    // Load and filter for active nodes only
    const results: Doc<"graphNodes">[] = [];

    for (const searchResult of searchResults) {
      if (results.length >= limit) break;

      const node = await ctx.runQuery(internal.graph.getNodeInternal, {
        nodeId: searchResult._id,
      });

      if (node && node.status === "active") {
        results.push(node);
      }
    }

    return results;
  },
});

/**
 * Fetch edges for a list of node IDs and return structured EdgeData.
 * Used to enrich node results with relationship information.
 *
 * @param ctx - Convex action context
 * @param nodeIds - Array of node IDs to fetch edges for
 * @returns Map of nodeId -> EdgeData[]
 */
export async function fetchEdgesForNodes(
  ctx: any,
  nodeIds: Array<Id<"graphNodes">>
): Promise<Map<string, EdgeData[]>> {
  const edgeMap = new Map<string, EdgeData[]>();

  // Fetch edges for all nodes in parallel
  const edgePromises = nodeIds.map(async (nodeId) => {
    const edges: Doc<"graphEdges">[] = await ctx.runQuery(
      internal.graph.getEdgesFromInternal,
      { fromNodeId: nodeId }
    );

    // Filter for active edges and build EdgeData
    const edgeData: EdgeData[] = [];
    for (const edge of edges) {
      if (edge.status !== "active") continue;

      // Get target node name and type
      const targetNode = await ctx.runQuery(internal.graph.getNodeInternal, {
        nodeId: edge.toNode,
      });

      if (targetNode && targetNode.status === "active") {
        edgeData.push({
          relationship: edge.relationship,
          targetName: targetNode.name,
          targetNodeType: targetNode.type,
          weight: edge.weight,
        });
      }
    }

    return { nodeId, edgeData };
  });

  const results = await Promise.all(edgePromises);
  for (const { nodeId, edgeData } of results) {
    edgeMap.set(nodeId, edgeData);
  }

  return edgeMap;
}

// ============ RESULT MERGING AND RANKING ============

/**
 * Merge and rank results from both vector and graph search pipelines.
 * Performs deduplication by content hash and combines scores for duplicates.
 *
 * @deprecated This is for legacy hybridSearch. New code should use 4-way hybrid search.
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
 * @param results - Merged and ranked results
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
 * Orchestrates 4-way parallel search, merges results using RRF, and assembles context.
 *
 * This is the PRIMARY entry point for the `memory_search` MCP tool.
 *
 * @param query - Search query string
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

    // 4-way parallel search: vector items, text items, vector nodes, text nodes
    const [vectorItems, textItems, vectorNodes, textNodes] = await Promise.all([
      // Vector search on items
      ctx.runAction(internal.retrieval.index.vectorSearchItemsDocs, {
        embedding,
        limit: 20,
      }),
      // Text search on items (BM25-style keyword matching)
      ctx.runQuery(api.textSearch.textSearchItems, {
        query: args.query,
        limit: 20,
      }),
      // Vector search on nodes
      ctx.runAction(internal.retrieval.index.vectorSearchNodesDocs, {
        embedding,
        limit: 10,
      }),
      // Text search on nodes (BM25-style keyword matching)
      ctx.runQuery(api.textSearch.textSearchNodes, {
        query: args.query,
        limit: 10,
      }),
    ]);

    // 4-way RRF fusion with time-decay
    const rrfResults: Array<FinalResult4Way> = hybridSearch4WayHandler.execute(
      vectorItems,
      textItems,
      vectorNodes,
      textNodes,
      RRF_CONFIG.DEFAULT_TOP_K
    );

    // Fetch edges for all node results in parallel
    const nodeIds = rrfResults
      .filter((r) => r.resultType === "node" && r.nodeId)
      .map((r) => r.nodeId as Id<"graphNodes">);

    const edgeMap = nodeIds.length > 0
      ? await fetchEdgesForNodes(ctx, nodeIds)
      : new Map<string, EdgeData[]>();

    // Map FinalResult4Way to MergedResult for backward compatibility
    const mergedResults: Array<MergedResult> = rrfResults.map((r: FinalResult4Way): MergedResult => {
      // Map sourceType to source field
      let source: "vector" | "graph" | "hybrid";
      if (r.sourceType === "hybrid") {
        source = "hybrid";
      } else {
        // Both "vector" and "text" map to "vector" for backward compat
        source = "vector";
      }

      // Build base result with common fields
      const baseResult: MergedResult = {
        type: r.resultType,
        content: r.content,
        score: r.rrfScore, // Use RRF score as original score
        finalScore: r.finalScore, // RRF score * time-decay
        timestamp: r.createdAt,
        source,
      };

      // Add item-specific fields for editing
      if (r.resultType === "item") {
        baseResult.itemId = r._id;
        baseResult.category = r.category;
      }

      // Add node-specific fields for editing
      if (r.resultType === "node") {
        baseResult.nodeId = r.nodeId;
        baseResult.name = r.name;
        baseResult.nodeType = r.type;
        baseResult.description = r.description;
        // Add edge data from pre-fetched map
        baseResult.edges = edgeMap.get(r.nodeId || "") || [];
      }

      return baseResult;
    });

    // Assemble context (markdown formatting with token budget)
    const maxTokens = args.maxTokens ?? 2000;
    const context = await ctx.runAction(internal.retrieval.index.assembleContextWindow, {
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
