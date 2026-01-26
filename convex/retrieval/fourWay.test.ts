// convex/retrieval/fourWay.test.ts
// TDD Tests for 4-way hybrid search algorithm

import { describe, it, expect } from 'vitest';
import type { Doc, Id } from '../_generated/dataModel';

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

describe('retrieval/fourWay', () => {
  describe('calculateRRFScore', () => {
    it('should calculate RRF score as 1/(k+rank) with k=60', async () => {
      const { calculateRRFScore } = await import('./fourWay');

      expect(calculateRRFScore(1)).toBeCloseTo(1 / 61, 4);
      expect(calculateRRFScore(2)).toBeCloseTo(1 / 62, 4);
      expect(calculateRRFScore(10)).toBeCloseTo(1 / 70, 4);
    });

    it('should return lower scores for higher ranks', async () => {
      const { calculateRRFScore } = await import('./fourWay');

      const rank1Score = calculateRRFScore(1);
      const rank10Score = calculateRRFScore(10);
      const rank100Score = calculateRRFScore(100);

      expect(rank1Score).toBeGreaterThan(rank10Score);
      expect(rank10Score).toBeGreaterThan(rank100Score);
    });
  });

  describe('mergeItemsRRF', () => {
    it('should merge vector and text items', async () => {
      const { mergeItemsRRF } = await import('./fourWay');

      const vectorItems = [createMockItem({ _id: 'i1' as Id<'items'>, content: 'Vector' })];
      const textItems = [createMockItem({ _id: 'i2' as Id<'items'>, content: 'Text' })];

      const merged = mergeItemsRRF(vectorItems, textItems);

      expect(merged.length).toBe(2);
      expect(merged.some(r => r.sourceType === 'vector')).toBe(true);
      expect(merged.some(r => r.sourceType === 'text')).toBe(true);
    });

    it('should mark duplicates as hybrid', async () => {
      const { mergeItemsRRF } = await import('./fourWay');

      const sharedContent = 'Shared content';
      const vectorItems = [createMockItem({ _id: 'i1' as Id<'items'>, content: sharedContent })];
      const textItems = [createMockItem({ _id: 'i1' as Id<'items'>, content: sharedContent })];

      const merged = mergeItemsRRF(vectorItems, textItems);

      expect(merged.length).toBe(1);
      expect(merged[0].sourceType).toBe('hybrid');
      expect(merged[0].vectorRank).toBe(1);
      expect(merged[0].textRank).toBe(1);
    });

    it('should accumulate RRF scores for duplicates', async () => {
      const { mergeItemsRRF } = await import('./fourWay');

      const sharedContent = 'Shared';
      const vectorItems = [createMockItem({ content: sharedContent })];
      const textItems = [createMockItem({ content: sharedContent })];

      const merged = mergeItemsRRF(vectorItems, textItems);

      // RRF score should be approximately 2 * (1/61)
      expect(merged[0].rrfScore).toBeCloseTo(2 / 61, 3);
    });

    it('should sort by RRF score descending', async () => {
      const { mergeItemsRRF } = await import('./fourWay');

      const vectorItems = [
        createMockItem({ _id: 'i1' as Id<'items'>, content: 'First' }),
        createMockItem({ _id: 'i2' as Id<'items'>, content: 'Second' }),
      ];

      const merged = mergeItemsRRF(vectorItems, []);

      // First rank should have higher score
      expect(merged[0].rrfScore).toBeGreaterThan(merged[1].rrfScore);
    });

    it('should handle empty inputs', async () => {
      const { mergeItemsRRF } = await import('./fourWay');

      expect(mergeItemsRRF([], [])).toEqual([]);
      expect(mergeItemsRRF([createMockItem()], [])).toHaveLength(1);
      expect(mergeItemsRRF([], [createMockItem()])).toHaveLength(1);
    });

    it('should preserve item metadata', async () => {
      const { mergeItemsRRF } = await import('./fourWay');

      const vectorItems = [createMockItem({ _id: 'i1' as Id<'items'>, category: 'tech_preferences' })];
      const merged = mergeItemsRRF(vectorItems, []);

      expect(merged[0].category).toBe('tech_preferences');
      expect(merged[0].resultType).toBe('item');
    });
  });

  describe('mergeNodesRRF', () => {
    it('should merge vector and text nodes', async () => {
      const { mergeNodesRRF } = await import('./fourWay');

      const vectorNodes = [createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'VectorNode' })];
      const textNodes = [createMockNode({ _id: 'n2' as Id<'graphNodes'>, name: 'TextNode' })];

      const merged = mergeNodesRRF(vectorNodes, textNodes);

      expect(merged.length).toBe(2);
      expect(merged.some(r => r.sourceType === 'vector')).toBe(true);
      expect(merged.some(r => r.sourceType === 'text')).toBe(true);
    });

    it('should deduplicate by node name', async () => {
      const { mergeNodesRRF } = await import('./fourWay');

      const sharedName = 'voyage-4';
      const vectorNodes = [createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: sharedName })];
      const textNodes = [createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: sharedName })];

      const merged = mergeNodesRRF(vectorNodes, textNodes);

      expect(merged.length).toBe(1);
      expect(merged[0].sourceType).toBe('hybrid');
    });

    it('should build context string for nodes', async () => {
      const { mergeNodesRRF } = await import('./fourWay');

      const vectorNodes = [
        createMockNode({
          _id: 'n1' as Id<'graphNodes'>,
          name: 'mem-sona',
          type: 'project',
          properties: { description: 'Memory infrastructure' },
        }),
      ];

      const merged = mergeNodesRRF(vectorNodes, []);

      expect(merged[0].context).toContain('project:');
      expect(merged[0].context).toContain('mem-sona');
      expect(merged[0].context).toContain('Memory infrastructure');
    });

    it('should preserve node metadata', async () => {
      const { mergeNodesRRF } = await import('./fourWay');

      const vectorNodes = [
        createMockNode({
          _id: 'n1' as Id<'graphNodes'>,
          name: 'TypeScript',
          type: 'skill',
          properties: { description: 'Programming language' },
        }),
      ];

      const merged = mergeNodesRRF(vectorNodes, []);

      expect(merged[0].name).toBe('TypeScript');
      expect(merged[0].type).toBe('skill');
      expect(merged[0].description).toBe('Programming language');
      expect(merged[0].nodeId).toBe('n1');
      expect(merged[0].resultType).toBe('node');
    });
  });

  describe('combineItemsAndNodes', () => {
    it('should combine items and nodes into single list', async () => {
      const { combineItemsAndNodes } = await import('./fourWay');

      const mergedItems = [
        {
          _id: 'i1',
          content: 'Item content',
          category: 'test',
          createdAt: Date.now(),
          rrfScore: 0.1,
          sourceType: 'vector' as const,
          resultType: 'item' as const,
        },
      ];

      const mergedNodes = [
        {
          _id: 'n1',
          name: 'Node',
          type: 'project',
          context: 'project: Node',
          createdAt: Date.now(),
          rrfScore: 0.09,
          sourceType: 'text' as const,
          resultType: 'node' as const,
          nodeId: 'n1',
        },
      ];

      const combined = combineItemsAndNodes(mergedItems as any, mergedNodes as any);

      expect(combined.length).toBe(2);
      expect(combined.some(r => r.resultType === 'item')).toBe(true);
      expect(combined.some(r => r.resultType === 'node')).toBe(true);
    });

    it('should preserve all metadata fields', async () => {
      const { combineItemsAndNodes } = await import('./fourWay');

      const mergedItems = [
        {
          _id: 'i1',
          content: 'Test',
          category: 'tech_preferences',
          createdAt: Date.now(),
          rrfScore: 0.1,
          sourceType: 'hybrid' as const,
          resultType: 'item' as const,
          vectorRank: 1,
          textRank: 2,
        },
      ];

      const combined = combineItemsAndNodes(mergedItems as any, []);

      expect(combined[0].category).toBe('tech_preferences');
      expect(combined[0].vectorRank).toBe(1);
      expect(combined[0].textRank).toBe(2);
    });
  });

  describe('applyTimeDecayToResults', () => {
    it('should apply time decay to all results', async () => {
      const { applyTimeDecayToResults } = await import('./fourWay');

      const now = Date.now();
      const results = [
        { rrfScore: 0.1, createdAt: now, resultType: 'item' as const, content: 'Test', _id: 'i1' },
      ];

      const decayed = applyTimeDecayToResults(results as any);

      expect(decayed[0]).toHaveProperty('finalScore');
      expect(decayed[0]).toHaveProperty('decayFactor');
      expect(decayed[0]).toHaveProperty('ageDays');
    });

    it('should boost fresh content over old content', async () => {
      const { applyTimeDecayToResults } = await import('./fourWay');

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

      const results = [
        { rrfScore: 0.1, createdAt: now, resultType: 'item' as const, content: 'Fresh', _id: 'i1' },
        { rrfScore: 0.1, createdAt: thirtyDaysAgo, resultType: 'item' as const, content: 'Old', _id: 'i2' },
      ];

      const decayed = applyTimeDecayToResults(results as any);

      const freshResult = decayed.find(r => r.content === 'Fresh');
      const oldResult = decayed.find(r => r.content === 'Old');

      expect(freshResult!.finalScore).toBeGreaterThan(oldResult!.finalScore);
      expect(oldResult!.decayFactor).toBeCloseTo(0.5, 1);
    });

    it('should sort by finalScore descending', async () => {
      const { applyTimeDecayToResults } = await import('./fourWay');

      const now = Date.now();
      const results = [
        { rrfScore: 0.05, createdAt: now, resultType: 'item' as const, content: 'Low', _id: 'i1' },
        { rrfScore: 0.15, createdAt: now, resultType: 'item' as const, content: 'High', _id: 'i2' },
        { rrfScore: 0.10, createdAt: now, resultType: 'item' as const, content: 'Mid', _id: 'i3' },
      ];

      const decayed = applyTimeDecayToResults(results as any);

      expect(decayed[0].content).toBe('High');
      expect(decayed[1].content).toBe('Mid');
      expect(decayed[2].content).toBe('Low');
    });
  });

  describe('selectTopK', () => {
    it('should return top K results', async () => {
      const { selectTopK } = await import('./fourWay');

      const results = [
        { finalScore: 0.1, resultType: 'item' as const, _id: 'i1', content: '' },
        { finalScore: 0.2, resultType: 'item' as const, _id: 'i2', content: '' },
        { finalScore: 0.15, resultType: 'item' as const, _id: 'i3', content: '' },
        { finalScore: 0.05, resultType: 'item' as const, _id: 'i4', content: '' },
      ];

      const topK = selectTopK(results as any, 2);

      expect(topK.length).toBe(2);
      expect(topK[0].finalScore).toBe(0.2);
      expect(topK[1].finalScore).toBe(0.15);
    });

    it('should handle K larger than result count', async () => {
      const { selectTopK } = await import('./fourWay');

      const results = [
        { finalScore: 0.1, resultType: 'item' as const, _id: 'i1', content: '' },
      ];

      const topK = selectTopK(results as any, 10);

      expect(topK.length).toBe(1);
    });
  });

  describe('hybridSearch4WayHandler', () => {
    it('should execute full pipeline', async () => {
      const { hybridSearch4WayHandler } = await import('./fourWay');

      const now = Date.now();
      const vectorItems = [createMockItem({ createdAt: now })];
      const textItems = [createMockItem({ createdAt: now })];
      const vectorNodes = [createMockNode({ createdAt: now })];
      const textNodes = [createMockNode({ createdAt: now })];

      const results = hybridSearch4WayHandler.execute(
        vectorItems,
        textItems,
        vectorNodes,
        textNodes,
        20
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('finalScore');
      expect(results[0]).toHaveProperty('rrfScore');
      expect(results[0]).toHaveProperty('sourceType');
      expect(results[0]).toHaveProperty('resultType');
    });

    it('should handle empty inputs', async () => {
      const { hybridSearch4WayHandler } = await import('./fourWay');

      const results = hybridSearch4WayHandler.execute([], [], [], [], 20);

      expect(results).toEqual([]);
    });

    it('should respect topK parameter', async () => {
      const { hybridSearch4WayHandler } = await import('./fourWay');

      const now = Date.now();
      const vectorItems = Array.from({ length: 30 }, (_, i) =>
        createMockItem({ _id: `i${i}` as Id<'items'>, content: `Unique content ${i}`, createdAt: now })
      );

      const results = hybridSearch4WayHandler.execute(vectorItems, [], [], [], 10);

      expect(results.length).toBe(10);
    });
  });
});
