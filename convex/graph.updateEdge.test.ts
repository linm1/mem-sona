// convex/graph.updateEdge.test.ts
// Integration tests for updateEdge mutation
//
// MANUAL TEST INSTRUCTIONS:
// Since Convex doesn't support traditional unit tests, run these tests manually via:
// 1. Convex Dashboard: https://dashboard.convex.dev
// 2. Or via Node.js script with ConvexHttpClient
//
// TEST SCENARIOS:
// 1. Update weight only
// 2. Update context only
// 3. Update both weight and context
// 4. Validate weight range (0.0 - 1.0)
// 5. Error handling: missing edgeId
// 6. Error handling: no fields provided
// 7. Error handling: invalid weight (< 0.0 or > 1.0)
// 8. Verify updatedAt timestamp is updated
// 9. Verify properties.since is preserved when updating context

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Test 1: Update weight only
 * Expected: Edge weight updated, context unchanged, updatedAt updated
 */
export const testUpdateWeightOnly = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    newWeight: v.number(),
  },
  handler: async (ctx, args) => {
    // Get initial state
    const before = await ctx.db.get(args.edgeId);
    if (!before) throw new Error("Edge not found");

    const beforeContext = before.properties.context;
    const beforeSince = before.properties.since;

    // Execute mutation
    const api = (await import("./graph")).updateEdge;
    const updated = await api(ctx as any, {
      edgeId: args.edgeId,
      weight: args.newWeight,
    });

    // Assertions
    const assertions = {
      weightUpdated: updated.weight === args.newWeight,
      contextUnchanged: updated.properties.context === beforeContext,
      sincePreserved: updated.properties.since === beforeSince,
      updatedAtChanged: updated.updatedAt > before.updatedAt,
    };

    return {
      passed: Object.values(assertions).every(Boolean),
      assertions,
      before: {
        weight: before.weight,
        context: beforeContext,
        updatedAt: before.updatedAt,
      },
      after: {
        weight: updated.weight,
        context: updated.properties.context,
        updatedAt: updated.updatedAt,
      },
    };
  },
});

/**
 * Test 2: Update context only
 * Expected: Edge context updated, weight unchanged, updatedAt updated
 */
export const testUpdateContextOnly = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    newContext: v.string(),
  },
  handler: async (ctx, args) => {
    // Get initial state
    const before = await ctx.db.get(args.edgeId);
    if (!before) throw new Error("Edge not found");

    const beforeWeight = before.weight;
    const beforeSince = before.properties.since;

    // Execute mutation
    const api = (await import("./graph")).updateEdge;
    const updated = await api(ctx as any, {
      edgeId: args.edgeId,
      context: args.newContext,
    });

    // Assertions
    const assertions = {
      contextUpdated: updated.properties.context === args.newContext,
      weightUnchanged: updated.weight === beforeWeight,
      sincePreserved: updated.properties.since === beforeSince,
      updatedAtChanged: updated.updatedAt > before.updatedAt,
    };

    return {
      passed: Object.values(assertions).every(Boolean),
      assertions,
      before: {
        weight: beforeWeight,
        context: before.properties.context,
        updatedAt: before.updatedAt,
      },
      after: {
        weight: updated.weight,
        context: updated.properties.context,
        updatedAt: updated.updatedAt,
      },
    };
  },
});

/**
 * Test 3: Update both weight and context
 * Expected: Both fields updated, updatedAt updated
 */
export const testUpdateBothFields = mutation({
  args: {
    edgeId: v.id("graphEdges"),
    newWeight: v.number(),
    newContext: v.string(),
  },
  handler: async (ctx, args) => {
    // Get initial state
    const before = await ctx.db.get(args.edgeId);
    if (!before) throw new Error("Edge not found");

    // Execute mutation
    const api = (await import("./graph")).updateEdge;
    const updated = await api(ctx as any, {
      edgeId: args.edgeId,
      weight: args.newWeight,
      context: args.newContext,
    });

    // Assertions
    const assertions = {
      weightUpdated: updated.weight === args.newWeight,
      contextUpdated: updated.properties.context === args.newContext,
      sincePreserved: updated.properties.since === before.properties.since,
      updatedAtChanged: updated.updatedAt > before.updatedAt,
    };

    return {
      passed: Object.values(assertions).every(Boolean),
      assertions,
      before: {
        weight: before.weight,
        context: before.properties.context,
        updatedAt: before.updatedAt,
      },
      after: {
        weight: updated.weight,
        context: updated.properties.context,
        updatedAt: updated.updatedAt,
      },
    };
  },
});

/**
 * Test 4: Error - No fields provided
 * Expected: Throws error with message about requiring at least one field
 */
export const testErrorNoFieldsProvided = mutation({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args) => {
    try {
      const api = (await import("./graph")).updateEdge;
      await api(ctx as any, {
        edgeId: args.edgeId,
      });

      return {
        passed: false,
        error: "Expected error but mutation succeeded",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const expectedMessage = "Must provide at least one field to update";

      return {
        passed: errorMessage.includes(expectedMessage),
        error: errorMessage,
        expectedSubstring: expectedMessage,
      };
    }
  },
});

/**
 * Test 5: Error - Invalid weight (too low)
 * Expected: Throws error about weight range
 */
export const testErrorWeightTooLow = mutation({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args) => {
    try {
      const api = (await import("./graph")).updateEdge;
      await api(ctx as any, {
        edgeId: args.edgeId,
        weight: -0.5,
      });

      return {
        passed: false,
        error: "Expected error but mutation succeeded",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const expectedMessage = "Weight must be between 0.0 and 1.0";

      return {
        passed: errorMessage.includes(expectedMessage),
        error: errorMessage,
        expectedSubstring: expectedMessage,
      };
    }
  },
});

/**
 * Test 6: Error - Invalid weight (too high)
 * Expected: Throws error about weight range
 */
export const testErrorWeightTooHigh = mutation({
  args: {
    edgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args) => {
    try {
      const api = (await import("./graph")).updateEdge;
      await api(ctx as any, {
        edgeId: args.edgeId,
        weight: 1.5,
      });

      return {
        passed: false,
        error: "Expected error but mutation succeeded",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const expectedMessage = "Weight must be between 0.0 and 1.0";

      return {
        passed: errorMessage.includes(expectedMessage),
        error: errorMessage,
        expectedSubstring: expectedMessage,
      };
    }
  },
});

/**
 * Test 7: Error - Edge not found
 * Expected: Throws error with message about edge not found
 */
export const testErrorEdgeNotFound = mutation({
  args: {
    fakeEdgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args) => {
    try {
      const api = (await import("./graph")).updateEdge;
      await api(ctx as any, {
        edgeId: args.fakeEdgeId,
        weight: 0.5,
      });

      return {
        passed: false,
        error: "Expected error but mutation succeeded",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const expectedMessage = "Edge not found";

      return {
        passed: errorMessage.includes(expectedMessage),
        error: errorMessage,
        expectedSubstring: expectedMessage,
      };
    }
  },
});

/**
 * Test Suite Runner
 * Runs all tests and reports results
 */
export const runUpdateEdgeTestSuite = mutation({
  args: {
    testEdgeId: v.id("graphEdges"),
  },
  handler: async (ctx, args) => {
    const results = {
      testUpdateWeightOnly: await testUpdateWeightOnly(ctx as any, {
        edgeId: args.testEdgeId,
        newWeight: 0.8,
      }),
      testUpdateContextOnly: await testUpdateContextOnly(ctx as any, {
        edgeId: args.testEdgeId,
        newContext: "Updated context via test",
      }),
      testUpdateBothFields: await testUpdateBothFields(ctx as any, {
        edgeId: args.testEdgeId,
        newWeight: 0.9,
        newContext: "Both fields updated",
      }),
      testErrorNoFieldsProvided: await testErrorNoFieldsProvided(ctx as any, {
        edgeId: args.testEdgeId,
      }),
      testErrorWeightTooLow: await testErrorWeightTooLow(ctx as any, {
        edgeId: args.testEdgeId,
      }),
      testErrorWeightTooHigh: await testErrorWeightTooHigh(ctx as any, {
        edgeId: args.testEdgeId,
      }),
    };

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter((r) => r.passed).length;

    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        passRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
      },
      results,
    };
  },
});
