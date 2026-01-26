// convex/retrieval/fourWay.ts
// 4-Way Hybrid Search Algorithm: Vector + Text search with RRF fusion

import { Doc } from "../_generated/dataModel";
import { RRF_CONFIG, SEARCH_CONFIG } from "../utils/constants";
import { djb2Hash } from "../utils/hybridSearch";
import type {
  SourceType4Way,
  MergedItemResult,
  MergedNodeResult,
  CombinedResult4Way,
  FinalResult4Way,
} from "./types";

/**
 * Calculate RRF score for a single rank position.
 * Formula: 1 / (k + rank) where k = 60 (standard RRF constant)
 *
 * This is the simplest form of RRF - no weights applied.
 *
 * @param rank - 1-indexed position in search results
 * @returns RRF contribution for this rank
 */
export function calculateRRFScore(rank: number): number {
  return 1 / (RRF_CONFIG.CONSTANT + rank);
}

/**
 * Merge vector and text search results for items using simple RRF.
 * No weights are applied - just sum of RRF contributions.
 *
 * Deduplication is done by content hash (djb2).
 * Results appearing in BOTH lists get accumulated RRF scores and are marked as "hybrid".
 *
 * @param vectorItems - Results from vector search on items
 * @param textItems - Results from text search on items
 * @returns Merged items sorted by RRF score descending
 */
export function mergeItemsRRF(
  vectorItems: Doc<"items">[],
  textItems: Doc<"items">[]
): MergedItemResult[] {
  const merged = new Map<
    string,
    {
      doc: Doc<"items">;
      rrfScore: number;
      sourceType: SourceType4Way;
      vectorRank?: number;
      textRank?: number;
    }
  >();

  // Process vector results
  vectorItems.forEach((item, index) => {
    const rank = index + 1;
    const key = djb2Hash(item.content);
    const rrfContribution = calculateRRFScore(rank);

    merged.set(key, {
      doc: item,
      rrfScore: rrfContribution,
      sourceType: "vector",
      vectorRank: rank,
    });
  });

  // Process text results
  textItems.forEach((item, index) => {
    const rank = index + 1;
    const key = djb2Hash(item.content);
    const rrfContribution = calculateRRFScore(rank);

    const existing = merged.get(key);
    if (existing) {
      // Found in BOTH lists → hybrid
      existing.rrfScore += rrfContribution;
      existing.sourceType = "hybrid";
      existing.textRank = rank;
    } else {
      merged.set(key, {
        doc: item,
        rrfScore: rrfContribution,
        sourceType: "text",
        textRank: rank,
      });
    }
  });

  // Convert to array and sort by RRF score descending
  return Array.from(merged.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map(({ doc, rrfScore, sourceType, vectorRank, textRank }) => ({
      _id: doc._id,
      content: doc.content,
      category: doc.category,
      createdAt: doc.createdAt,
      rrfScore,
      sourceType,
      resultType: "item" as const,
      vectorRank,
      textRank,
    }));
}

/**
 * Merge vector and text search results for nodes using simple RRF.
 * No weights are applied - just sum of RRF contributions.
 *
 * Deduplication is done by node name hash (djb2).
 * Results appearing in BOTH lists get accumulated RRF scores and are marked as "hybrid".
 *
 * @param vectorNodes - Results from vector search on graphNodes
 * @param textNodes - Results from text search on graphNodes
 * @returns Merged nodes sorted by RRF score descending
 */
export function mergeNodesRRF(
  vectorNodes: Doc<"graphNodes">[],
  textNodes: Doc<"graphNodes">[]
): MergedNodeResult[] {
  const merged = new Map<
    string,
    {
      doc: Doc<"graphNodes">;
      rrfScore: number;
      sourceType: SourceType4Way;
      vectorRank?: number;
      textRank?: number;
    }
  >();

  // Process vector results
  vectorNodes.forEach((node, index) => {
    const rank = index + 1;
    const key = djb2Hash(node.name);
    const rrfContribution = calculateRRFScore(rank);

    merged.set(key, {
      doc: node,
      rrfScore: rrfContribution,
      sourceType: "vector",
      vectorRank: rank,
    });
  });

  // Process text results
  textNodes.forEach((node, index) => {
    const rank = index + 1;
    const key = djb2Hash(node.name);
    const rrfContribution = calculateRRFScore(rank);

    const existing = merged.get(key);
    if (existing) {
      // Found in BOTH lists → hybrid
      existing.rrfScore += rrfContribution;
      existing.sourceType = "hybrid";
      existing.textRank = rank;
    } else {
      merged.set(key, {
        doc: node,
        rrfScore: rrfContribution,
        sourceType: "text",
        textRank: rank,
      });
    }
  });

  // Build context string for each node
  const buildContext = (node: Doc<"graphNodes">): string => {
    const description = node.properties?.description || "";
    let context = `${node.type}: ${node.name}`;
    if (description) {
      context += ` - ${description}`;
    }
    return context;
  };

  // Convert to array and sort by RRF score descending
  return Array.from(merged.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map(({ doc, rrfScore, sourceType, vectorRank, textRank }) => ({
      _id: doc._id,
      name: doc.name,
      type: doc.type,
      context: buildContext(doc),
      createdAt: doc.createdAt,
      rrfScore,
      sourceType,
      resultType: "node" as const,
      nodeId: doc._id,
      vectorRank,
      textRank,
      // Preserve description from properties for editing
      description: doc.properties?.description,
    }));
}

/**
 * Combine merged items and nodes into a single list.
 * Simple concatenation - no additional RRF applied.
 *
 * Adds a unified content field for consistent output format.
 *
 * @param mergedItems - Merged item results from mergeItemsRRF
 * @param mergedNodes - Merged node results from mergeNodesRRF
 * @returns Combined list with both items and nodes
 */
export function combineItemsAndNodes(
  mergedItems: MergedItemResult[],
  mergedNodes: MergedNodeResult[]
): CombinedResult4Way[] {
  const itemsWithContent: CombinedResult4Way[] = mergedItems.map((item) => ({
    _id: item._id,
    content: item.content,
    createdAt: item.createdAt,
    rrfScore: item.rrfScore,
    sourceType: item.sourceType,
    resultType: item.resultType,
    vectorRank: item.vectorRank,
    textRank: item.textRank,
    // Preserve item metadata for editing
    category: item.category,
  }));

  const nodesWithContent: CombinedResult4Way[] = mergedNodes.map((node) => ({
    _id: node._id,
    content: node.context,
    createdAt: node.createdAt,
    rrfScore: node.rrfScore,
    sourceType: node.sourceType,
    resultType: node.resultType,
    nodeId: node.nodeId,
    vectorRank: node.vectorRank,
    textRank: node.textRank,
    // Preserve node metadata for editing
    name: node.name,
    type: node.type,
    description: node.description,
  }));

  return [...itemsWithContent, ...nodesWithContent];
}

/**
 * Apply time-decay scoring to combined results.
 *
 * Formula: finalScore = rrfScore × decayFactor
 * Where: decayFactor = 1 / (1 + ageDays / halfLifeDays)
 *
 * This boosts recent content and demotes old content.
 * 30-day half-life means content 30 days old has half the boost.
 *
 * @param results - Combined results from combineItemsAndNodes
 * @returns Results with finalScore, sorted by finalScore descending
 */
export function applyTimeDecayToResults(
  results: CombinedResult4Way[]
): FinalResult4Way[] {
  const now = Date.now();
  const halfLifeDays = SEARCH_CONFIG.TIME_DECAY_HALFLIFE_DAYS;

  const decayed = results.map((result) => {
    const ageDays = (now - result.createdAt) / (1000 * 60 * 60 * 24);
    const decayFactor = 1 / (1 + ageDays / halfLifeDays);
    const finalScore = result.rrfScore * decayFactor;

    return {
      ...result,
      finalScore,
      decayFactor,
      ageDays,
    };
  });

  // Sort by finalScore descending
  return decayed.sort((a, b) => b.finalScore - a.finalScore);
}

/**
 * Select top-K results sorted by finalScore.
 *
 * Sorts by finalScore descending and returns top-K.
 * This is idempotent - calling on already sorted results is safe.
 *
 * @param results - Results with finalScore (may or may not be sorted)
 * @param k - Number of results to return
 * @returns Top-K results sorted by finalScore descending
 */
export function selectTopK(results: FinalResult4Way[], k: number): FinalResult4Way[] {
  // Sort by finalScore descending (creates new array, doesn't mutate input)
  const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);
  return sorted.slice(0, k);
}

/**
 * 4-Way Hybrid Search Handler.
 *
 * This is the main entry point for the new hybrid search algorithm.
 * It orchestrates the 4-way search pipeline:
 *
 * 1. Merge items (vector + text) with simple RRF (no weights)
 * 2. Merge nodes (vector + text) with simple RRF (no weights)
 * 3. Combine items + nodes (simple concat, no RRF)
 * 4. Apply time decay
 * 5. Return top-K sorted by finalScore
 */
export const hybridSearch4WayHandler = {
  /**
   * Execute the full 4-way hybrid search pipeline.
   *
   * @param vectorItems - Results from vector search on items
   * @param textItems - Results from text search on items
   * @param vectorNodes - Results from vector search on graphNodes
   * @param textNodes - Results from text search on graphNodes
   * @param topK - Number of results to return (default: 20)
   * @returns Top-K results after RRF fusion and time decay
   */
  execute(
    vectorItems: Doc<"items">[],
    textItems: Doc<"items">[],
    vectorNodes: Doc<"graphNodes">[],
    textNodes: Doc<"graphNodes">[],
    topK: number = RRF_CONFIG.DEFAULT_TOP_K
  ): FinalResult4Way[] {
    // Step 1: Merge items (vector + text) with simple RRF
    const mergedItems = mergeItemsRRF(vectorItems, textItems);

    // Step 2: Merge nodes (vector + text) with simple RRF
    const mergedNodes = mergeNodesRRF(vectorNodes, textNodes);

    // Step 3: Combine items + nodes (simple concat)
    const combined = combineItemsAndNodes(mergedItems, mergedNodes);

    // Step 4: Apply time decay
    const decayed = applyTimeDecayToResults(combined);

    // Step 5: Return top-K
    return selectTopK(decayed, topK);
  },
};
