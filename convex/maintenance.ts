// convex/maintenance.ts
// Automated graph maintenance: orphan node archival and edge weight decay

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

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
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const DECAY_RATE = 0.9; // 10% decay per 30 days
    const MIN_WEIGHT_THRESHOLD = 0.1; // Archive edges below this weight

    console.log("[graphCleanup] Starting maintenance run at", new Date(now).toISOString());

    // ============ ORPHAN NODE ARCHIVAL ============

    // Get all active nodes
    const activeNodes = await ctx.runQuery(internal.graph.listAllNodes, {});
    console.log(`[graphCleanup] Found ${activeNodes.length} active nodes to check`);

    let orphansArchived = 0;

    for (const node of activeNodes) {
      // Count active edges (both outgoing and incoming)
      const outgoingEdges = await ctx.runQuery(internal.graph.getEdgesFromInternal, {
        fromNodeId: node._id,
      });
      const incomingEdges = await ctx.runQuery(internal.graph.getEdgesTo, {
        toNodeId: node._id,
      });

      const activeOutgoing = outgoingEdges.filter((edge) => edge.status === "active");
      const activeIncoming = incomingEdges.filter((edge) => edge.status === "active");
      const totalActiveEdges = activeOutgoing.length + activeIncoming.length;

      // Check if node is orphaned and stale
      const daysSinceUpdate = (now - node.updatedAt) / (24 * 60 * 60 * 1000);
      const isOrphan = totalActiveEdges === 0;
      const isStale = (now - node.updatedAt) > NINETY_DAYS_MS;

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
      const daysSinceUpdate = (now - edge.updatedAt) / (24 * 60 * 60 * 1000);

      // Only apply decay if edge hasn't been updated in 30+ days
      if (daysSinceUpdate >= 30) {
        // Calculate decay: weight * 0.9^(days/30)
        const decayPeriods = daysSinceUpdate / 30;
        const decayedWeight = edge.weight * Math.pow(DECAY_RATE, decayPeriods);

        // Archive if weight falls below threshold
        if (decayedWeight < MIN_WEIGHT_THRESHOLD) {
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
