// convex/categories.ts
// Category Summarization - Evolving summaries with conflict resolution

import { mutation, query, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { callGeminiWithRetry } from "./utils/gemini";

// ============ QUERIES ============

/**
 * Get a category by name.
 */
export const getCategory = internalQuery({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Get all categories.
 */
export const listCategories = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("categories").collect();
  },
});

/**
 * Get category summary by name.
 * Returns null if category doesn't exist.
 */
export const getCategorySummary = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!category) return null;

    return {
      name: category.name,
      summary: category.summary,
      updatedAt: category.updatedAt,
    };
  },
});

/**
 * List all categories with item counts.
 * Public query for dashboard access.
 *
 * @returns Array of categories with metadata including item count
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const items = await ctx.db.query("items").collect();
    const countsByCategory = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      summary: cat.summary,
      updatedAt: cat.updatedAt,
      itemCount: countsByCategory[cat.name] || 0,
    }));
  },
});

// ============ MUTATIONS ============

/**
 * Create a new category with initial summary.
 */
export const createCategory = mutation({
  args: {
    name: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if category already exists
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Category '${args.name}' already exists`);
    }

    return await ctx.db.insert("categories", {
      name: args.name,
      summary: args.summary,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update an existing category's summary.
 */
export const updateCategorySummary = mutation({
  args: {
    name: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!category) {
      // Create new category if it doesn't exist
      return await ctx.db.insert("categories", {
        name: args.name,
        summary: args.summary,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(category._id, {
      summary: args.summary,
      updatedAt: Date.now(),
    });

    return category._id;
  },
});

/**
 * Internal mutation to upsert category (used by actions).
 */
export const upsertCategory = internalMutation({
  args: {
    name: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!category) {
      return await ctx.db.insert("categories", {
        name: args.name,
        summary: args.summary,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(category._id, {
      summary: args.summary,
      updatedAt: Date.now(),
    });

    return category._id;
  },
});

// ============ ACTIONS ============

/**
 * Evolve a category summary by merging new facts with existing summary.
 * Uses Gemini for intelligent conflict resolution.
 *
 * @param categoryName - Name of the category to evolve
 */
export const evolveSummary = internalAction({
  args: {
    categoryName: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    previousSummaryLength?: number;
    newSummaryLength?: number;
    newFactsIncorporated?: number;
    error?: string;
    unchanged?: boolean;
  }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Get existing category summary
    const existingCategory = await ctx.runQuery(internal.categories.getCategory, {
      name: args.categoryName,
    });

    const existingSummary = existingCategory?.summary || "";

    // Get all items in this category
    const items = await ctx.runQuery(internal.items.getItemsByCategory, {
      category: args.categoryName,
    });

    if (items.length === 0 && !existingSummary) {
      console.log(`No items or summary for category: ${args.categoryName}`);
      return { success: true, unchanged: true };
    }

    // Collect new facts (items created after last summary update)
    const lastUpdate = existingCategory?.updatedAt || 0;
    const newItems = items.filter((item: any) => item.createdAt > lastUpdate);

    if (newItems.length === 0 && existingSummary) {
      console.log(`No new items for category: ${args.categoryName}`);
      return { success: true, unchanged: true };
    }

    // Format facts for the prompt
    const newFacts = newItems.map((item: any) => `- ${item.content}`).join("\n");
    const allFacts = items.map((item: any) => `- ${item.content}`).join("\n");

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      let prompt: string;

      if (existingSummary) {
        // Evolve existing summary with new facts
        prompt = `You are updating a personal knowledge summary. Merge new facts into the existing summary.

IMPORTANT RULES:
1. When new information contradicts existing information, PREFER THE NEWER INFORMATION
2. Note significant changes briefly (e.g., "Previously preferred X, now prefers Y")
3. Remove outdated or superseded information
4. Keep the summary concise and well-organized
5. Use markdown formatting for readability
6. Focus on actionable, relevant information

EXISTING SUMMARY:
${existingSummary}

NEW FACTS TO INCORPORATE:
${newFacts}

Write an updated summary that integrates the new facts. Output ONLY the updated summary markdown with no additional commentary.`;
      } else {
        // Create initial summary from all facts
        prompt = `You are creating a personal knowledge summary from a collection of facts.

RULES:
1. Organize facts into a coherent, readable summary
2. Use markdown formatting for readability
3. Group related information together
4. Keep it concise but comprehensive
5. Focus on actionable, relevant information

CATEGORY: ${args.categoryName}

FACTS:
${allFacts}

Write a well-organized summary of these facts. Output ONLY the summary markdown with no additional commentary.`;
      }

      const newSummary = await callGeminiWithRetry(model, prompt);

      // Update the category with new summary
      await ctx.runMutation(internal.categories.upsertCategory, {
        name: args.categoryName,
        summary: newSummary.trim(),
      });

      return {
        success: true,
        previousSummaryLength: existingSummary.length,
        newSummaryLength: newSummary.length,
        newFactsIncorporated: newItems.length,
      };
    } catch (error) {
      console.error(`Failed to evolve summary for ${args.categoryName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Evolve all category summaries.
 * Can be called by a cron job for periodic summarization.
 */
export const evolveAllSummaries = action({
  args: {},
  handler: async (ctx): Promise<{
    categoriesProcessed: number;
    results: Array<{
      category: string;
      success: boolean;
      [key: string]: any;
    }>;
  }> => {
    // Get all unique categories from items
    const items = await ctx.runQuery(internal.items.listAllItems, {});
    const categories = [...new Set(items.map((item: any) => item.category))];

    const results = [];
    for (const category of categories) {
      const result = await ctx.runAction(internal.categories.evolveSummary, {
        categoryName: category,
      });
      results.push({
        category,
        ...result,
      });
    }

    return {
      categoriesProcessed: categories.length,
      results,
    };
  },
});

/**
 * Get a comprehensive profile by combining all category summaries.
 */
export const getFullProfile = action({
  args: {},
  handler: async (ctx): Promise<Record<string, string>> => {
    const categories = await ctx.runQuery(internal.categories.listCategories, {});

    const profile: Record<string, string> = {};
    for (const category of categories) {
      profile[category.name] = category.summary;
    }

    return profile;
  },
});
