// convex/resources.ts
// Resource Ingestion System - Immutable storage for raw session logs

import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add a new resource (session log) to the database.
 * Resources are immutable - they cannot be updated or deleted.
 * 
 * @param content - Full session transcript
 * @param sourceAgent - Agent that generated the session ("claude-code", "copilot", "cursor")
 * @param timestamp - Optional Unix timestamp (defaults to now)
 */
export const addResource = mutation({
  args: {
    content: v.string(),
    sourceAgent: v.string(),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resourceId = await ctx.db.insert("resources", {
      content: args.content,
      sourceAgent: args.sourceAgent,
      timestamp: args.timestamp ?? Date.now(),
      processed: false, // Will be set to true after extraction
    });
    
    return resourceId;
  },
});

/**
 * Get all unprocessed resources for extraction pipeline.
 * Returns resources in chronological order (oldest first).
 */
export const getUnprocessedResources = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("resources")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .order("asc")
      .collect();
  },
});

/**
 * Get resources within a specific time range.
 * Useful for debugging or reviewing specific sessions.
 * 
 * @param startTime - Unix timestamp for range start
 * @param endTime - Unix timestamp for range end
 */
export const getResourcesByTimeRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("resources")
      .withIndex("by_timestamp")
      .filter((q) => 
        q.and(
          q.gte(q.field("timestamp"), args.startTime),
          q.lte(q.field("timestamp"), args.endTime)
        )
      )
      .collect();
  },
});

/**
 * Get a single resource by ID.
 * Used by the extraction pipeline to fetch resource content.
 */
export const getResource = internalQuery({
  args: {
    resourceId: v.id("resources"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.resourceId);
  },
});

/**
 * Mark a resource as processed.
 * Called by the extraction pipeline after facts have been extracted.
 * This is the ONLY mutation that modifies existing resources.
 */
export const markResourceProcessed = internalMutation({
  args: {
    resourceId: v.id("resources"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.resourceId, {
      processed: true,
    });
  },
});

/**
 * Get all resources (for debugging/admin).
 * Returns most recent first.
 */
export const listResources = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("resources")
      .order("desc")
      .take(limit);
  },
});
