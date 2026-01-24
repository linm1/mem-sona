// convex/utils/hybridSearch.test.ts
// TDD Tests for 4-Way Hybrid Search Algorithm

import { describe, it, expect } from 'vitest';
import type { Doc, Id } from '../_generated/dataModel';

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
// SIMPLE RRF TESTS (No Weights)
// ============================================================================

describe('simpleRRF', () => {
  it('should merge two ranked lists using RRF formula', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const listA = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Document A' }),
      createMockItem({ _id: 'item2' as Id<'items'>, content: 'Document B' }),
      createMockItem({ _id: 'item3' as Id<'items'>, content: 'Document C' }),
    ];

    const listB = [
      createMockItem({ _id: 'item2' as Id<'items'>, content: 'Document B' }), // Also in listA
      createMockItem({ _id: 'item4' as Id<'items'>, content: 'Document D' }),
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Document A' }), // Also in listA
    ];

    const result = simpleRRF(listA, listB, (item) => item._id);

    // Document B should rank highest: in both lists at good positions
    // listA rank 2 → 1/(60+2) = 0.0161
    // listB rank 1 → 1/(60+1) = 0.0164
    // Total: 0.0325
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].sourceType).toBe('hybrid');
  });

  it('should mark documents found in both lists as hybrid', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const listA = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Shared Doc' }),
    ];

    const listB = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Shared Doc' }),
    ];

    const result = simpleRRF(listA, listB, (item) => item._id);

    expect(result).toHaveLength(1);
    expect(result[0].sourceType).toBe('hybrid');
    expect(result[0].vectorRank).toBe(1);
    expect(result[0].textRank).toBe(1);
  });

  it('should mark documents only in listA as vector', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const listA = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Vector Only' }),
    ];

    const listB: Doc<'items'>[] = [];

    const result = simpleRRF(listA, listB, (item) => item._id);

    expect(result).toHaveLength(1);
    expect(result[0].sourceType).toBe('vector');
    expect(result[0].vectorRank).toBe(1);
    expect(result[0].textRank).toBeUndefined();
  });

  it('should mark documents only in listB as text', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const listA: Doc<'items'>[] = [];

    const listB = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Text Only' }),
    ];

    const result = simpleRRF(listA, listB, (item) => item._id);

    expect(result).toHaveLength(1);
    expect(result[0].sourceType).toBe('text');
    expect(result[0].textRank).toBe(1);
    expect(result[0].vectorRank).toBeUndefined();
  });

  it('should calculate correct RRF scores with k=60', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const listA = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Doc 1' }), // rank 1
      createMockItem({ _id: 'item2' as Id<'items'>, content: 'Doc 2' }), // rank 2
    ];

    const listB = [
      createMockItem({ _id: 'item2' as Id<'items'>, content: 'Doc 2' }), // rank 1
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Doc 1' }), // rank 2
    ];

    const result = simpleRRF(listA, listB, (item) => item._id);

    // Both documents appear in both lists
    // item1: 1/(60+1) + 1/(60+2) = 0.0164 + 0.0161 = 0.0325
    // item2: 1/(60+2) + 1/(60+1) = 0.0161 + 0.0164 = 0.0325
    // Scores should be equal
    expect(result).toHaveLength(2);
    expect(result[0].rrfScore).toBeCloseTo(result[1].rrfScore, 4);
    expect(result[0].rrfScore).toBeCloseTo(0.0325, 3);
  });

  it('should sort results by RRF score descending', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const listA = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Top in A' }),
      createMockItem({ _id: 'item2' as Id<'items'>, content: 'Second in A' }),
      createMockItem({ _id: 'item3' as Id<'items'>, content: 'Third in A' }),
    ];

    const listB = [
      createMockItem({ _id: 'item1' as Id<'items'>, content: 'Top in A' }), // Also rank 1 in B
      createMockItem({ _id: 'item4' as Id<'items'>, content: 'New in B' }),
    ];

    const result = simpleRRF(listA, listB, (item) => item._id);

    // item1 should be first (hybrid, rank 1 in both)
    expect(result[0]._id).toBe('item1');

    // Verify descending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].rrfScore).toBeGreaterThanOrEqual(result[i].rrfScore);
    }
  });

  it('should handle empty lists gracefully', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const emptyItemsA: Doc<'items'>[] = [];
    const emptyItemsB: Doc<'items'>[] = [];
    const result = simpleRRF(emptyItemsA, emptyItemsB, (item) => item._id);

    expect(result).toEqual([]);
  });

  it('should handle single-item lists', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const listA = [createMockItem({ _id: 'item1' as Id<'items'> })];
    const listB = [createMockItem({ _id: 'item2' as Id<'items'> })];

    const result = simpleRRF(listA, listB, (item) => item._id);

    expect(result).toHaveLength(2);
  });

  it('should preserve original document properties', async () => {
    const { simpleRRF } = await import('./hybridSearch');

    const originalItem = createMockItem({
      _id: 'item1' as Id<'items'>,
      content: 'Original content',
      category: 'special',
      accessCount: 42,
    });

    const result = simpleRRF([originalItem], [], (item) => item._id);

    expect(result[0].content).toBe('Original content');
    expect(result[0].category).toBe('special');
    expect(result[0].accessCount).toBe(42);
  });
});

// ============================================================================
// TIME DECAY TESTS
// ============================================================================

describe('applyTimeDecay', () => {
  it('should apply 30-day half-life decay', async () => {
    const { applyTimeDecay } = await import('./hybridSearch');

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const results = [
      { doc: createMockItem({ createdAt: now }), rrfScore: 0.1 },
      { doc: createMockItem({ createdAt: thirtyDaysAgo }), rrfScore: 0.1 },
    ];

    const decayed = applyTimeDecay(results, 30);

    // Fresh item: decay = 1/(1 + 0/30) = 1.0
    // 30-day old item: decay = 1/(1 + 30/30) = 0.5
    expect(decayed[0].decayFactor).toBeCloseTo(1.0, 1);
    expect(decayed[1].decayFactor).toBeCloseTo(0.5, 1);
  });

  it('should calculate finalScore = rrfScore × decayFactor', async () => {
    const { applyTimeDecay } = await import('./hybridSearch');

    const now = Date.now();
    const results = [
      { doc: createMockItem({ createdAt: now }), rrfScore: 0.2 },
    ];

    const decayed = applyTimeDecay(results, 30);

    expect(decayed[0].finalScore).toBeCloseTo(0.2 * decayed[0].decayFactor, 6);
  });

  it('should sort by finalScore descending', async () => {
    const { applyTimeDecay } = await import('./hybridSearch');

    const now = Date.now();
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    const results = [
      { doc: createMockItem({ createdAt: sixtyDaysAgo }), rrfScore: 0.2 }, // Older, higher RRF
      { doc: createMockItem({ createdAt: now }), rrfScore: 0.1 },           // Newer, lower RRF
    ];

    const decayed = applyTimeDecay(results, 30);

    // Newer item should rank higher due to time boost
    // Old: 0.2 * 1/(1+60/30) = 0.2 * 0.333 = 0.0667
    // New: 0.1 * 1.0 = 0.1
    expect(decayed[0].doc.createdAt).toBe(now);
  });

  it('should handle empty results', async () => {
    const { applyTimeDecay } = await import('./hybridSearch');

    const result = applyTimeDecay([], 30);

    expect(result).toEqual([]);
  });

  it('should preserve rrfScore after decay', async () => {
    const { applyTimeDecay } = await import('./hybridSearch');

    const results = [
      { doc: createMockItem({ createdAt: Date.now() }), rrfScore: 0.123 },
    ];

    const decayed = applyTimeDecay(results, 30);

    expect(decayed[0].rrfScore).toBe(0.123);
  });
});

// ============================================================================
// DJB2 HASH TESTS (for content deduplication)
// ============================================================================

describe('djb2Hash', () => {
  it('should return consistent hash for same input', async () => {
    const { djb2Hash } = await import('./hybridSearch');

    const hash1 = djb2Hash('test string');
    const hash2 = djb2Hash('test string');

    expect(hash1).toBe(hash2);
  });

  it('should return different hashes for different inputs', async () => {
    const { djb2Hash } = await import('./hybridSearch');

    const hash1 = djb2Hash('string one');
    const hash2 = djb2Hash('string two');

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty strings', async () => {
    const { djb2Hash } = await import('./hybridSearch');

    const hash = djb2Hash('');

    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should handle unicode strings', async () => {
    const { djb2Hash } = await import('./hybridSearch');

    const hash = djb2Hash('日本語テスト 🚀');

    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// COMBINE RESULTS TESTS
// ============================================================================

describe('combineResults', () => {
  it('should concatenate items and nodes', async () => {
    const { combineResults } = await import('./hybridSearch');

    const items = [
      { _id: 'item1', type: 'item', rrfScore: 0.1, sourceType: 'vector' as const },
      { _id: 'item2', type: 'item', rrfScore: 0.08, sourceType: 'text' as const },
    ];

    const nodes = [
      { _id: 'node1', type: 'node', rrfScore: 0.09, sourceType: 'hybrid' as const },
    ];

    const result = combineResults(items as any, nodes as any);

    expect(result).toHaveLength(3);
  });

  it('should add resultType field to distinguish items from nodes', async () => {
    const { combineResults } = await import('./hybridSearch');

    const items = [{ _id: 'item1', doc: { _id: 'item1' }, rrfScore: 0.1, sourceType: 'vector' as const }];
    const nodes = [{ _id: 'node1', doc: { _id: 'node1' }, rrfScore: 0.1, sourceType: 'vector' as const }];

    const result = combineResults(items as any, nodes as any);

    const itemResult = result.find(r => (r as any)._id === 'item1');
    const nodeResult = result.find(r => (r as any)._id === 'node1');
    expect(itemResult?.resultType).toBe('item');
    expect(nodeResult?.resultType).toBe('node');
  });

  it('should handle empty items array', async () => {
    const { combineResults } = await import('./hybridSearch');

    const nodes = [{ _id: 'node1', rrfScore: 0.1, sourceType: 'vector' as const }];

    const result = combineResults([] as any, nodes as any);

    expect(result).toHaveLength(1);
    expect(result[0].resultType).toBe('node');
  });

  it('should handle empty nodes array', async () => {
    const { combineResults } = await import('./hybridSearch');

    const items = [{ _id: 'item1', rrfScore: 0.1, sourceType: 'vector' as const }];

    const result = combineResults(items as any, [] as any);

    expect(result).toHaveLength(1);
    expect(result[0].resultType).toBe('item');
  });
});

// ============================================================================
// INTEGRATION: FULL 4-WAY HYBRID SEARCH FLOW
// ============================================================================

describe('4-way hybrid search integration', () => {
  it('should correctly rank hybrid results above single-source results', async () => {
    const { simpleRRF, combineResults, applyTimeDecay } = await import('./hybridSearch');

    const now = Date.now();

    // Items: vector + text search results
    const vectorItems = [
      createMockItem({ _id: 'i1' as Id<'items'>, content: 'Shared item', createdAt: now }),
      createMockItem({ _id: 'i2' as Id<'items'>, content: 'Vector only item', createdAt: now }),
    ];

    const textItems = [
      createMockItem({ _id: 'i1' as Id<'items'>, content: 'Shared item', createdAt: now }),
      createMockItem({ _id: 'i3' as Id<'items'>, content: 'Text only item', createdAt: now }),
    ];

    // Nodes: vector + text search results
    const vectorNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'Shared node', createdAt: now }),
    ];

    const textNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'Shared node', createdAt: now }),
      createMockNode({ _id: 'n2' as Id<'graphNodes'>, name: 'Text only node', createdAt: now }),
    ];

    // Step 1: RRF merge items
    const mergedItems = simpleRRF(vectorItems, textItems, (item) => item._id);

    // Step 2: RRF merge nodes
    const mergedNodes = simpleRRF(vectorNodes, textNodes, (node) => node._id);

    // Step 3: Combine
    const combined = combineResults(mergedItems, mergedNodes);

    // Step 4: Apply time decay (cast to expected type - test validates the flow)
    const final = applyTimeDecay(combined as any, 30);

    // Verify hybrid items rank higher
    const hybridResults = final.filter(r => r.sourceType === 'hybrid');
    const singleSourceResults = final.filter(r => r.sourceType !== 'hybrid');

    expect(hybridResults.length).toBeGreaterThan(0);

    // All hybrid results should have higher scores than single-source (same age)
    if (hybridResults.length > 0 && singleSourceResults.length > 0) {
      const minHybridScore = Math.min(...hybridResults.map(r => r.finalScore));
      const maxSingleScore = Math.max(...singleSourceResults.map(r => r.finalScore));
      expect(minHybridScore).toBeGreaterThan(maxSingleScore);
    }
  });

  it('should handle the complete flow with realistic data', async () => {
    const { simpleRRF, combineResults, applyTimeDecay } = await import('./hybridSearch');

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Simulate: Query "voyage-4 embedding"
    const vectorItems = [
      createMockItem({ _id: 'i1' as Id<'items'>, content: 'voyage-4 produces 1024-dim embeddings', createdAt: oneWeekAgo }),
      createMockItem({ _id: 'i2' as Id<'items'>, content: 'Semantic search with embeddings', createdAt: oneMonthAgo }),
      createMockItem({ _id: 'i3' as Id<'items'>, content: 'Vector databases store embeddings', createdAt: now }),
    ];

    const textItems = [
      createMockItem({ _id: 'i1' as Id<'items'>, content: 'voyage-4 produces 1024-dim embeddings', createdAt: oneWeekAgo }), // Exact match
      createMockItem({ _id: 'i4' as Id<'items'>, content: 'voyage-4 API documentation', createdAt: oneMonthAgo }),
    ];

    const vectorNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'voyage-4', type: 'tool', createdAt: oneWeekAgo }),
    ];

    const textNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'voyage-4', type: 'tool', createdAt: oneWeekAgo }),
    ];

    const mergedItems = simpleRRF(vectorItems, textItems, (item) => item._id);
    const mergedNodes = simpleRRF(vectorNodes, textNodes, (node) => node._id);
    const combined = combineResults(mergedItems, mergedNodes);
    const final = (applyTimeDecay(combined as any, 30) as any[]).slice(0, 5); // Top 5

    // Verify structure
    expect(final.length).toBeLessThanOrEqual(5);
    expect(final.every((r: any) => 'finalScore' in r)).toBe(true);
    expect(final.every((r: any) => 'rrfScore' in r)).toBe(true);
    expect(final.every((r: any) => 'sourceType' in r)).toBe(true);
    expect(final.every((r: any) => 'resultType' in r)).toBe(true);

    // Verify hybrid "voyage-4" content ranks highly
    const voyageResults = final.filter((r: any) =>
      (r.doc && 'content' in r.doc && r.doc.content.includes('voyage-4')) ||
      (r.doc && 'name' in r.doc && r.doc.name === 'voyage-4')
    );
    expect(voyageResults.length).toBeGreaterThan(0);
  });
});
