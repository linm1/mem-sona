// convex/graph.updateEdge.relationship.test.ts
// Integration tests for updateEdge mutation - relationship parameter
//
// MANUAL TEST INSTRUCTIONS:
// Since Convex doesn't support traditional unit tests, run these tests manually via:
// 1. Convex Dashboard: https://dashboard.convex.dev
// 2. Or via Node.js script with ConvexHttpClient
//
// TEST SCENARIOS:
// 1. Update relationship only
// 2. Update relationship + weight + context (all three fields)
// 3. Validate relationship type (must be from allowed list)
// 4. Error handling: invalid relationship type
// 5. Verify updatedAt timestamp is updated
// 6. Verify properties.since is preserved when updating relationship

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Test 1: Update relationship only
 * Expected: Relationship updated, weight and context unchanged, updatedAt updated
 */
export const testUpdateRelationshipOnly = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    newRelationship: v.string(),
  },
  handler: async (ctx, args) => {
    // Get initial state
    const before = await ctx.db.get(args.edgeId);
    if (!before) throw new Error("Edge not found");

    const beforeWeight = before.weight;
    const beforeContext = before.properties.context;
    const beforeSince = before.properties.since;

    // Execute mutation
    const api = (await import("./graph")).updateEdge;
    const updated = await api(ctx as any, {
      edgeId: args.edgeId,
      relationship: args.newRelationship,
    });

    // Assertions
    const assertions = {
      relationshipUpdated: updated.relationship === args.newRelationship,
      weightUnchanged: updated.weight === beforeWeight,
      contextUnchanged: updated.properties.context === beforeContext,
      sincePreserved: updated.properties.since === beforeSince,
      updatedAtChanged: updated.updatedAt > before.updatedAt,
    };

    return {
      success: Object.values(assertions).every((v) => v === true),
      assertions,
      before: {
        relationship: before.relationship,
        weight: before.weight,
        context: before.properties.context,
        updatedAt: before.updatedAt,
      },
      after: {
        relationship: updated.relationship,
        weight: updated.weight,
        context: updated.properties.context,
        updatedAt: updated.updatedAt,
      },
    };
  },
});

/**
 * Test 2: Update all three fields (relationship + weight + context)
 * Expected: All three fields updated, properties.since preserved, updatedAt updated
 */
export const testUpdateAllEdgeFields = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    newRelationship: v.string(),
    newWeight: v.number(),
    newContext: v.string(),
  },
  handler: async (ctx, args) => {
    // Get initial state
    const before = await ctx.db.get(args.edgeId);
    if (!before) throw new Error("Edge not found");

    const beforeSince = before.properties.since;

    // Execute mutation
    const api = (await import("./graph")).updateEdge;
    const updated = await api(ctx as any, {
      edgeId: args.edgeId,
      relationship: args.newRelationship,
      weight: args.newWeight,
      context: args.newContext,
    });

    // Assertions
    const assertions = {
      relationshipUpdated: updated.relationship === args.newRelationship,
      weightUpdated: updated.weight === args.newWeight,
      contextUpdated: updated.properties.context === args.newContext,
      sincePreserved: updated.properties.since === beforeSince,
      updatedAtChanged: updated.updatedAt > before.updatedAt,
    };

    return {
      success: Object.values(assertions).every((v) => v === true),
      assertions,
      before: {
        relationship: before.relationship,
        weight: before.weight,
        context: before.properties.context,
        since: before.properties.since,
        updatedAt: before.updatedAt,
      },
      after: {
        relationship: updated.relationship,
        weight: updated.weight,
        context: updated.properties.context,
        since: updated.properties.since,
        updatedAt: updated.updatedAt,
      },
    };
  },
});

/**
 * Test 3: Validate all allowed relationship types
 * Expected: Each valid relationship type is accepted
 */
export const testValidRelationshipTypes = mutation({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args) => {
    const validRelationships = [
      'uses',
      'requires',
      'knows',
      'works_on',
      'uses_tool',
      'requires_skill',
      'works_at',
      'primary_language',
    ];

    const api = (await import("./graph")).updateEdge;
    const results = [];

    for (const relationship of validRelationships) {
      try {
        const updated = await api(ctx as any, {
          edgeId: args.edgeId,
          relationship,
        });

        results.push({
          relationship,
          success: updated.relationship === relationship,
          error: null,
        });
      } catch (error) {
        results.push({
          relationship,
          success: false,
          error: String(error),
        });
      }
    }

    return {
      success: results.every((r) => r.success),
      results,
    };
  },
});

/**
 * Test 4: Invalid relationship type error handling
 * Expected: Error thrown with message about invalid relationship type
 */
export const testInvalidRelationshipType = mutation({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args) => {
    const invalidRelationship = "invalid_type_xyz";

    try {
      const api = (await import("./graph")).updateEdge;
      await api(ctx as any, {
        edgeId: args.edgeId,
        relationship: invalidRelationship,
      });

      // Should not reach here
      return {
        success: false,
        message: "Expected error was not thrown",
      };
    } catch (error) {
      const errorMessage = String(error);
      const isCorrectError = errorMessage.includes("Invalid relationship type");

      return {
        success: isCorrectError,
        error: errorMessage,
        expectedErrorType: "Invalid relationship type",
      };
    }
  },
});

/**
 * Test 5: Relationship update with existing context and since
 * Expected: Relationship updated, context and since preserved
 */
export const testRelationshipUpdatePreservesContextAndSince = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    newRelationship: v.string(),
  },
  handler: async (ctx, args) => {
    // Get initial state
    const before = await ctx.db.get(args.edgeId);
    if (!before) throw new Error("Edge not found");

    const beforeContext = before.properties.context;
    const beforeSince = before.properties.since;

    // Verify edge has both context and since before test
    if (!beforeContext || !beforeSince) {
      return {
        success: false,
        message: "Test requires edge with existing context and since properties",
        before: {
          context: beforeContext,
          since: beforeSince,
        },
      };
    }

    // Execute mutation
    const api = (await import("./graph")).updateEdge;
    const updated = await api(ctx as any, {
      edgeId: args.edgeId,
      relationship: args.newRelationship,
    });

    // Assertions
    const assertions = {
      relationshipUpdated: updated.relationship === args.newRelationship,
      contextPreserved: updated.properties.context === beforeContext,
      sincePreserved: updated.properties.since === beforeSince,
    };

    return {
      success: Object.values(assertions).every((v) => v === true),
      assertions,
      before: {
        relationship: before.relationship,
        context: beforeContext,
        since: beforeSince,
      },
      after: {
        relationship: updated.relationship,
        context: updated.properties.context,
        since: updated.properties.since,
      },
    };
  },
});

/**
 * Test 6: Relationship + weight update (no context change)
 * Expected: Both relationship and weight updated, context unchanged
 */
export const testRelationshipAndWeightUpdate = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    newRelationship: v.string(),
    newWeight: v.number(),
  },
  handler: async (ctx, args) => {
    // Get initial state
    const before = await ctx.db.get(args.edgeId);
    if (!before) throw new Error("Edge not found");

    const beforeContext = before.properties.context;

    // Execute mutation
    const api = (await import("./graph")).updateEdge;
    const updated = await api(ctx as any, {
      edgeId: args.edgeId,
      relationship: args.newRelationship,
      weight: args.newWeight,
    });

    // Assertions
    const assertions = {
      relationshipUpdated: updated.relationship === args.newRelationship,
      weightUpdated: updated.weight === args.newWeight,
      contextUnchanged: updated.properties.context === beforeContext,
    };

    return {
      success: Object.values(assertions).every((v) => v === true),
      assertions,
      before: {
        relationship: before.relationship,
        weight: before.weight,
        context: beforeContext,
      },
      after: {
        relationship: updated.relationship,
        weight: updated.weight,
        context: updated.properties.context,
      },
    };
  },
});
