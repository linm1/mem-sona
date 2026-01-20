// convex/items.ts
// Item Storage with Vector Embeddings - Atomic facts with semantic search

import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { VoyageAIClient } from "voyageai";

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
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
      throw new Error("VOYAGE_API_KEY not configured");
    }

    try {
      const client = new VoyageAIClient({
        apiKey: apiKey,
      });

      // Call the standard embed API (not contextualizedEmbed)
      // voyage-4 uses standard embeddings, not contextualized
      const result = await client.embed({
        input: args.text, // Single string input
        model: "voyage-4", // Latest generation standard embeddings
        inputType: args.inputType, // "document" or "query" optimization hint
        outputDimension: 1024, // voyage-4 default dimension (also supports 256, 512, 2048)
      });

      // Response structure for standard embeddings: result.data[0].embedding
      // The embedding field is optional in the type definition, so we need to handle undefined
      if (!result.data || result.data.length === 0 || !result.data[0].embedding) {
        throw new Error("Empty embedding response from Voyage API");
      }

      return result.data[0].embedding;
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
 */
export const updateItemAccess = mutation({
  args: {
    itemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;

    await ctx.db.patch(args.itemId, {
      accessedAt: Date.now(),
      accessCount: item.accessCount + 1,
    });
  },
});

/**
 * Vector search on items using embeddings.
 * Returns items ranked by semantic similarity to the query embedding.
 *
 * @param embedding - Query embedding (1536 dimensions from voyage-context-3)
 * @param category - Optional category filter
 * @param limit - Maximum number of results
 */
export const vectorSearchInternal = internalQuery({
  args: {
    embedding: v.array(v.float64()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // TODO: Implement proper vector search using Convex vector indexes
    // For now, return items filtered by category (if specified)
    if (args.category !== undefined) {
      // Search with category filter
      const category = args.category;
      const results = await ctx.db
        .query("items")
        .withIndex("by_category", (q) => q.eq("category", category))
        .take(limit);

      return results;
    } else {
      // Search across all categories
      const results = await ctx.db
        .query("items")
        .take(limit);

      return results;
    }
  },
});

/**
 * Public vector search action that generates embedding and searches.
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
  }>> => {
    // Generate query embedding with "query" input type for search
    const embedding = await ctx.runAction(internal.items.generateEmbedding, {
      text: args.query,
      inputType: "query",
    });

    // Search with embedding
    const results = await ctx.runQuery(internal.items.vectorSearchInternal, {
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
