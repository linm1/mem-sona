// convex/retrieval.ts
// Hybrid Search - Combines vector and graph search for comprehensive memory retrieval

import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Relevance threshold for filtering search results.
 * Results with finalScore below this threshold are excluded.
 * Value chosen based on empirical testing to balance precision and recall.
 */
const RELEVANCE_THRESHOLD = 0.7;

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

/**
 * Calculate time-decay factor for memory relevance scoring.
 * Uses 30-day half-life: recent memories score higher than old ones.
 *
 * This implements temporal decay to prioritize recent information over stale facts.
 * Formula: decay = 1.0 / (1.0 + (ageDays / 30))
 * - 0 days old → 1.0 (full weight)
 * - 30 days old → 0.5 (half weight)
 * - 60 days old → 0.33 (one-third weight)
 * - 365 days old → 0.076 (heavily decayed)
 *
 * @param timestamp - Unix timestamp in milliseconds of when memory was created/updated
 * @returns Decay factor between 0 and 1 (1.0 = current, approaches 0 for very old)
 */
export function calculateTimeDecay(timestamp: number): number {
  const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return 1.0 / (1.0 + (ageDays / 30)); // 30-day half-life
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

// ============ SEARCH PIPELINES ============

/**
 * Vector search pipeline for file-based memory layer.
 * Searches items table using semantic similarity, applies time-decay scoring.
 *
 * This pipeline is called by hybridSearch (US-017) to search atomic facts.
 * Results are ranked by similarity with time-decay applied (recent facts rank higher).
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

    // Apply time-decay scoring and build results
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
    results.sort((a, b) => b.score - a.score);

    // Return top N results
    return results.slice(0, limit);
  },
});

/**
 * Graph search pipeline for relationship-based memory layer.
 * Searches graphNodes table using semantic similarity, expands 1-hop relationships.
 *
 * This pipeline is called by hybridSearch (US-017) to search entities and their connections.
 * Results include node information plus active relationships (edges) formatted as context.
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

      // Apply time-decay factor (30-day half-life)
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
    results.sort((a, b) => b.score - a.score);

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
 * Orchestrates parallel vector + graph search, merges results, and assembles context.
 *
 * This is the PRIMARY entry point for the `memory_search` MCP tool.
 * It combines the power of semantic search (vector) with relationship traversal (graph)
 * to provide the most relevant memory results for any query.
 *
 * Execution flow:
 * 1. Generate query embedding (voyage-4, inputType: "query")
 * 2. Parallel search: vectorSearchPipeline + graphSearchPipeline
 * 3. Merge results: deduplication + score averaging
 * 4. Filter by relevance: finalScore > 0.7
 * 5. Assemble context: markdown formatting with token budget
 * 6. Return HybridSearchResult with execution time
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

    // Parallel search: vector + graph pipelines
    const [vectorResults, graphResults] = await Promise.all([
      ctx.runAction(internal.retrieval.vectorSearchPipeline, {
        embedding,
        limit: 20,
      }),
      ctx.runAction(internal.retrieval.graphSearchPipeline, {
        embedding,
        limit: 10,
      }),
    ]);

    // Merge results (deduplication + score averaging)
    const merged: MergedResult[] = await ctx.runAction(internal.retrieval.mergeAndRankResults, {
      vectorResults,
      graphResults,
      query: args.query,
    });

    // Relevance filtering using configured threshold
    const filtered = merged.filter((r: MergedResult) => r.finalScore > RELEVANCE_THRESHOLD);

    // Assemble context (markdown formatting with token budget)
    const maxTokens = args.maxTokens ?? 2000;
    const context = await ctx.runAction(internal.retrieval.assembleContextWindow, {
      results: filtered,
      maxTokens,
      query: args.query,
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Return HybridSearchResult
    return {
      query: args.query,
      results: filtered,
      context,
      executionTime,
    };
  },
});
