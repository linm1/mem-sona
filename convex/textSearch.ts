// convex/textSearch.ts
// Text Search Functions using Convex searchIndex (BM25-style keyword search)

import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default limit for item text search */
const DEFAULT_ITEMS_LIMIT = 20;

/** Default limit for node text search */
const DEFAULT_NODES_LIMIT = 10;

/** Maximum terms Convex allows per search query */
const MAX_SEARCH_TERMS = 16;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize and truncate query for Convex text search.
 * - Trims whitespace
 * - Limits to MAX_SEARCH_TERMS words
 * - Returns empty string if query is whitespace-only
 *
 * @param query - Raw search query
 * @returns Sanitized query string
 */
function sanitizeQuery(query: string): string {
  const trimmed = query.trim();

  if (!trimmed) {
    return '';
  }

  // Split by whitespace and take first MAX_SEARCH_TERMS terms
  const terms = trimmed.split(/\s+/).slice(0, MAX_SEARCH_TERMS);

  return terms.join(' ');
}

// ============================================================================
// TEXT SEARCH ITEMS
// ============================================================================

/**
 * Handler for text search on items.
 * Used by both the Convex query and for testing.
 *
 * @param ctx - Convex query context
 * @param args - Search arguments
 * @returns Array of matching items
 */
export async function textSearchItemsHandler(
  ctx: QueryCtx,
  args: {
    query: string;
    category?: string;
    limit?: number;
  }
): Promise<Doc<"items">[]> {
  const sanitizedQuery = sanitizeQuery(args.query);
  const limit = args.limit ?? DEFAULT_ITEMS_LIMIT;

  // Return empty if query is empty after sanitization
  if (!sanitizedQuery) {
    return [];
  }

  const results = await ctx.db
    .query("items")
    .withSearchIndex("by_content", (q) => {
      let searchQuery = q.search("content", sanitizedQuery);

      if (args.category) {
        searchQuery = searchQuery.eq("category", args.category);
      }

      return searchQuery;
    })
    .take(limit);

  return results;
}

/**
 * Public Convex query for text search on items.
 * Uses BM25-style keyword matching via Convex searchIndex.
 *
 * @param query - Search query string
 * @param category - Optional category filter
 * @param limit - Maximum results (default: 20)
 * @returns Array of matching items sorted by BM25 relevance
 */
export const textSearchItems = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return textSearchItemsHandler(ctx, args);
  },
});

// ============================================================================
// TEXT SEARCH NODES
// ============================================================================

/**
 * Handler for text search on graph nodes.
 * Used by both the Convex query and for testing.
 *
 * @param ctx - Convex query context
 * @param args - Search arguments
 * @returns Array of matching nodes
 */
export async function textSearchNodesHandler(
  ctx: QueryCtx,
  args: {
    query: string;
    type?: string;
    limit?: number;
  }
): Promise<Doc<"graphNodes">[]> {
  const sanitizedQuery = sanitizeQuery(args.query);
  const limit = args.limit ?? DEFAULT_NODES_LIMIT;

  // Return empty if query is empty after sanitization
  if (!sanitizedQuery) {
    return [];
  }

  const results = await ctx.db
    .query("graphNodes")
    .withSearchIndex("by_name_search", (q) => {
      let searchQuery = q.search("name", sanitizedQuery);

      // Always filter for active nodes
      searchQuery = searchQuery.eq("status", "active");

      if (args.type) {
        searchQuery = searchQuery.eq("type", args.type);
      }

      return searchQuery;
    })
    .take(limit);

  return results;
}

/**
 * Public Convex query for text search on graph nodes.
 * Uses BM25-style keyword matching via Convex searchIndex.
 *
 * @param query - Search query string
 * @param type - Optional node type filter (project, tool, skill, concept)
 * @param limit - Maximum results (default: 10)
 * @returns Array of matching active nodes sorted by BM25 relevance
 */
export const textSearchNodes = query({
  args: {
    query: v.string(),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return textSearchNodesHandler(ctx, args);
  },
});
