/**
 * Shared type definitions for Memory Explorer Search
 * These types match the Convex API response structure
 */

export type MergedResult = {
  type: "item" | "node";
  content: string;
  score: number;
  finalScore: number;
  timestamp: number;
  source: "vector" | "graph" | "hybrid";
};

export type HybridSearchResult = {
  query: string;
  results: Array<MergedResult>;
  context: string;
  executionTime: number;
};
