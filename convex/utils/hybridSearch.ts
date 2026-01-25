// convex/utils/hybridSearch.ts
// 4-Way Hybrid Search Algorithm: Vector + Text search with RRF fusion

import { RRF_CONFIG, SEARCH_CONFIG } from './constants';

// ============================================================================
// TYPES
// ============================================================================

/** Source type indicating which search method(s) found the result */
export type SourceType = 'vector' | 'text' | 'hybrid';

/** Result type indicating whether the result is an item or node */
export type ResultType = 'item' | 'node';

/** Result from simpleRRF with scoring metadata */
export interface RRFResult<T> {
  /** Original document */
  doc: T;
  /** RRF score (sum of 1/(k+rank) contributions) */
  rrfScore: number;
  /** Source type: vector, text, or hybrid */
  sourceType: SourceType;
  /** Rank in vector search (if present) */
  vectorRank?: number;
  /** Rank in text search (if present) */
  textRank?: number;
}

/** Combined result with result type indicator */
export interface CombinedResult<T> extends RRFResult<T> {
  /** Whether this is an item or node */
  resultType: ResultType;
}

// ============================================================================
// DJB2 HASH (for content deduplication)
// ============================================================================

/**
 * DJB2 hash function for string content.
 * Used for deduplication across search results.
 *
 * @param str - String to hash
 * @returns Hex string hash
 */
export function djb2Hash(str: string): string {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char; // hash * 33 ^ char
  }

  // Convert to unsigned 32-bit and then to hex string
  return (hash >>> 0).toString(16);
}

// ============================================================================
// SIMPLE RRF (No Weights)
// ============================================================================

/**
 * Reciprocal Rank Fusion without weights.
 *
 * Merges two ranked lists using the RRF formula:
 * score = 1/(k + rank)
 *
 * Documents appearing in both lists get accumulated scores and are marked as 'hybrid'.
 *
 * @param listA - First ranked list (e.g., vector search results)
 * @param listB - Second ranked list (e.g., text search results)
 * @param getKey - Function to extract unique key from document
 * @param k - RRF constant (default: 60)
 * @returns Merged and scored results sorted by RRF score descending
 */
export function simpleRRF<T>(
  listA: T[],
  listB: T[],
  getKey: (item: T) => string,
  k: number = RRF_CONFIG.CONSTANT
): Array<T & RRFResult<T>> {
  const scores = new Map<
    string,
    {
      doc: T;
      rrfScore: number;
      sourceType: SourceType;
      vectorRank?: number;
      textRank?: number;
    }
  >();

  // Process list A (vector search results)
  listA.forEach((doc, index) => {
    const rank = index + 1; // 1-indexed
    const key = getKey(doc);
    const rrfContribution = 1 / (k + rank);

    scores.set(key, {
      doc,
      rrfScore: rrfContribution,
      sourceType: 'vector',
      vectorRank: rank,
    });
  });

  // Process list B (text search results)
  listB.forEach((doc, index) => {
    const rank = index + 1; // 1-indexed
    const key = getKey(doc);
    const rrfContribution = 1 / (k + rank);

    const existing = scores.get(key);
    if (existing) {
      // Document found in BOTH lists → hybrid
      existing.rrfScore += rrfContribution;
      existing.sourceType = 'hybrid';
      existing.textRank = rank;
    } else {
      scores.set(key, {
        doc,
        rrfScore: rrfContribution,
        sourceType: 'text',
        textRank: rank,
      });
    }
  });

  // Convert to array and sort by RRF score descending
  return Array.from(scores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .map(({ doc, rrfScore, sourceType, vectorRank, textRank }) => ({
      ...doc,
      doc,
      rrfScore,
      sourceType,
      vectorRank,
      textRank,
    }));
}

// ============================================================================
// TIME DECAY
// ============================================================================

/**
 * Document with timestamp for time decay calculation.
 */
interface DocWithTimestamp {
  doc: {
    createdAt: number;
    [key: string]: unknown;
  };
  rrfScore: number;
  [key: string]: unknown;
}

/**
 * Apply time-decay scoring to RRF results.
 *
 * Formula: finalScore = rrfScore × decayFactor
 * Where: decayFactor = 1 / (1 + ageDays / halfLifeDays)
 *
 * @param results - RRF scored results
 * @param halfLifeDays - Half-life in days (default: 30)
 * @returns Results with finalScore, sorted by finalScore descending
 */
export function applyTimeDecay<T extends DocWithTimestamp>(
  results: T[],
  halfLifeDays: number = SEARCH_CONFIG.TIME_DECAY_HALFLIFE_DAYS
): Array<T & { finalScore: number; decayFactor: number; ageDays: number }> {
  const now = Date.now();

  const decayed = results.map((result) => {
    const createdAt = result.doc.createdAt;
    const ageDays = (now - createdAt) / (1000 * 60 * 60 * 24);

    // Decay formula: 1 / (1 + age/halfLife)
    // At age=0: factor=1.0, at age=halfLife: factor=0.5
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

// ============================================================================
// COMBINE RESULTS
// ============================================================================

/**
 * Combine item and node results into a single list.
 *
 * Adds a `resultType` field to distinguish items from nodes.
 * Does NOT apply additional RRF - just concatenates.
 *
 * @param items - Merged item results
 * @param nodes - Merged node results
 * @returns Combined results with resultType field
 */
export function combineResults<TItem, TNode>(
  items: Array<TItem & RRFResult<TItem>>,
  nodes: Array<TNode & RRFResult<TNode>>
): Array<CombinedResult<TItem | TNode>> {
  const itemsWithType = items.map((item) => ({
    ...item,
    resultType: 'item' as ResultType,
  }));

  const nodesWithType = nodes.map((node) => ({
    ...node,
    resultType: 'node' as ResultType,
  }));

  return [...itemsWithType, ...nodesWithType] as Array<CombinedResult<TItem | TNode>>;
}

// ============================================================================
// FULL HYBRID SEARCH PIPELINE (for reference/documentation)
// ============================================================================

/**
 * 4-Way Hybrid Search Algorithm
 *
 * Flow:
 * 1. Run 4 parallel searches:
 *    - vectorSearchItems(embedding, limit)
 *    - textSearchItems(query, limit)
 *    - vectorSearchNodes(embedding, limit)
 *    - textSearchNodes(query, limit)
 *
 * 2. RRF merge items (vector + text) - no weights
 *    mergedItems = simpleRRF(vectorItems, textItems)
 *
 * 3. RRF merge nodes (vector + text) - no weights
 *    mergedNodes = simpleRRF(vectorNodes, textNodes)
 *
 * 4. Combine items + nodes (simple concat, no RRF)
 *    combined = combineResults(mergedItems, mergedNodes)
 *
 * 5. Apply time decay
 *    decayed = applyTimeDecay(combined, 30)
 *
 * 6. Sort by finalScore, return top-K
 *    return decayed.slice(0, topK)
 */
