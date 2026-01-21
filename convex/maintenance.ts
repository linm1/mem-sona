// convex/maintenance.ts
// Automated graph and item maintenance: orphan node archival, edge weight decay, and duplicate consolidation

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { callGeminiWithRetry } from "./utils/gemini";
import { cosineSimilarity } from "./utils/math";
import {
  TIME_CONSTANTS,
  EDGE_WEIGHT_CONFIG,
  SEARCH_CONFIG,
  PERFORMANCE_CONFIG,
  msToDays,
} from "./utils/constants";

/**
 * Graph cleanup internal action - runs weekly via cron job.
 *
 * Performs two maintenance operations:
 * 1. Orphan Node Archival: Archives nodes with 0 edges and not updated in 90+ days
 * 2. Edge Weight Decay: Applies time-based decay to edge weights (10% per 30 days)
 *
 * This is an internal action to allow database queries and mutations.
 */
export const graphCleanup = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    orphansArchived: number;
    edgesDecayed: number;
    edgesArchived: number;
  }> => {
    const now = Date.now();

    console.log("[graphCleanup] Starting maintenance run at", new Date(now).toISOString());

    // ============ ORPHAN NODE ARCHIVAL ============

    // Get all active nodes
    const activeNodes = await ctx.runQuery(internal.graph.listAllNodes, {});
    console.log(`[graphCleanup] Found ${activeNodes.length} active nodes to check`);

    let orphansArchived = 0;

    for (const node of activeNodes) {
      // Count active edges (both outgoing and incoming)
      const outgoingEdges: Doc<"graphEdges">[] = await ctx.runQuery(internal.graph.getEdgesFromInternal, {
        fromNodeId: node._id,
      });
      const incomingEdges: Doc<"graphEdges">[] = await ctx.runQuery(internal.graph.getEdgesTo, {
        toNodeId: node._id,
      });

      const activeOutgoing = outgoingEdges.filter((edge: Doc<"graphEdges">) => edge.status === "active");
      const activeIncoming = incomingEdges.filter((edge: Doc<"graphEdges">) => edge.status === "active");
      const totalActiveEdges = activeOutgoing.length + activeIncoming.length;

      // Check if node is orphaned and stale
      const daysSinceUpdate = msToDays(now - node.updatedAt);
      const isOrphan = totalActiveEdges === 0;
      const isStale = (now - node.updatedAt) > TIME_CONSTANTS.NINETY_DAYS_MS;

      if (isOrphan && isStale) {
        console.log(
          `[graphCleanup] Archiving orphan node: ${node.name} (${node.type}) - ` +
          `${daysSinceUpdate.toFixed(1)} days since last update`
        );

        await ctx.runMutation(internal.graph.archiveNodeInternal, {
          nodeId: node._id,
        });

        orphansArchived++;
      }
    }

    console.log(`[graphCleanup] Archived ${orphansArchived} orphan nodes`);

    // ============ EDGE WEIGHT DECAY ============

    // Get all active edges
    const activeEdges = await ctx.runQuery(internal.graph.listActiveEdges, {});
    console.log(`[graphCleanup] Found ${activeEdges.length} active edges to check`);

    let edgesDecayed = 0;
    let edgesArchived = 0;

    for (const edge of activeEdges) {
      const daysSinceUpdate = msToDays(now - edge.updatedAt);

      // Only apply decay if edge hasn't been updated in 30+ days
      if (daysSinceUpdate >= 30) {
        // Calculate decay: weight * DECAY_RATE^(days/30)
        const decayPeriods = daysSinceUpdate / 30;
        const decayedWeight = edge.weight * Math.pow(EDGE_WEIGHT_CONFIG.DECAY_RATE, decayPeriods);

        // Archive if weight falls below threshold
        if (decayedWeight < EDGE_WEIGHT_CONFIG.MIN_THRESHOLD) {
          console.log(
            `[graphCleanup] Archiving low-weight edge: ` +
            `${edge.relationship} (weight: ${edge.weight.toFixed(3)} -> ${decayedWeight.toFixed(3)}) - ` +
            `${daysSinceUpdate.toFixed(1)} days old`
          );

          await ctx.runMutation(internal.graph.archiveEdgeInternal, {
            edgeId: edge._id,
          });

          edgesArchived++;
        } else if (decayedWeight < edge.weight) {
          // Apply decay to weight
          console.log(
            `[graphCleanup] Decaying edge weight: ` +
            `${edge.relationship} (${edge.weight.toFixed(3)} -> ${decayedWeight.toFixed(3)}) - ` +
            `${daysSinceUpdate.toFixed(1)} days old`
          );

          await ctx.runMutation(internal.graph.updateEdgeWeightInternal, {
            edgeId: edge._id,
            weight: decayedWeight,
          });

          edgesDecayed++;
        }
      }
    }

    console.log(
      `[graphCleanup] Edge maintenance complete: ${edgesDecayed} decayed, ${edgesArchived} archived`
    );

    const summary = {
      orphansArchived,
      edgesDecayed,
      edgesArchived,
    };

    console.log("[graphCleanup] Maintenance summary:", summary);

    return summary;
  },
});

/**
 * Weekly summarization internal action - runs weekly via cron job.
 *
 * Performs item-level maintenance operations:
 * 1. Find items older than 30 days in each category
 * 2. Group items by category
 * 3. For each category, use Gemini to extract key insights and compress multiple items into summaries
 * 4. Update category summaries with compressed information
 * 5. Delete items older than 90 days that have been summarized (data compression)
 *
 * Note: Items table doesn't have a status field, so old items are deleted after summarization
 * to free up space. Original source data remains in resources table (immutable audit trail).
 *
 * This is an internal action to allow Gemini API calls and database operations.
 */
export const weeklySummarization = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    categoriesUpdated: number;
    itemsProcessed: number;
    itemsDeleted: number;
  }> => {
    const now = Date.now();

    console.log("[weeklySummarization] Starting summarization run at", new Date(now).toISOString());

    // Get all items
    const allItems: Doc<"items">[] = await ctx.runQuery(internal.items.listAllItems, {});
    console.log(`[weeklySummarization] Found ${allItems.length} total items`);

    // Find items older than 30 days
    const oldItems = allItems.filter((item: Doc<"items">) => (now - item.createdAt) > TIME_CONSTANTS.THIRTY_DAYS_MS);

    if (oldItems.length === 0) {
      console.log("[weeklySummarization] No items older than 30 days found");
      return { categoriesUpdated: 0, itemsProcessed: 0, itemsDeleted: 0 };
    }

    console.log(`[weeklySummarization] Found ${oldItems.length} items older than 30 days`);

    // Group items by category
    const itemsByCategory = new Map<string, Doc<"items">[]>();
    for (const item of oldItems) {
      if (!itemsByCategory.has(item.category)) {
        itemsByCategory.set(item.category, []);
      }
      itemsByCategory.get(item.category)!.push(item);
    }

    console.log(`[weeklySummarization] Grouped items into ${itemsByCategory.size} categories`);

    let categoriesUpdated = 0;
    let itemsDeleted = 0;

    // Process each category
    for (const [category, items] of itemsByCategory) {
      console.log(`[weeklySummarization] Processing category: ${category} (${items.length} items)`);

      try {
        // Use Gemini to compress items into insights
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY not configured");
        }

        // Get existing category summary
        const existingCategory = await ctx.runQuery(internal.categories.getCategory, {
          name: category,
        });

        const existingSummary = existingCategory?.summary || "";

        // Format items for prompt (sort by creation time)
        const sortedItems = [...items].sort((a: Doc<"items">, b: Doc<"items">) => a.createdAt - b.createdAt);
        const itemTexts = sortedItems.map((item: Doc<"items">, idx: number) => {
          const createdDate = new Date(item.createdAt).toISOString().split('T')[0];
          return `${idx + 1}. ${item.content} (created: ${createdDate})`;
        }).join("\n");

        // Build Gemini prompt
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let prompt: string;

        if (existingSummary) {
          // Merge old facts into existing summary
          prompt = `You are updating a personal knowledge summary by incorporating older facts that need to be compressed.

TASK: Merge the old facts below into the existing summary, extracting key insights and patterns.

RULES:
1. Preserve the most important and actionable information from the old facts
2. Look for patterns, trends, or repeated themes across the facts
3. Remove redundant or overly specific details
4. When old facts conflict with existing summary, prefer the existing summary (it's more recent)
5. Keep the summary concise and well-organized
6. Use markdown formatting for readability
7. Focus on timeless insights rather than time-specific details

EXISTING SUMMARY:
${existingSummary}

OLD FACTS TO COMPRESS (${items.length} items):
${itemTexts}

Write an updated summary that incorporates key insights from the old facts. Output ONLY the updated summary markdown with no additional commentary.`;
        } else {
          // Create initial summary from old facts
          prompt = `You are creating a personal knowledge summary by compressing a collection of older facts.

TASK: Extract key insights and patterns from the facts below and create a concise summary.

RULES:
1. Identify patterns, trends, or repeated themes across the facts
2. Prioritize important and actionable information
3. Remove redundant or overly specific details
4. Organize insights into a coherent structure
5. Use markdown formatting for readability
6. Focus on timeless insights rather than time-specific details

CATEGORY: ${category}

FACTS TO COMPRESS (${items.length} items):
${itemTexts}

Write a well-organized summary that captures the key insights. Output ONLY the summary markdown with no additional commentary.`;
        }

        // Call Gemini with retry logic
        const newSummary = await callGeminiWithRetry(model, prompt);

        // Update category summary
        await ctx.runMutation(internal.categories.upsertCategory, {
          name: category,
          summary: newSummary.trim(),
        });

        categoriesUpdated++;
        console.log(`[weeklySummarization] Updated summary for category: ${category}`);

        // Delete items older than 90 days (data compression after summarization)
        const veryOldItems = items.filter((item: Doc<"items">) => (now - item.createdAt) > TIME_CONSTANTS.NINETY_DAYS_MS);

        if (veryOldItems.length > 0) {
          console.log(`[weeklySummarization] Deleting ${veryOldItems.length} items older than 90 days from category: ${category}`);

          for (const item of veryOldItems) {
            await ctx.runMutation(internal.items.deleteItemInternal, {
              itemId: item._id,
            });
            itemsDeleted++;
          }
        }

        console.log(
          `[weeklySummarization] Category ${category}: ` +
          `summary updated, ${veryOldItems.length} very old items deleted`
        );
      } catch (error) {
        console.error(`[weeklySummarization] Failed to process category ${category}:`, error);
        // Continue with other categories
      }
    }

    const result = {
      categoriesUpdated,
      itemsProcessed: oldItems.length,
      itemsDeleted,
    };

    console.log("[weeklySummarization] Summarization complete:", result);

    return result;
  },
});

/**
 * Monthly reindexing internal action - runs monthly via cron job.
 *
 * Performs two maintenance operations:
 * 1. Items Reindexing: Regenerates embeddings for items not accessed in 180+ days
 * 2. Graph Nodes Reindexing: Rebuilds embeddings for all active nodes
 *
 * This ensures embeddings stay fresh with the current Voyage AI model (voyage-4)
 * and maintains consistency across the memory system.
 *
 * This is an internal action to allow Voyage AI API calls and database operations.
 */
export const monthlyReindex = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    itemsReindexed: number;
    itemsSkipped: number;
    nodesReindexed: number;
    nodesFailed: number;
  }> => {
    const now = Date.now();

    console.log("[monthlyReindex] Starting reindex run at", new Date(now).toISOString());

    // ============ ITEMS REINDEXING ============

    // Get all items for reindexing check
    const allItems: Doc<"items">[] = await ctx.runQuery(internal.items.listAllItems, {});
    console.log(`[monthlyReindex] Found ${allItems.length} items to check`);

    let itemsReindexed = 0;
    let itemsSkipped = 0;

    for (const item of allItems) {
      // Check if item hasn't been accessed in 180+ days
      // Use accessedAt as the reference point (stale items should be reindexed)
      const daysSinceAccess = msToDays(now - item.accessedAt);
      const needsReindexing = (now - item.accessedAt) > TIME_CONSTANTS.ONE_EIGHTY_DAYS_MS;

      if (needsReindexing) {
        console.log(
          `[monthlyReindex] Reindexing item: ${item._id} (category: ${item.category}) - ` +
          `${daysSinceAccess.toFixed(1)} days since last access`
        );

        try {
          // Regenerate embedding using current Voyage AI model (voyage-4)
          const embedding = await ctx.runAction(internal.items.generateEmbedding, {
            text: item.content,
            inputType: "document",
          });

          // Update item with fresh embedding
          await ctx.runMutation(internal.items.updateItemEmbeddingInternal, {
            itemId: item._id,
            embedding,
          });

          itemsReindexed++;
        } catch (error) {
          console.error(`[monthlyReindex] Failed to reindex item ${item._id}:`, error);
          itemsSkipped++;
        }

        // Add small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.REINDEX_DELAY_MS));
      }
    }

    console.log(
      `[monthlyReindex] Items reindexing complete: ${itemsReindexed} reindexed, ${itemsSkipped} failed`
    );

    // NOTE: Items don't have a 'status' field for archival (unlike graphNodes).
    // Items that haven't been accessed in 180+ days have their embeddings refreshed,
    // but they remain in the system for historical completeness.
    // Consider adding a status field to items schema if archival is needed.

    // ============ GRAPH NODES REINDEXING ============

    // Get all active nodes for embedding refresh
    const activeNodes: Doc<"graphNodes">[] = await ctx.runQuery(internal.graph.listAllNodes, {});
    console.log(`[monthlyReindex] Found ${activeNodes.length} active nodes to reindex`);

    let nodesReindexed = 0;
    let nodesFailed = 0;

    for (const node of activeNodes) {
      const daysSinceUpdate = msToDays(now - node.updatedAt);
      console.log(
        `[monthlyReindex] Reindexing node: ${node.name} (${node.type}) - ` +
        `${daysSinceUpdate.toFixed(1)} days since last update`
      );

      try {
        // Regenerate node embedding using current Voyage AI model (voyage-4)
        const embedding = await ctx.runAction(internal.graph.generateNodeEmbedding, {
          name: node.name,
          type: node.type,
          description: node.properties.description,
        });

        // Update node with fresh embedding
        await ctx.runMutation(internal.graph.updateNodeEmbeddingInternal, {
          nodeId: node._id,
          embedding,
        });

        nodesReindexed++;
      } catch (error) {
        console.error(`[monthlyReindex] Failed to reindex node ${node._id}:`, error);
        nodesFailed++;
      }

      // Add small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.REINDEX_DELAY_MS));
    }

    console.log(
      `[monthlyReindex] Nodes reindexing complete: ${nodesReindexed} reindexed, ${nodesFailed} failed`
    );

    const summary = {
      itemsReindexed,
      itemsSkipped,
      nodesReindexed,
      nodesFailed,
    };

    console.log("[monthlyReindex] Reindex summary:", summary);

    return summary;
  },
});

// ============ ITEM CONSOLIDATION ============

/**
 * Nightly consolidation internal action - runs daily via cron job.
 *
 * Performs two maintenance operations:
 * 1. Duplicate Detection & Merging: Finds items with similar content (cosine similarity > 0.95)
 *    within the same category and removes older duplicates, keeping the most recent
 * 2. Hot Memory Identification: Identifies frequently accessed items (accessed within last 7 days)
 *    and logs them for monitoring
 *
 * This is an internal action to allow database queries and mutations.
 *
 * @returns Summary with counts of duplicates merged and hot memories identified
 */
export const nightlyConsolidation = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    duplicatesMerged: number;
    hotMemories: number;
  }> => {
    const now = Date.now();

    console.log("[nightlyConsolidation] Starting maintenance run at", new Date(now).toISOString());

    // ============ DUPLICATE DETECTION & MERGING ============

    // Get all items
    const allItems: Doc<"items">[] = await ctx.runQuery(internal.items.listAllItems, {});
    console.log(`[nightlyConsolidation] Found ${allItems.length} items to check for duplicates`);

    // Group items by category
    const itemsByCategory = new Map<string, Doc<"items">[]>();

    for (const item of allItems) {
      const items = itemsByCategory.get(item.category) || [];
      items.push(item);
      itemsByCategory.set(item.category, items);
    }

    console.log(`[nightlyConsolidation] Grouped items into ${itemsByCategory.size} categories`);

    let duplicatesMerged = 0;

    // Check for duplicates within each category
    for (const [category, items] of itemsByCategory) {
      if (items.length < 2) {
        continue; // Skip categories with only one item
      }

      console.log(`[nightlyConsolidation] Checking ${items.length} items in category: ${category}`);

      // Compare each item with others in the same category
      const processedPairs = new Set<string>(); // Track compared pairs to avoid duplicates

      for (let i = 0; i < items.length; i++) {
        const item1 = items[i];

        for (let j = i + 1; j < items.length; j++) {
          const item2 = items[j];

          // Create a unique key for this pair
          const pairKey = `${item1._id}-${item2._id}`;
          if (processedPairs.has(pairKey)) {
            continue;
          }
          processedPairs.add(pairKey);

          // Calculate cosine similarity between embeddings
          const similarity = cosineSimilarity(item1.embedding, item2.embedding);

          // If similarity is above threshold, we have a duplicate
          if (similarity > SEARCH_CONFIG.SIMILARITY_THRESHOLD) {
            // Keep the most recent item (higher createdAt), delete the older one
            const keepItem = item1.createdAt > item2.createdAt ? item1 : item2;
            const deleteItem = item1.createdAt > item2.createdAt ? item2 : item1;

            console.log(
              `[nightlyConsolidation] Found duplicate in category "${category}" ` +
              `(similarity: ${similarity.toFixed(4)}): keeping item ${keepItem._id}, ` +
              `deleting item ${deleteItem._id}`
            );

            // Delete the older item
            await ctx.runMutation(internal.items.deleteItemInternal, {
              itemId: deleteItem._id,
            });

            duplicatesMerged++;

            // Remove the deleted item from the items array to avoid comparing it again
            const deleteIndex = items.findIndex((item: Doc<"items">) => item._id === deleteItem._id);
            if (deleteIndex !== -1) {
              items.splice(deleteIndex, 1);
            }
          }
        }
      }
    }

    console.log(`[nightlyConsolidation] Merged ${duplicatesMerged} duplicate items`);

    // ============ HOT MEMORY IDENTIFICATION ============

    // Find items accessed within the last 7 days with multiple accesses
    const cutoffTime = now - TIME_CONSTANTS.SEVEN_DAYS_MS;

    const hotMemories = allItems.filter((item: Doc<"items">) => {
      const isRecentlyAccessed = item.accessedAt >= cutoffTime;
      const hasMultipleAccesses = item.accessCount >= SEARCH_CONFIG.HOT_MEMORY_ACCESS_THRESHOLD;
      return isRecentlyAccessed && hasMultipleAccesses;
    });

    console.log(`[nightlyConsolidation] Found ${hotMemories.length} hot memories`);

    // Log details of hot memories for monitoring
    if (hotMemories.length > 0) {
      console.log("[nightlyConsolidation] Hot memories (frequently accessed in last 7 days):");
      for (const item of hotMemories) {
        const daysSinceAccess = msToDays(now - item.accessedAt);
        console.log(
          `  - Category: ${item.category}, Access count: ${item.accessCount}, ` +
          `Last accessed: ${daysSinceAccess.toFixed(1)} days ago, ` +
          `Content preview: ${item.content.substring(0, 100)}...`
        );
      }
    }

    const summary = {
      duplicatesMerged,
      hotMemories: hotMemories.length,
    };

    console.log("[nightlyConsolidation] Maintenance summary:", summary);

    return summary;
  },
});
