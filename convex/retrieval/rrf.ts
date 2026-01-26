// convex/retrieval/rrf.ts
// RRF (Reciprocal Rank Fusion) algorithm functions

import { SEARCH_CONFIG, RRF_CONFIG } from "../utils/constants";
import { djb2Hash } from "../utils/hybridSearch";
import type { RRFVectorInput, RRFGraphInput, RRFFusedResult } from "./types";

/**
 * Calculate time-decay factor for memory relevance scoring.
 * Uses configurable half-life: recent memories score higher than old ones.
 *
 * This implements temporal decay to prioritize recent information over stale facts.
 * Formula: decay = 1.0 / (1.0 + (ageDays / halfLifeDays))
 * - 0 days old → 1.0 (full weight)
 * - halfLifeDays old → 0.5 (half weight)
 * - 2*halfLifeDays old → 0.33 (one-third weight)
 * - 365 days old → 0.076 (heavily decayed, with 30-day half-life)
 *
 * @param timestamp - Unix timestamp in milliseconds of when memory was created/updated
 * @returns Decay factor between 0 and 1 (1.0 = current, approaches 0 for very old)
 */
export function calculateTimeDecay(timestamp: number): number {
  const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return 1.0 / (1.0 + (ageDays / SEARCH_CONFIG.TIME_DECAY_HALFLIFE_DAYS));
}

/**
 * Generate deterministic hash of content for deduplication.
 * Used to detect duplicate results when both vector and graph searches return similar content.
 *
 * This prevents showing the same information twice when an entity appears in both
 * the file-based layer (as an item) and the graph layer (as a node).
 *
 * NOTE: Delegates to djb2Hash from utils/hybridSearch.ts for consistency.
 * The format differs slightly (no padding) but hash values are consistent.
 *
 * @param content - Text content to hash
 * @returns Deterministic hash string
 */
export function hashContent(content: string): string {
  // Delegate to the canonical implementation in utils/hybridSearch.ts
  return djb2Hash(content);
}

/**
 * Weighted Time-Decay Reciprocal Rank Fusion (RRF) algorithm.
 *
 * Combines ranked results from vector and graph search using RRF,
 * then applies time-decay AFTER fusion for clean separation of concerns.
 *
 * Why RRF over score averaging:
 * - Immune to score range differences (vector vs graph scores may differ)
 * - Focuses on ranking consistency, not absolute scores
 * - Duplicates get accumulated RRF scores (boosted, not averaged)
 * - No threshold needed - always returns Top-K results
 *
 * Formula:
 * - RRF_score = Σ(weight_i × 1/(rank_i + k))
 * - final_score = RRF_score × decay_factor
 * - decay_factor = 1 / (1 + age_days / half_life_days)
 *
 * @param vectorResults - Results from vector search, sorted by rawScore (descending)
 * @param graphResults - Results from graph search, sorted by rawScore (descending)
 * @param topK - Maximum number of results to return (default: RRF_CONFIG.DEFAULT_TOP_K)
 * @returns Array of RRFFusedResult sorted by finalScore (descending)
 */
export function weightedTimeDecayRRF(
  vectorResults: Array<RRFVectorInput>,
  graphResults: Array<RRFGraphInput>,
  topK: number = RRF_CONFIG.DEFAULT_TOP_K
): Array<RRFFusedResult> {
  // Map for accumulating RRF scores by content hash
  const fused = new Map<string, {
    type: "item" | "node";
    rrfScore: number;
    timestamp: number;
    content: string;
    sources: Set<"vector" | "graph">;
    nodeId?: string;
  }>();

  // Process vector results (must be sorted by rawScore, descending)
  vectorResults.forEach((item: RRFVectorInput, index: number) => {
    const rank = index + 1; // 1-indexed for RRF formula
    const key = hashContent(item.content);
    const contribution = RRF_CONFIG.VECTOR_WEIGHT * (1 / (rank + RRF_CONFIG.CONSTANT));

    if (fused.has(key)) {
      // Content already exists - accumulate RRF score
      const existing = fused.get(key)!;
      existing.rrfScore += contribution;
      existing.sources.add("vector");
      // Keep earliest timestamp for time-decay (more conservative)
      existing.timestamp = Math.min(existing.timestamp, item.timestamp);
    } else {
      // New content from vector search
      fused.set(key, {
        type: "item",
        rrfScore: contribution,
        timestamp: item.timestamp,
        content: item.content,
        sources: new Set<"vector" | "graph">(["vector"]),
      });
    }
  });

  // Process graph results (must be sorted by rawScore, descending)
  graphResults.forEach((item: RRFGraphInput, index: number) => {
    const rank = index + 1; // 1-indexed for RRF formula
    const key = hashContent(item.context);
    const contribution = RRF_CONFIG.GRAPH_WEIGHT * (1 / (rank + RRF_CONFIG.CONSTANT));

    if (fused.has(key)) {
      // Content already exists - accumulate RRF score
      const existing = fused.get(key)!;
      existing.rrfScore += contribution;
      existing.sources.add("graph");
      // Keep earliest timestamp for time-decay
      existing.timestamp = Math.min(existing.timestamp, item.timestamp);
      // Preserve nodeId if this is a graph result
      if (!existing.nodeId) {
        existing.nodeId = item.nodeId;
      }
    } else {
      // New content from graph search
      fused.set(key, {
        type: "node",
        rrfScore: contribution,
        timestamp: item.timestamp,
        content: item.context,
        sources: new Set<"vector" | "graph">(["graph"]),
        nodeId: item.nodeId,
      });
    }
  });

  // Apply time-decay AFTER fusion and convert to result array
  const results: Array<RRFFusedResult> = Array.from(fused.values()).map((item) => {
    // Calculate time-decay factor using existing function
    const decayFactor = calculateTimeDecay(item.timestamp);

    return {
      type: item.type,
      content: item.content,
      rrfScore: item.rrfScore,
      finalScore: item.rrfScore * decayFactor,
      timestamp: item.timestamp,
      sources: Array.from(item.sources),
      nodeId: item.nodeId,
    };
  });

  // Sort by finalScore (descending) and return Top-K
  results.sort((a: RRFFusedResult, b: RRFFusedResult) => b.finalScore - a.finalScore);
  return results.slice(0, topK);
}
