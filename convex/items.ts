// convex/items.ts
// Item Storage with Vector Embeddings - Atomic facts with semantic search

import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { generateEmbedding as voyageGenerateEmbedding, VoyageInputType } from "./utils/voyage";

/** Item document with similarity score from vector search */
type ItemWithScore = Doc<"items"> & { _score: number };

/**
 * Generate embedding for text using Voyage AI SDK (voyage-4).
 * This is an action because it calls external services.
 *
 * Uses voyage-4 (latest generation standard embeddings) with 1024-dimension output (default).
 * voyage-4 uses standard embed() method, not contextualizedEmbed().
 *
 * NOTE: voyage-context-3 is no longer supported by Voyage AI API as of Jan 2026.
 * Migrated to voyage-4 standard embeddings (still provides excellent retrieval quality).
 *
 * @param text - Text string to embed (single text per call for simplicity)
 * @param inputType - "document" for storage, "query" for search
 * @returns Embedding vector (1024 dimensions)
 */
export const generateEmbedding = internalAction({
  args: {
    text: v.string(),
    inputType: v.union(v.literal("document"), v.literal("query")),
  },
  handler: async (ctx, args): Promise<number[]> => {
    try {
      return await voyageGenerateEmbedding(args.text, args.inputType as VoyageInputType);
    } catch (error) {
      console.error("Embedding generation failed:", error);
      throw error;
    }
  },
});

/**
 * Add an item with automatic embedding generation.
 * This is a public action (not internal) because it's called from MCP server.
 * It calls internal generateEmbedding action, then stores the item via internal mutation.
 */
export const addItem = action({
  args: {
    content: v.string(),
    category: v.string(),
    resourceId: v.id("resources"),
  },
  handler: async (ctx, args): Promise<string> => {
    // Generate embedding with "document" input type for storage
    const embedding = await ctx.runAction(internal.items.generateEmbedding, {
      text: args.content,
      inputType: "document",
    });

    // Store item with embedding
    const itemId = await ctx.runMutation(internal.items.insertItem, {
      content: args.content,
      category: args.category,
      resourceId: args.resourceId,
      embedding,
    });

    return itemId;
  },
});

/**
 * Internal mutation to insert item (called by addItem action).
 */
export const insertItem = internalMutation({
  args: {
    content: v.string(),
    category: v.string(),
    resourceId: v.id("resources"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("items", {
      content: args.content,
      category: args.category,
      resourceId: args.resourceId,
      embedding: args.embedding,
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
    });
  },
});

/**
 * Get a single item by ID.
 */
export const getItem = query({
  args: {
    itemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.itemId);
  },
});

/**
 * Update item access tracking.
 * Called when an item is retrieved during memory search.
 *
 * @returns true if item was updated, false if item not found
 */
export const updateItemAccess = mutation({
  args: {
    itemId: v.id("items"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      console.warn(`Attempted to update access for non-existent item: ${args.itemId}`);
      return false;
    }

    await ctx.db.patch(args.itemId, {
      accessedAt: Date.now(),
      accessCount: item.accessCount + 1,
    });
    return true;
  },
});

/**
 * Vector search on items using embeddings.
 * Returns items ranked by semantic similarity to the query embedding.
 *
 * Uses Convex vector search (only available in actions) to find semantically
 * similar items based on embedding similarity.
 *
 * @param embedding - Query embedding (1024 dimensions from voyage-4)
 * @param category - Optional category filter
 * @param limit - Maximum number of results
 * @returns Array of items with _score field indicating similarity
 */
export const vectorSearchInternal = internalAction({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ItemWithScore[]> => {
    const limit = args.limit ?? 10;

    // Build search query with optional category filter
    const searchQuery: {
      vector: number[];
      limit: number;
      filter?: (q: any) => any;
    } = {
      vector: args.embedding,
      limit: limit * 2, // Get extra results for potential filtering
    };

    // Add category filter if specified
    if (args.category) {
      const category = args.category;
      searchQuery.filter = (q) => q.eq("category", category);
    }

    // Execute vector search on items table
    const searchResults = await ctx.vectorSearch("items", "by_embedding", searchQuery);

    // Load full item documents
    const itemIds = searchResults.map((result) => result._id);
    const items: Doc<"items">[] = await ctx.runQuery(internal.items.fetchItemsByIds, {
      itemIds,
    });

    // Attach scores and return top N results
    const resultsWithScores: ItemWithScore[] = items.map((item: Doc<"items">) => {
      const searchResult = searchResults.find((r) => r._id === item._id);
      return {
        ...item,
        _score: searchResult?._score ?? 0,
      };
    });

    // Sort by score (highest first) and limit
    resultsWithScores.sort((a: ItemWithScore, b: ItemWithScore) => b._score - a._score);
    return resultsWithScores.slice(0, limit);
  },
});

/**
 * Public vector search action that generates embedding and searches.
 * Returns items ranked by semantic similarity to the query.
 *
 * @param query - Search query text
 * @param category - Optional category filter
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of items with similarity scores
 */
export const vectorSearch = action({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: string;
    content: string;
    category: string;
    createdAt: number;
    accessedAt: number;
    accessCount: number;
    resourceId: string;
    _score: number;
  }>> => {
    // Generate query embedding with "query" input type for search
    const embedding = await ctx.runAction(internal.items.generateEmbedding, {
      text: args.query,
      inputType: "query",
    });

    // Search with embedding (using action since vector search requires it)
    const results = await ctx.runAction(internal.items.vectorSearchInternal, {
      embedding,
      category: args.category,
      limit: args.limit,
    });

    return results;
  },
});

/**
 * Get all items in a specific category.
 * Used by category summarization.
 */
export const getItemsByCategory = internalQuery({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

/**
 * Get recently accessed items (hot memories).
 */
export const getRecentlyAccessed = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("items")
      .withIndex("by_accessed")
      .order("desc")
      .take(limit);
  },
});

/**
 * List all items (for category summarization).
 */
export const listAllItems = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("items").collect();
  },
});

/**
 * Internal query to fetch multiple items by IDs.
 * Used by vector search to load complete item documents.
 *
 * @param itemIds - Array of item IDs to fetch
 * @returns Array of items
 */
export const fetchItemsByIds = internalQuery({
  args: {
    itemIds: v.array(v.id("items")),
  },
  handler: async (ctx, args) => {
    const items = await Promise.all(
      args.itemIds.map((id) => ctx.db.get(id))
    );
    // Filter out any null results (deleted items)
    return items.filter((item): item is NonNullable<typeof item> => item !== null);
  },
});

/**
 * Internal mutation to update item embedding.
 * Used by maintenance jobs for reindexing embeddings.
 *
 * @param itemId - Item ID to update
 * @param embedding - New embedding vector (1024 dimensions)
 * @returns void
 */
export const updateItemEmbeddingInternal = internalMutation({
  args: {
    itemId: v.id("items"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.itemId, {
      embedding: args.embedding,
    });
  },
});

/**
 * Internal mutation to delete an item.
 * Used by maintenance jobs to clean up old items after summarization.
 *
 * Note: Items table doesn't have a status field, so this is a hard delete.
 * Original source data remains in resources table (immutable audit trail).
 *
 * @param itemId - Item ID to delete
 * @returns void
 */
export const deleteItemInternal = internalMutation({
  args: {
    itemId: v.id("items"),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.delete(args.itemId);
  },
});
