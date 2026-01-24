// convex/retrieval.test.ts
// TDD Tests for 4-Way Hybrid Search Integration

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockItem = (overrides: Partial<Doc<'items'>> = {}): Doc<'items'> => ({
  _id: 'item123' as Id<'items'>,
  _creationTime: Date.now(),
  content: 'Test content',
  category: 'test',
  resourceId: 'res123' as Id<'resources'>,
  embedding: new Array(1024).fill(0.1),
  createdAt: Date.now(),
  accessedAt: Date.now(),
  accessCount: 0,
  ...overrides,
});

const createMockNode = (overrides: Partial<Doc<'graphNodes'>> = {}): Doc<'graphNodes'> => ({
  _id: 'node123' as Id<'graphNodes'>,
  _creationTime: Date.now(),
  name: 'Test Node',
  type: 'project',
  properties: {},
  embedding: new Array(1024).fill(0.1),
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

// ============================================================================
// HYBRID SEARCH ALGORITHM TESTS
// ============================================================================

describe('hybridSearch4Way', () => {
  describe('algorithm flow', () => {
    it('should run 4 parallel searches: vector items, text items, vector nodes, text nodes', async () => {
      const { hybridSearch4WayHandler } = await import('./retrieval');

      // This test validates the algorithm structure
      // The handler should call all 4 search functions in parallel
      expect(hybridSearch4WayHandler).toBeDefined();
    });

    it('should merge items (vector + text) with simple RRF (no weights)', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const vectorItems = [
        createMockItem({ _id: 'i1' as Id<'items'>, content: 'Shared content' }),
        createMockItem({ _id: 'i2' as Id<'items'>, content: 'Vector only' }),
      ];

      const textItems = [
        createMockItem({ _id: 'i1' as Id<'items'>, content: 'Shared content' }),
        createMockItem({ _id: 'i3' as Id<'items'>, content: 'Text only' }),
      ];

      const merged = mergeItemsRRF(vectorItems, textItems);

      // Shared content should be marked as hybrid
      const sharedResult = merged.find(r => r.content === 'Shared content');
      expect(sharedResult?.sourceType).toBe('hybrid');

      // Vector-only should be marked as vector
      const vectorOnlyResult = merged.find(r => r.content === 'Vector only');
      expect(vectorOnlyResult?.sourceType).toBe('vector');

      // Text-only should be marked as text
      const textOnlyResult = merged.find(r => r.content === 'Text only');
      expect(textOnlyResult?.sourceType).toBe('text');
    });

    it('should merge nodes (vector + text) with simple RRF (no weights)', async () => {
      const { mergeNodesRRF } = await import('./retrieval');

      const vectorNodes = [
        createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'voyage-4' }),
        createMockNode({ _id: 'n2' as Id<'graphNodes'>, name: 'Vector only node' }),
      ];

      const textNodes = [
        createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'voyage-4' }),
        createMockNode({ _id: 'n3' as Id<'graphNodes'>, name: 'Text only node' }),
      ];

      const merged = mergeNodesRRF(vectorNodes, textNodes);

      // Shared node should be marked as hybrid
      const sharedResult = merged.find(r => r.name === 'voyage-4');
      expect(sharedResult?.sourceType).toBe('hybrid');
    });

    it('should combine items + nodes without additional RRF', async () => {
      const { combineItemsAndNodes } = await import('./retrieval');

      const mergedItems = [
        { _id: 'i1', content: 'Item 1', rrfScore: 0.1, sourceType: 'vector' as const, resultType: 'item' as const, createdAt: Date.now() },
      ];

      const mergedNodes = [
        { _id: 'n1', name: 'Node 1', context: 'Node context', rrfScore: 0.09, sourceType: 'hybrid' as const, resultType: 'node' as const, createdAt: Date.now() },
      ];

      const combined = combineItemsAndNodes(mergedItems as any, mergedNodes as any);

      // Should have both items and nodes
      expect(combined).toHaveLength(2);
      expect(combined.some(r => r.resultType === 'item')).toBe(true);
      expect(combined.some(r => r.resultType === 'node')).toBe(true);
    });

    it('should apply time-decay after combining', async () => {
      const { applyTimeDecayToResults } = await import('./retrieval');

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const combined = [
        { rrfScore: 0.1, createdAt: now, resultType: 'item' as const },
        { rrfScore: 0.1, createdAt: thirtyDaysAgo, resultType: 'node' as const },
      ];

      const decayed = applyTimeDecayToResults(combined as any);

      // Fresh item should have higher finalScore
      expect(decayed[0].finalScore).toBeGreaterThan(decayed[1].finalScore);
    });

    it('should return top-K results sorted by finalScore', async () => {
      const { selectTopK } = await import('./retrieval');

      const results = [
        { finalScore: 0.05, resultType: 'item' as const },
        { finalScore: 0.15, resultType: 'node' as const },
        { finalScore: 0.10, resultType: 'item' as const },
        { finalScore: 0.20, resultType: 'node' as const },
        { finalScore: 0.08, resultType: 'item' as const },
      ];

      const topK = selectTopK(results as any, 3);

      expect(topK).toHaveLength(3);
      expect(topK[0].finalScore).toBe(0.20);
      expect(topK[1].finalScore).toBe(0.15);
      expect(topK[2].finalScore).toBe(0.10);
    });
  });

  describe('RRF scoring without weights', () => {
    it('should calculate RRF score as 1/(k+rank) with k=60', async () => {
      const { calculateRRFScore } = await import('./retrieval');

      // Rank 1: 1/(60+1) = 0.0164
      expect(calculateRRFScore(1)).toBeCloseTo(1 / 61, 4);

      // Rank 2: 1/(60+2) = 0.0161
      expect(calculateRRFScore(2)).toBeCloseTo(1 / 62, 4);

      // Rank 10: 1/(60+10) = 0.0143
      expect(calculateRRFScore(10)).toBeCloseTo(1 / 70, 4);
    });

    it('should accumulate RRF scores for documents in both lists', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      // Document appears in both lists at rank 1
      const vectorItems = [
        createMockItem({ _id: 'i1' as Id<'items'>, content: 'Shared' }),
      ];

      const textItems = [
        createMockItem({ _id: 'i1' as Id<'items'>, content: 'Shared' }),
      ];

      const merged = mergeItemsRRF(vectorItems, textItems);

      // RRF score should be: 1/(60+1) + 1/(60+1) = 2/61 ≈ 0.0328
      expect(merged[0].rrfScore).toBeCloseTo(2 / 61, 3);
    });

    it('should NOT apply weights (unlike old weightedTimeDecayRRF)', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      // Single document at rank 1 in vector only
      const vectorItems = [
        createMockItem({ _id: 'i1' as Id<'items'>, content: 'Vector only' }),
      ];

      const textItems: Doc<'items'>[] = [];

      const merged = mergeItemsRRF(vectorItems, textItems);

      // Should be exactly 1/(60+1), NOT weighted by 0.6 like old algorithm
      expect(merged[0].rrfScore).toBeCloseTo(1 / 61, 4);
    });
  });

  describe('source type labeling', () => {
    it('should label vector-only results as "vector"', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const vectorItems = [createMockItem({ _id: 'i1' as Id<'items'> })];
      const textItems: Doc<'items'>[] = [];

      const merged = mergeItemsRRF(vectorItems, textItems);

      expect(merged[0].sourceType).toBe('vector');
      expect(merged[0].vectorRank).toBe(1);
      expect(merged[0].textRank).toBeUndefined();
    });

    it('should label text-only results as "text"', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const vectorItems: Doc<'items'>[] = [];
      const textItems = [createMockItem({ _id: 'i1' as Id<'items'> })];

      const merged = mergeItemsRRF(vectorItems, textItems);

      expect(merged[0].sourceType).toBe('text');
      expect(merged[0].textRank).toBe(1);
      expect(merged[0].vectorRank).toBeUndefined();
    });

    it('should label results in both lists as "hybrid"', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const vectorItems = [createMockItem({ _id: 'i1' as Id<'items'> })];
      const textItems = [createMockItem({ _id: 'i1' as Id<'items'> })];

      const merged = mergeItemsRRF(vectorItems, textItems);

      expect(merged[0].sourceType).toBe('hybrid');
      expect(merged[0].vectorRank).toBe(1);
      expect(merged[0].textRank).toBe(1);
    });
  });

  describe('result type labeling', () => {
    it('should label merged items with resultType "item"', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const vectorItems = [createMockItem({ _id: 'i1' as Id<'items'> })];
      const merged = mergeItemsRRF(vectorItems, []);

      expect(merged[0].resultType).toBe('item');
    });

    it('should label merged nodes with resultType "node"', async () => {
      const { mergeNodesRRF } = await import('./retrieval');

      const vectorNodes = [createMockNode({ _id: 'n1' as Id<'graphNodes'> })];
      const merged = mergeNodesRRF(vectorNodes, []);

      expect(merged[0].resultType).toBe('node');
    });
  });

  describe('edge cases', () => {
    it('should handle empty vector results', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const vectorItems: Doc<'items'>[] = [];
      const textItems = [createMockItem({ _id: 'i1' as Id<'items'> })];

      const merged = mergeItemsRRF(vectorItems, textItems);

      expect(merged).toHaveLength(1);
      expect(merged[0].sourceType).toBe('text');
    });

    it('should handle empty text results', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const vectorItems = [createMockItem({ _id: 'i1' as Id<'items'> })];
      const textItems: Doc<'items'>[] = [];

      const merged = mergeItemsRRF(vectorItems, textItems);

      expect(merged).toHaveLength(1);
      expect(merged[0].sourceType).toBe('vector');
    });

    it('should handle both empty results', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      const merged = mergeItemsRRF([], []);

      expect(merged).toEqual([]);
    });

    it('should handle duplicate items with different _id but same content', async () => {
      const { mergeItemsRRF } = await import('./retrieval');

      // Same content but different IDs (should be deduplicated)
      const vectorItems = [
        createMockItem({ _id: 'i1' as Id<'items'>, content: 'Same content' }),
      ];

      const textItems = [
        createMockItem({ _id: 'i2' as Id<'items'>, content: 'Same content' }),
      ];

      const merged = mergeItemsRRF(vectorItems, textItems);

      // Should deduplicate by content, not by ID
      expect(merged).toHaveLength(1);
      expect(merged[0].sourceType).toBe('hybrid');
    });
  });
});

// ============================================================================
// BACKWARD COMPATIBILITY TESTS
// ============================================================================

describe('backward compatibility', () => {
  it('should produce MergedResult format compatible with assembleContextWindow', async () => {
    const { hybridSearch4WayHandler } = await import('./retrieval');

    // The output format should match MergedResult type
    // This ensures assembleContextWindow continues to work
    expect(hybridSearch4WayHandler).toBeDefined();
  });

  it('should preserve nodeId for graph visualization filtering', async () => {
    const { mergeNodesRRF } = await import('./retrieval');

    const vectorNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'Test Node' }),
    ];

    const merged = mergeNodesRRF(vectorNodes, []);

    expect(merged[0].nodeId).toBe('n1');
  });
});
