// convex/graph.ts
// Graph Node Management - Create, read, update, archive nodes with embeddings

import { mutation, query, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { VoyageAIClient } from "voyageai";
import type { Id, Doc } from "./_generated/dataModel";

// Allowed node types
const VALID_NODE_TYPES = ["project", "tool", "skill", "concept"] as const;
type NodeType = typeof VALID_NODE_TYPES[number];

// ============ EMBEDDING GENERATION ============

/**
 * Generate embedding for graph node using Voyage AI SDK (voyage-4).
 * This is an internal action because it calls external services.
 *
 * Uses voyage-4 (latest generation standard embeddings) with 1024-dimension output (default).
 * voyage-4 uses standard embed() method, not contextualizedEmbed().
 *
 * NOTE: voyage-context-3 is no longer supported by Voyage AI API as of Jan 2026.
 * Migrated to voyage-4 standard embeddings (still provides excellent retrieval quality).
 *
 * @param name - Node name
 * @param type - Node type
 * @param description - Optional description
 * @returns Embedding vector (1024 dimensions)
 */
export const generateNodeEmbedding = internalAction({
  args: {
    name: v.string(),
    type: v.string(),
    description: v.optional(v.string()),
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

      // Concatenate node information for embedding
      const text = `${args.name} (${args.type}): ${args.description || ''}`;

      // Call the standard embed API (not contextualizedEmbed)
      // voyage-4 uses standard embeddings, not contextualized
      const result = await client.embed({
        input: text, // Single string input
        model: "voyage-4", // Latest generation standard embeddings
        inputType: "document", // "document" optimization hint for storage
        outputDimension: 1024, // voyage-4 default dimension (also supports 256, 512, 2048)
      });

      // Response structure for standard embeddings: result.data[0].embedding
      if (!result.data || result.data.length === 0 || !result.data[0].embedding) {
        throw new Error("Empty embedding response from Voyage API");
      }

      return result.data[0].embedding;
    } catch (error) {
      console.error("Node embedding generation failed:", error);
      throw error;
    }
  },
});

// ============ NODE CRUD OPERATIONS ============

/**
 * Internal: Create a new graph node with automatic embedding generation.
 * This internal action is called from extraction.ts and within upsertEdge.
 *
 * @param name - Node name (e.g., "TypeScript", "mem-sona")
 * @param type - Node type (must be one of: project, tool, skill, concept)
 * @param properties - Optional flexible metadata (description, status, url)
 * @returns Node ID
 */
export const createNodeInternal = internalAction({
  args: {
    name: v.string(),
    type: v.string(),
    properties: v.optional(v.object({
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      url: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<string> => {
    // Validate node type
    if (!VALID_NODE_TYPES.includes(args.type as NodeType)) {
      throw new Error(
        `Invalid node type: ${args.type}. Must be one of: ${VALID_NODE_TYPES.join(", ")}`
      );
    }

    // Check for duplicates using name + type
    const existing = await ctx.runQuery(internal.graph.getNodeByNameInternal, {
      name: args.name,
      type: args.type,
    });

    if (existing) {
      throw new Error(`Node already exists: ${args.name} (${args.type})`);
    }

    // Generate embedding with description from properties
    const embedding = await ctx.runAction(internal.graph.generateNodeEmbedding, {
      name: args.name,
      type: args.type,
      description: args.properties?.description,
    });

    // Insert node with embedding
    const nodeId = await ctx.runMutation(internal.graph.insertNode, {
      name: args.name,
      type: args.type,
      properties: args.properties || {},
      embedding,
    });

    return nodeId;
  },
});

/**
 * Public wrapper: Create a new graph node (accessible from MCP server).
 * This public action calls the internal createNodeInternal action.
 *
 * @param name - Node name (e.g., "TypeScript", "mem-sona")
 * @param type - Node type (must be one of: project, tool, skill, concept)
 * @param properties - Optional flexible metadata (description, status, url)
 * @returns Node ID
 */
export const createNode = action({
  args: {
    name: v.string(),
    type: v.string(),
    properties: v.optional(v.object({
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      url: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<string> => {
    return await ctx.runAction(internal.graph.createNodeInternal, args);
  },
});

/**
 * Internal mutation to insert node (called by createNodeInternal action).
 */
export const insertNode = internalMutation({
  args: {
    name: v.string(),
    type: v.string(),
    properties: v.object({
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args): Promise<string> => {
    const now = Date.now();
    return await ctx.db.insert("graphNodes", {
      name: args.name,
      type: args.type,
      properties: args.properties,
      embedding: args.embedding,
      status: "active", // All new nodes start as active
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update node properties.
 * Updates the properties object and the updatedAt timestamp.
 *
 * @param nodeId - Node ID to update
 * @param properties - New properties object (replaces existing)
 * @returns Updated node
 */
export const updateNode = mutation({
  args: {
    nodeId: v.id("graphNodes"),
    properties: v.object({
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args): Promise<Doc<"graphNodes">> => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${args.nodeId}`);
    }

    await ctx.db.patch(args.nodeId, {
      properties: args.properties,
      updatedAt: Date.now(),
    });

    const updatedNode = await ctx.db.get(args.nodeId);
    if (!updatedNode) {
      throw new Error("Failed to retrieve updated node");
    }

    return updatedNode;
  },
});

/**
 * Archive a node (soft delete).
 * Sets status to "archived" instead of deleting the record.
 *
 * @param nodeId - Node ID to archive
 * @returns Success boolean
 */
export const archiveNode = mutation({
  args: {
    nodeId: v.id("graphNodes"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${args.nodeId}`);
    }

    await ctx.db.patch(args.nodeId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Get a single node by ID.
 *
 * @param nodeId - Node ID
 * @returns Node or null if not found
 */
export const getNode = query({
  args: {
    nodeId: v.id("graphNodes"),
  },
  handler: async (ctx, args): Promise<Doc<"graphNodes"> | null> => {
    return await ctx.db.get(args.nodeId);
  },
});

/**
 * Get a node by name and type.
 * Uses the compound by_name_type index for efficient lookup.
 *
 * @param name - Node name
 * @param type - Node type
 * @returns Node or null if not found
 */
export const getNodeByName = query({
  args: {
    name: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"graphNodes"> | null> => {
    return await ctx.db
      .query("graphNodes")
      .withIndex("by_name_type", (q) =>
        q.eq("name", args.name).eq("type", args.type)
      )
      .first();
  },
});

/**
 * Internal query version of getNodeByName (for use by actions).
 */
export const getNodeByNameInternal = internalQuery({
  args: {
    name: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"graphNodes"> | null> => {
    return await ctx.db
      .query("graphNodes")
      .withIndex("by_name_type", (q) =>
        q.eq("name", args.name).eq("type", args.type)
      )
      .first();
  },
});

// ============ SEMANTIC SEARCH ============

/**
 * Search nodes semantically using vector similarity.
 * Generates query embedding and searches using vector index.
 *
 * @param queryText - Search query text
 * @param nodeType - Optional node type filter
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of nodes with similarity scores
 */
export const searchNodes = action({
  args: {
    queryText: v.string(),
    nodeType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    node: Doc<"graphNodes">;
    score: number;
  }>> => {
    // Validate node type if provided
    if (args.nodeType && !VALID_NODE_TYPES.includes(args.nodeType as NodeType)) {
      throw new Error(
        `Invalid node type: ${args.nodeType}. Must be one of: ${VALID_NODE_TYPES.join(", ")}`
      );
    }

    // Generate query embedding
    const embedding = await ctx.runAction(internal.graph.generateNodeEmbedding, {
      name: args.queryText,
      type: args.nodeType || "concept", // Default to concept for generic queries
      description: "",
    });

    const limit = args.limit ?? 10;

    // Use ctx.vectorSearch for similarity search (only available in actions)
    const searchQuery: {
      vector: number[];
      limit: number;
      filter?: (q: any) => any;
    } = {
      vector: embedding,
      limit: limit * 2, // Get more results for filtering
    };

    // Add filter if nodeType is specified
    if (args.nodeType) {
      const nodeType = args.nodeType; // Capture for closure
      searchQuery.filter = (q) => q.eq("type", nodeType);
    }

    const searchResults = await ctx.vectorSearch("graphNodes", "by_embedding", searchQuery);

    // Load the actual node documents and filter for active nodes
    const nodeIds = searchResults.map((result) => result._id);
    const nodes = await ctx.runQuery(internal.graph.fetchNodesByIds, {
      nodeIds,
    });

    // Filter for active nodes and attach scores
    const results = nodes
      .filter((node) => node.status === "active")
      .slice(0, limit)
      .map((node) => {
        const searchResult = searchResults.find((r) => r._id === node._id);
        return {
          node,
          score: searchResult?._score ?? 0,
        };
      });

    return results;
  },
});

/**
 * Internal query to fetch multiple nodes by IDs.
 * Used by vector search to load complete node documents.
 *
 * @param nodeIds - Array of node IDs to fetch
 * @returns Array of nodes
 */
export const fetchNodesByIds = internalQuery({
  args: {
    nodeIds: v.array(v.id("graphNodes")),
  },
  handler: async (ctx, args): Promise<Array<Doc<"graphNodes">>> => {
    const nodes = await Promise.all(
      args.nodeIds.map((id) => ctx.db.get(id))
    );
    // Filter out any null results (deleted nodes)
    return nodes.filter((node): node is Doc<"graphNodes"> => node !== null);
  },
});

// ============ LIST QUERIES ============

/**
 * List all nodes of a specific type.
 * Filters for active nodes only.
 *
 * @param type - Node type to filter by
 * @returns Array of active nodes
 */
export const listNodesByType = query({
  args: {
    type: v.string(),
  },
  handler: async (ctx, args): Promise<Array<Doc<"graphNodes">>> => {
    // Validate node type
    if (!VALID_NODE_TYPES.includes(args.type as NodeType)) {
      throw new Error(
        `Invalid node type: ${args.type}. Must be one of: ${VALID_NODE_TYPES.join(", ")}`
      );
    }

    return await ctx.db
      .query("graphNodes")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * List all active nodes.
 * No filtering by type.
 *
 * @returns Array of all active nodes
 */
export const listAllNodes = internalQuery({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"graphNodes">>> => {
    return await ctx.db
      .query("graphNodes")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// ============ EDGE MANAGEMENT ============

/**
 * Check if a relationship type is exclusive (only one target allowed at a time).
 * Exclusive relationships automatically archive previous edges when a new target is set.
 *
 * @param rel - Relationship type
 * @returns True if relationship is exclusive
 */
function isExclusiveRelationship(rel: string): boolean {
  return rel === "works_at" || rel === "primary_language";
}

/**
 * Internal: Upsert an edge with conflict resolution for exclusive relationships.
 * This internal action is called from extraction.ts and the public upsertEdge wrapper.
 *
 * Logic:
 * 1. Find or create fromNode and toNode
 * 2. Check for existing edge (same from/to/relationship)
 * 3. If exclusive + different target: archive old edges (status = "superseded")
 * 4. If exact match: strengthen weight (+0.1, max 1.0)
 * 5. Otherwise: create new edge (weight = 0.5)
 *
 * @param fromName - Source node name
 * @param fromType - Source node type
 * @param toName - Target node name
 * @param toType - Target node type
 * @param relationship - Edge relationship type
 * @param context - Optional context for the relationship
 * @returns Edge ID and action taken
 */
export const upsertEdgeInternal = internalAction({
  args: {
    fromName: v.string(),
    fromType: v.string(),
    toName: v.string(),
    toType: v.string(),
    relationship: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    edgeId: string;
    action: "created" | "strengthened" | "superseded_and_created";
  }> => {
    // Step 1: Find or create fromNode
    let fromNode = await ctx.runQuery(internal.graph.getNodeByNameInternal, {
      name: args.fromName,
      type: args.fromType,
    });

    if (!fromNode) {
      // Create fromNode if it doesn't exist
      const fromNodeId = await ctx.runAction(internal.graph.createNodeInternal, {
        name: args.fromName,
        type: args.fromType,
        properties: {},
      }) as Id<"graphNodes">;
      fromNode = await ctx.runQuery(internal.graph.getNodeInternal, {
        nodeId: fromNodeId,
      });
      if (!fromNode) {
        throw new Error("Failed to create fromNode");
      }
    }

    // Step 2: Find or create toNode
    let toNode = await ctx.runQuery(internal.graph.getNodeByNameInternal, {
      name: args.toName,
      type: args.toType,
    });

    if (!toNode) {
      // Create toNode if it doesn't exist
      const toNodeId = await ctx.runAction(internal.graph.createNodeInternal, {
        name: args.toName,
        type: args.toType,
        properties: {},
      }) as Id<"graphNodes">;
      toNode = await ctx.runQuery(internal.graph.getNodeInternal, {
        nodeId: toNodeId,
      });
      if (!toNode) {
        throw new Error("Failed to create toNode");
      }
    }

    // Step 3: Check for existing edge with same from/to/relationship
    const existingEdge = await ctx.runQuery(internal.graph.findEdgeInternal, {
      fromNodeId: fromNode._id,
      toNodeId: toNode._id,
      relationship: args.relationship,
    });

    // Step 4: If exact match exists, strengthen it
    if (existingEdge && existingEdge.status === "active") {
      const newWeight = Math.min(1.0, existingEdge.weight + 0.1);
      await ctx.runMutation(internal.graph.updateEdgeWeightInternal, {
        edgeId: existingEdge._id,
        weight: newWeight,
      });
      return {
        edgeId: existingEdge._id,
        action: "strengthened",
      };
    }

    // Step 5: Handle exclusive relationships
    if (isExclusiveRelationship(args.relationship)) {
      // Find all active edges from the same source with the same relationship
      const existingEdges = await ctx.runQuery(internal.graph.getEdgesFromInternal, {
        fromNodeId: fromNode._id,
        relationship: args.relationship,
      });

      // Archive any active edges that point to a different target
      const edgesToSupersede = existingEdges.filter(
        (edge) => edge.toNode !== toNode._id && edge.status === "active"
      );

      if (edgesToSupersede.length > 0) {
        await ctx.runMutation(internal.graph.supersedeEdgesInternal, {
          edgeIds: edgesToSupersede.map((e) => e._id),
        });

        // Create new edge
        const edgeId = await ctx.runMutation(internal.graph.insertEdge, {
          fromNode: fromNode._id,
          toNode: toNode._id,
          relationship: args.relationship,
          weight: 0.5,
          context: args.context,
        });

        return {
          edgeId,
          action: "superseded_and_created",
        };
      }
    }

    // Step 6: Create new edge (no conflict)
    const edgeId = await ctx.runMutation(internal.graph.insertEdge, {
      fromNode: fromNode._id,
      toNode: toNode._id,
      relationship: args.relationship,
      weight: 0.5,
      context: args.context,
    });

    return {
      edgeId,
      action: "created",
    };
  },
});

/**
 * Public wrapper: Upsert an edge (accessible from MCP server).
 * This public action calls the internal upsertEdgeInternal action.
 *
 * @param fromName - Source node name
 * @param fromType - Source node type
 * @param toName - Target node name
 * @param toType - Target node type
 * @param relationship - Edge relationship type
 * @param context - Optional context for the relationship
 * @returns Edge ID and action taken
 */
export const upsertEdge = action({
  args: {
    fromName: v.string(),
    fromType: v.string(),
    toName: v.string(),
    toType: v.string(),
    relationship: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    edgeId: string;
    action: "created" | "strengthened" | "superseded_and_created";
  }> => {
    return await ctx.runAction(internal.graph.upsertEdgeInternal, args);
  },
});

/**
 * Internal query to find an edge by from/to/relationship.
 */
export const findEdgeInternal = internalQuery({
  args: {
    fromNodeId: v.id("graphNodes"),
    toNodeId: v.id("graphNodes"),
    relationship: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"graphEdges"> | null> => {
    const edges = await ctx.db
      .query("graphEdges")
      .withIndex("by_from_relationship", (q) =>
        q.eq("fromNode", args.fromNodeId).eq("relationship", args.relationship)
      )
      .filter((q) => q.eq(q.field("toNode"), args.toNodeId))
      .first();

    return edges;
  },
});

/**
 * Internal query version of getNode (for use by actions).
 */
export const getNodeInternal = internalQuery({
  args: {
    nodeId: v.id("graphNodes"),
  },
  handler: async (ctx, args): Promise<Doc<"graphNodes"> | null> => {
    return await ctx.db.get(args.nodeId);
  },
});

/**
 * Internal query to get edges from a node with optional relationship filter.
 */
export const getEdgesFromInternal = internalQuery({
  args: {
    fromNodeId: v.id("graphNodes"),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<Doc<"graphEdges">>> => {
    if (args.relationship !== undefined) {
      return await ctx.db
        .query("graphEdges")
        .withIndex("by_from_relationship", (q) =>
          q.eq("fromNode", args.fromNodeId).eq("relationship", args.relationship!)
        )
        .collect();
    } else {
      return await ctx.db
        .query("graphEdges")
        .withIndex("by_from", (q) => q.eq("fromNode", args.fromNodeId))
        .collect();
    }
  },
});

/**
 * Internal mutation to insert an edge.
 */
export const insertEdge = internalMutation({
  args: {
    fromNode: v.id("graphNodes"),
    toNode: v.id("graphNodes"),
    relationship: v.string(),
    weight: v.number(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const now = Date.now();
    return await ctx.db.insert("graphEdges", {
      fromNode: args.fromNode,
      toNode: args.toNode,
      relationship: args.relationship,
      weight: args.weight,
      properties: {
        context: args.context,
        since: now,
      },
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal mutation to supersede multiple edges (set status to "superseded").
 */
export const supersedeEdgesInternal = internalMutation({
  args: {
    edgeIds: v.array(v.id("graphEdges")),
  },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    await Promise.all(
      args.edgeIds.map((edgeId) =>
        ctx.db.patch(edgeId, {
          status: "superseded",
          updatedAt: now,
        })
      )
    );
  },
});

/**
 * Internal mutation to update edge weight.
 */
export const updateEdgeWeightInternal = internalMutation({
  args: {
    edgeId: v.id("graphEdges"),
    weight: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    // Validate weight range
    if (args.weight < 0.0 || args.weight > 1.0) {
      throw new Error(`Weight must be between 0.0 and 1.0, got: ${args.weight}`);
    }

    await ctx.db.patch(args.edgeId, {
      weight: args.weight,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to archive a node (set status to "archived").
 * Used by maintenance jobs.
 */
export const archiveNodeInternal = internalMutation({
  args: {
    nodeId: v.id("graphNodes"),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.nodeId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to archive an edge (set status to "archived").
 * Used by maintenance jobs.
 */
export const archiveEdgeInternal = internalMutation({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.edgeId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// ============ EDGE CRUD OPERATIONS ============

/**
 * Get a single edge by ID.
 *
 * @param edgeId - Edge ID
 * @returns Edge or null if not found
 */
export const getEdge = query({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args): Promise<Doc<"graphEdges"> | null> => {
    return await ctx.db.get(args.edgeId);
  },
});

/**
 * Delete an edge (soft delete - set status to "archived").
 *
 * @param edgeId - Edge ID to delete
 * @returns Success boolean
 */
export const deleteEdge = mutation({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const edge = await ctx.db.get(args.edgeId);
    if (!edge) {
      throw new Error(`Edge not found: ${args.edgeId}`);
    }

    await ctx.db.patch(args.edgeId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Get edges from a node with optional relationship filter.
 * Uses indexes for efficient queries.
 *
 * @param fromNodeId - Source node ID
 * @param relationship - Optional relationship filter
 * @returns Array of edges
 */
export const getEdgesFrom = query({
  args: {
    fromNodeId: v.id("graphNodes"),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<Doc<"graphEdges">>> => {
    if (args.relationship !== undefined) {
      return await ctx.db
        .query("graphEdges")
        .withIndex("by_from_relationship", (q) =>
          q.eq("fromNode", args.fromNodeId).eq("relationship", args.relationship!)
        )
        .collect();
    } else {
      return await ctx.db
        .query("graphEdges")
        .withIndex("by_from", (q) => q.eq("fromNode", args.fromNodeId))
        .collect();
    }
  },
});

/**
 * Get edges to a node with optional relationship filter.
 * Uses by_to index for efficient queries.
 *
 * @param toNodeId - Target node ID
 * @param relationship - Optional relationship filter
 * @returns Array of edges
 */
export const getEdgesTo = internalQuery({
  args: {
    toNodeId: v.id("graphNodes"),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<Doc<"graphEdges">>> => {
    const edges = await ctx.db
      .query("graphEdges")
      .withIndex("by_to", (q) => q.eq("toNode", args.toNodeId))
      .collect();

    // Filter by relationship if specified
    if (args.relationship) {
      return edges.filter((edge) => edge.relationship === args.relationship);
    }

    return edges;
  },
});

/**
 * List all active edges.
 * Filters for active edges only.
 *
 * @returns Array of active edges
 */
export const listActiveEdges = internalQuery({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"graphEdges">>> => {
    return await ctx.db
      .query("graphEdges")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// ============ WEIGHT MANAGEMENT ============

/**
 * Update edge weight with validation.
 * Weight must be between 0.0 and 1.0.
 *
 * @param edgeId - Edge ID to update
 * @param weight - New weight value (0.0 - 1.0)
 * @returns Updated edge
 */
export const updateEdgeWeight = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    weight: v.number(),
  },
  handler: async (ctx, args): Promise<Doc<"graphEdges">> => {
    // Validate weight range
    if (args.weight < 0.0 || args.weight > 1.0) {
      throw new Error(`Weight must be between 0.0 and 1.0, got: ${args.weight}`);
    }

    const edge = await ctx.db.get(args.edgeId);
    if (!edge) {
      throw new Error(`Edge not found: ${args.edgeId}`);
    }

    await ctx.db.patch(args.edgeId, {
      weight: args.weight,
      updatedAt: Date.now(),
    });

    const updatedEdge = await ctx.db.get(args.edgeId);
    if (!updatedEdge) {
      throw new Error("Failed to retrieve updated edge");
    }

    return updatedEdge;
  },
});

/**
 * Strengthen an edge by increasing its weight.
 * Weight is capped at 1.0.
 *
 * @param edgeId - Edge ID to strengthen
 * @param amount - Amount to increase weight by (default: 0.1)
 * @returns Updated edge
 */
export const strengthenEdge = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Doc<"graphEdges">> => {
    const edge = await ctx.db.get(args.edgeId);
    if (!edge) {
      throw new Error(`Edge not found: ${args.edgeId}`);
    }

    const amount = args.amount ?? 0.1;
    const newWeight = Math.min(1.0, edge.weight + amount);

    await ctx.db.patch(args.edgeId, {
      weight: newWeight,
      updatedAt: Date.now(),
    });

    const updatedEdge = await ctx.db.get(args.edgeId);
    if (!updatedEdge) {
      throw new Error("Failed to retrieve updated edge");
    }

    return updatedEdge;
  },
});

// ============ GRAPH TRAVERSAL QUERIES ============

/**
 * Get all tools used by a project (1-hop traversal).
 * Follows "uses" relationships from a project node to tool nodes.
 *
 * @param projectName - Name of the project
 * @returns Array of tool nodes used by the project
 */
export const getProjectTools = query({
  args: {
    projectName: v.string()
  },
  handler: async (ctx, args): Promise<Array<Doc<"graphNodes">>> => {
    // Step 1: Find project node by name + type="project"
    const projectNode = await ctx.db
      .query("graphNodes")
      .withIndex("by_name_type", (q) =>
        q.eq("name", args.projectName).eq("type", "project")
      )
      .first();

    if (!projectNode) {
      throw new Error(`Project not found: ${args.projectName}`);
    }

    // Step 2: Query edges using by_from_relationship index, relationship="uses"
    const edges = await ctx.db
      .query("graphEdges")
      .withIndex("by_from_relationship", (q) =>
        q.eq("fromNode", projectNode._id).eq("relationship", "uses")
      )
      .collect();

    // Step 3: Filter for status="active"
    const activeEdges = edges.filter((edge) => edge.status === "active");

    // Step 4: Fetch target nodes (tools)
    const toolNodes = await Promise.all(
      activeEdges.map((edge) => ctx.db.get(edge.toNode))
    );

    // Step 5: Filter out any null results and return array of tool nodes
    return toolNodes.filter((node): node is Doc<"graphNodes"> => node !== null);
  },
});

/**
 * Get all prerequisites (skills) required by a tool (2-hop traversal).
 * Follows "requires" relationships from a tool node to skill nodes.
 *
 * @param toolName - Name of the tool
 * @returns Array of skill nodes required by the tool
 */
export const getToolPrerequisites = query({
  args: {
    toolName: v.string()
  },
  handler: async (ctx, args): Promise<Array<Doc<"graphNodes">>> => {
    // Step 1: Find tool node by name + type="tool"
    const toolNode = await ctx.db
      .query("graphNodes")
      .withIndex("by_name_type", (q) =>
        q.eq("name", args.toolName).eq("type", "tool")
      )
      .first();

    if (!toolNode) {
      throw new Error(`Tool not found: ${args.toolName}`);
    }

    // Step 2: Query edges using by_from_relationship index, relationship="requires"
    const edges = await ctx.db
      .query("graphEdges")
      .withIndex("by_from_relationship", (q) =>
        q.eq("fromNode", toolNode._id).eq("relationship", "requires")
      )
      .collect();

    // Step 3: Filter for status="active"
    const activeEdges = edges.filter((edge) => edge.status === "active");

    // Step 4: Fetch target nodes (skills)
    const skillNodes = await Promise.all(
      activeEdges.map((edge) => ctx.db.get(edge.toNode))
    );

    // Step 5: Filter out any null results and return array of skill nodes
    return skillNodes.filter((node): node is Doc<"graphNodes"> => node !== null);
  },
});

/**
 * Find connection path between two nodes using BFS (breadth-first search).
 * Returns the shortest path between start and end nodes, or null if no path exists.
 *
 * @param startName - Name of the starting node
 * @param endName - Name of the ending node
 * @param maxDepth - Maximum search depth (default: 3)
 * @returns Path array alternating between nodes and edge info, or null if no path found
 */
export const findConnection = query({
  args: {
    startName: v.string(),
    endName: v.string(),
    maxDepth: v.optional(v.number())
  },
  handler: async (ctx, args): Promise<Array<any> | null> => {
    const maxDepth = args.maxDepth ?? 3;

    // Find all nodes with the start name (could be multiple types)
    const startNodes = await ctx.db
      .query("graphNodes")
      .withIndex("by_name", (q) => q.eq("name", args.startName))
      .collect();

    if (startNodes.length === 0) {
      throw new Error(`Start node not found: ${args.startName}`);
    }

    // Find all nodes with the end name
    const endNodes = await ctx.db
      .query("graphNodes")
      .withIndex("by_name", (q) => q.eq("name", args.endName))
      .collect();

    if (endNodes.length === 0) {
      throw new Error(`End node not found: ${args.endName}`);
    }

    // Try to find a path from any start node to any end node
    for (const startNode of startNodes) {
      for (const endNode of endNodes) {
        const path = await bfsSearch(ctx, startNode, endNode, maxDepth);
        if (path) {
          return path;
        }
      }
    }

    // No path found
    return null;
  },
});

/**
 * BFS helper function to find shortest path between two nodes.
 * Uses a queue to explore nodes level by level.
 *
 * @param ctx - Query context
 * @param startNode - Starting node
 * @param endNode - Target node
 * @param maxDepth - Maximum search depth
 * @returns Path array or null if no path found
 */
async function bfsSearch(
  ctx: any,
  startNode: Doc<"graphNodes">,
  endNode: Doc<"graphNodes">,
  maxDepth: number
): Promise<Array<any> | null> {
  // Check if start and end are the same
  if (startNode._id === endNode._id) {
    return [startNode];
  }

  // BFS queue: each item is { node, path, depth }
  interface QueueItem {
    node: Doc<"graphNodes">;
    path: Array<any>; // Alternating nodes and edge info
    depth: number;
  }

  const queue: QueueItem[] = [{
    node: startNode,
    path: [startNode],
    depth: 0,
  }];

  // Visited set to prevent cycles
  const visited = new Set<string>([startNode._id]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Check if we've reached max depth
    if (current.depth >= maxDepth) {
      continue;
    }

    // Get all active outgoing edges from current node
    const edges = await ctx.db
      .query("graphEdges")
      .withIndex("by_from", (q: any) => q.eq("fromNode", current.node._id))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();

    // Explore each edge
    for (const edge of edges) {
      // Skip if we've already visited this node
      if (visited.has(edge.toNode)) {
        continue;
      }

      // Fetch the target node
      const nextNode = await ctx.db.get(edge.toNode);
      if (!nextNode) {
        continue;
      }

      // Build the path including the edge info
      const newPath = [
        ...current.path,
        { edge: edge.relationship },
        nextNode,
      ];

      // Check if we've reached the end node
      if (nextNode._id === endNode._id) {
        return newPath;
      }

      // Mark as visited and add to queue
      visited.add(nextNode._id);
      queue.push({
        node: nextNode,
        path: newPath,
        depth: current.depth + 1,
      });
    }
  }

  // No path found
  return null;
}

/**
 * Get a project with all its tools and required skills (2-hop traversal).
 * Performs: project -> uses_tool -> tools -> requires_skill -> skills
 * This is an action that combines multiple queries for the MCP server.
 *
 * @param projectName - Project name to query
 * @returns Project node, tools, and skills (or null if project not found)
 */
export const getProjectWithToolsAndSkills = action({
  args: {
    projectName: v.string(),
  },
  handler: async (ctx, args): Promise<{
    project: Doc<"graphNodes">;
    tools: Array<Doc<"graphNodes">>;
    skills: Array<Doc<"graphNodes">>;
  } | null> => {
    // Step 1: Find the project node
    const project = await ctx.runQuery(internal.graph.getNodeByNameInternal, {
      name: args.projectName,
      type: "project",
    });

    if (!project || project.status !== "active") {
      return null;
    }

    // Step 2: Get all tools used by the project (1st hop)
    // Use "uses_tool" relationship
    const toolEdges = await ctx.runQuery(internal.graph.getEdgesFromInternal, {
      fromNodeId: project._id,
      relationship: "uses_tool",
    });

    const activeToolEdges = toolEdges.filter((edge) => edge.status === "active");

    // Load all tool nodes
    const toolNodeIds = activeToolEdges.map((edge) => edge.toNode);
    const tools = toolNodeIds.length > 0
      ? await ctx.runQuery(internal.graph.fetchNodesByIds, {
          nodeIds: toolNodeIds,
        })
      : [];

    const activeTools = tools.filter((tool) => tool.status === "active");

    // Step 3: Get all skills required by these tools (2nd hop)
    // Use "requires_skill" relationship
    const skillNodeIds: Id<"graphNodes">[] = [];

    for (const tool of activeTools) {
      const skillEdges = await ctx.runQuery(internal.graph.getEdgesFromInternal, {
        fromNodeId: tool._id,
        relationship: "requires_skill",
      });

      const activeSkillEdges = skillEdges.filter((edge) => edge.status === "active");

      // Collect skill node IDs (deduplicate)
      for (const edge of activeSkillEdges) {
        if (!skillNodeIds.includes(edge.toNode)) {
          skillNodeIds.push(edge.toNode);
        }
      }
    }

    // Load all skill nodes
    const skills = skillNodeIds.length > 0
      ? await ctx.runQuery(internal.graph.fetchNodesByIds, {
          nodeIds: skillNodeIds,
        })
      : [];

    const activeSkills = skills.filter((skill) => skill.status === "active");

    return {
      project,
      tools: activeTools,
      skills: activeSkills,
    };
  },
});
