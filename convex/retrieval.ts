// convex/retrieval.ts
// Hybrid Search - Combines vector and graph search for comprehensive memory retrieval
//
// This file now acts as a backwards-compatibility shim.
// All functionality has been refactored into focused modules:
// - retrieval/types.ts - Type definitions and validators
// - retrieval/rrf.ts - RRF algorithm functions
// - retrieval/fourWay.ts - 4-way hybrid search logic
// - retrieval/index.ts - Pipeline functions and main actions

// Re-export everything from the new modular structure
export type {
  VectorResult,
  GraphResult,
  EdgeData,
  MergedResult,
  HybridSearchResult,
  RRFVectorInput,
  RRFGraphInput,
  RRFFusedResult,
  SourceType4Way,
  ResultType4Way,
  MergedItemResult,
  MergedNodeResult,
  CombinedResult4Way,
  FinalResult4Way,
} from "./retrieval/types";

export {
  vectorResultValidator,
  graphResultValidator,
  edgeDataValidator,
  mergedResultValidator,
  rrfVectorInputValidator,
  rrfGraphInputValidator,
  rrfFusedResultValidator,
} from "./retrieval/types";

export {
  calculateTimeDecay,
  hashContent,
  weightedTimeDecayRRF,
} from "./retrieval/rrf";

export {
  calculateRRFScore,
  mergeItemsRRF,
  mergeNodesRRF,
  combineItemsAndNodes,
  applyTimeDecayToResults,
  selectTopK,
  hybridSearch4WayHandler,
} from "./retrieval/fourWay";

export {
  vectorSearchPipeline,
  graphSearchPipeline,
  vectorSearchItemsDocs,
  vectorSearchNodesDocs,
  fetchEdgesForNodes,
  mergeAndRankResults,
  assembleContextWindow,
  hybridSearch,
} from "./retrieval/index";
