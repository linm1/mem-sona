// convex/utils/constants.ts
// Centralized configuration constants for mem-sona

/**
 * Time thresholds used throughout the system (in milliseconds).
 *
 * These constants define the lifecycle stages for memory items, nodes, and edges:
 * - SEVEN_DAYS_MS: Hot memory detection window (frequently accessed items)
 * - THIRTY_DAYS_MS: Item summarization threshold, edge decay period
 * - NINETY_DAYS_MS: Orphan node archival threshold, item deletion after summarization
 * - ONE_EIGHTY_DAYS_MS: Item reindexing threshold (stale embeddings)
 */
export const TIME_CONSTANTS = {
  /** 7 days in milliseconds - Used for hot memory detection */
  SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,

  /** 30 days in milliseconds - Used for item summarization and edge decay period */
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,

  /** 90 days in milliseconds - Used for orphan node archival and item deletion */
  NINETY_DAYS_MS: 90 * 24 * 60 * 60 * 1000,

  /** 180 days in milliseconds - Used for item reindexing (stale embeddings) */
  ONE_EIGHTY_DAYS_MS: 180 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Edge weight decay configuration for graph maintenance.
 *
 * Edges decay over time to reflect weakening relationships:
 * - DECAY_RATE: Multiplier applied per 30-day period (0.9 = 10% decay)
 * - MIN_THRESHOLD: Edges below this weight are archived (weak relationships)
 *
 * Decay formula: weight * DECAY_RATE^(days/30)
 * Example: weight=1.0, 30 days old → 0.9, 60 days old → 0.81, 90 days old → 0.729
 */
export const EDGE_WEIGHT_CONFIG = {
  /** Decay rate per 30-day period (0.9 = 10% decay) */
  DECAY_RATE: 0.9,

  /** Minimum edge weight threshold - edges below this are archived */
  MIN_THRESHOLD: 0.1,
} as const;

/**
 * Search and retrieval configuration.
 *
 * These constants control how search results are filtered and ranked:
 * - RELEVANCE_THRESHOLD: Minimum score for search results (0-1 scale)
 * - SIMILARITY_THRESHOLD: Minimum cosine similarity for duplicate detection (0-1 scale)
 * - TIME_DECAY_HALFLIFE_DAYS: Half-life for time-decay scoring (recent memories rank higher)
 */
export const SEARCH_CONFIG = {
  /** Minimum score for search results to be returned (0-1)
   * NOTE: Convex vector search scores typically range 0.2-0.7, not 0-1.
   * A threshold of 0.3 filters out weak matches while keeping relevant results.
   */
  RELEVANCE_THRESHOLD: 0.3,

  /** Minimum cosine similarity for duplicate detection (0-1) */
  SIMILARITY_THRESHOLD: 0.95,

  /** Time-decay half-life in days - used in retrieval scoring */
  TIME_DECAY_HALFLIFE_DAYS: 30,

  /** Minimum access count for hot memory detection */
  HOT_MEMORY_ACCESS_THRESHOLD: 2,
} as const;

/**
 * API rate limiting and performance constants.
 *
 * These constants help prevent API rate limits and manage system performance:
 * - REINDEX_DELAY_MS: Delay between embedding regeneration calls
 */
export const PERFORMANCE_CONFIG = {
  /** Delay between reindexing operations (ms) - prevents rate limit hits */
  REINDEX_DELAY_MS: 10,
} as const;

/**
 * Helper function to convert days to milliseconds.
 * Useful for calculating dynamic time thresholds.
 *
 * @param days - Number of days to convert
 * @returns Milliseconds equivalent
 */
export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Helper function to convert milliseconds to days.
 * Useful for logging and display.
 *
 * @param ms - Milliseconds to convert
 * @returns Days equivalent
 */
export function msToDays(ms: number): number {
  return ms / (24 * 60 * 60 * 1000);
}

/**
 * Reciprocal Rank Fusion (RRF) configuration for hybrid search.
 *
 * RRF combines ranked lists from multiple retrievers (vector + graph) without
 * requiring score normalization. It focuses on ranking consistency rather than
 * absolute scores, making it robust to different score distributions.
 *
 * Formula: RRF_score = Σ(weight_i × 1/(rank_i + k))
 * Where:
 * - weight_i = importance of retriever i
 * - rank_i = position in ranked list (1-indexed)
 * - k = constant (60 is experimentally optimal)
 *
 * Time-decay is applied AFTER fusion for clean separation of concerns:
 * - final_score = RRF_score × decay_factor
 * - decay_factor = 1 / (1 + age_days / half_life_days)
 */
export const RRF_CONFIG = {
  /** RRF constant (k) - experimentally optimal value across domains */
  CONSTANT: 60,

  /** Weight for vector search results (semantic similarity - primary signal) */
  VECTOR_WEIGHT: 0.6,

  /** Weight for graph search results (relationship context - secondary signal) */
  GRAPH_WEIGHT: 0.4,

  /** Default Top-K results to return (replaces hard threshold filtering) */
  DEFAULT_TOP_K: 20,
} as const;
