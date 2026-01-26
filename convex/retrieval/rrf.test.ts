// convex/retrieval/rrf.test.ts
// TDD Tests for RRF algorithm functions

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

describe('retrieval/rrf', () => {
  describe('calculateTimeDecay', () => {
    it('should return 1.0 for current timestamp', async () => {
      const { calculateTimeDecay } = await import('./rrf');
      const now = Date.now();
      const decay = calculateTimeDecay(now);
      expect(decay).toBeCloseTo(1.0, 2);
    });

    it('should return ~0.5 for 30-day old timestamp (half-life)', async () => {
      const { calculateTimeDecay } = await import('./rrf');
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const decay = calculateTimeDecay(thirtyDaysAgo);
      expect(decay).toBeCloseTo(0.5, 1);
    });

    it('should return lower value for older timestamps', async () => {
      const { calculateTimeDecay } = await import('./rrf');
      const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const decay = calculateTimeDecay(sixtyDaysAgo);
      expect(decay).toBeLessThan(0.5);
      expect(decay).toBeGreaterThan(0);
    });

    it('should handle year-old timestamps', async () => {
      const { calculateTimeDecay } = await import('./rrf');
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const decay = calculateTimeDecay(oneYearAgo);
      expect(decay).toBeGreaterThan(0);
      expect(decay).toBeLessThan(0.1);
    });
  });

  describe('hashContent', () => {
    it('should generate deterministic hash for same content', async () => {
      const { hashContent } = await import('./rrf');
      const content = 'Test content for hashing';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', async () => {
      const { hashContent } = await import('./rrf');
      const hash1 = hashContent('Content A');
      const hash2 = hashContent('Content B');
      expect(hash1).not.toBe(hash2);
    });

    it('should return string hash', async () => {
      const { hashContent } = await import('./rrf');
      const hash = hashContent('Test');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle empty string', async () => {
      const { hashContent } = await import('./rrf');
      const hash = hashContent('');
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters', async () => {
      const { hashContent } = await import('./rrf');
      const hash = hashContent('Test with émojis 🚀 and spëcial çharacters');
      expect(typeof hash).toBe('string');
    });
  });

  describe('weightedTimeDecayRRF', () => {
    it('should merge vector and graph results', async () => {
      const { weightedTimeDecayRRF } = await import('./rrf');

      const vectorResults = [
        {
          itemId: 'i1' as Id<'items'>,
          content: 'Vector result',
          rawScore: 0.9,
          timestamp: Date.now(),
          category: 'test',
        },
      ];

      const graphResults = [
        {
          nodeId: 'n1' as Id<'graphNodes'>,
          nodeType: 'project',
          context: 'Graph result',
          rawScore: 0.85,
          timestamp: Date.now(),
          edges: 5,
        },
      ];

      const merged = weightedTimeDecayRRF(vectorResults, graphResults, 20);

      expect(merged.length).toBe(2);
      expect(merged.some(r => r.type === 'item')).toBe(true);
      expect(merged.some(r => r.type === 'node')).toBe(true);
    });

    it('should accumulate RRF scores for duplicate content', async () => {
      const { weightedTimeDecayRRF } = await import('./rrf');

      const sharedContent = 'Shared content across both sources';
      const now = Date.now();

      const vectorResults = [
        {
          itemId: 'i1' as Id<'items'>,
          content: sharedContent,
          rawScore: 0.9,
          timestamp: now,
          category: 'test',
        },
      ];

      const graphResults = [
        {
          nodeId: 'n1' as Id<'graphNodes'>,
          nodeType: 'project',
          context: sharedContent,
          rawScore: 0.85,
          timestamp: now,
          edges: 5,
        },
      ];

      const merged = weightedTimeDecayRRF(vectorResults, graphResults, 20);

      // Should deduplicate and accumulate scores
      expect(merged.length).toBe(1);
      const result = merged[0];
      expect(result.sources).toEqual(expect.arrayContaining(['vector', 'graph']));
      expect(result.rrfScore).toBeGreaterThan(0);
    });

    it('should apply time-decay after RRF fusion', async () => {
      const { weightedTimeDecayRRF } = await import('./rrf');

      const now = Date.now();
      const oldTimestamp = now - 60 * 24 * 60 * 60 * 1000; // 60 days ago

      const vectorResults = [
        {
          itemId: 'i1' as Id<'items'>,
          content: 'Fresh content',
          rawScore: 0.9,
          timestamp: now,
          category: 'test',
        },
        {
          itemId: 'i2' as Id<'items'>,
          content: 'Old content',
          rawScore: 0.9,
          timestamp: oldTimestamp,
          category: 'test',
        },
      ];

      const merged = weightedTimeDecayRRF(vectorResults, [], 20);

      const freshResult = merged.find(r => r.content === 'Fresh content');
      const oldResult = merged.find(r => r.content === 'Old content');

      expect(freshResult).toBeDefined();
      expect(oldResult).toBeDefined();
      expect(freshResult!.finalScore).toBeGreaterThan(oldResult!.finalScore);
    });

    it('should respect topK limit', async () => {
      const { weightedTimeDecayRRF } = await import('./rrf');

      const now = Date.now();
      const vectorResults = Array.from({ length: 30 }, (_, i) => ({
        itemId: `i${i}` as Id<'items'>,
        content: `Content ${i}`,
        rawScore: 0.9 - (i * 0.01),
        timestamp: now,
        category: 'test',
      }));

      const merged = weightedTimeDecayRRF(vectorResults, [], 10);

      expect(merged.length).toBe(10);
    });

    it('should sort results by finalScore descending', async () => {
      const { weightedTimeDecayRRF } = await import('./rrf');

      const now = Date.now();
      const vectorResults = [
        {
          itemId: 'i1' as Id<'items'>,
          content: 'Low score',
          rawScore: 0.5,
          timestamp: now,
          category: 'test',
        },
        {
          itemId: 'i2' as Id<'items'>,
          content: 'High score',
          rawScore: 0.95,
          timestamp: now,
          category: 'test',
        },
        {
          itemId: 'i3' as Id<'items'>,
          content: 'Medium score',
          rawScore: 0.75,
          timestamp: now,
          category: 'test',
        },
      ];

      const merged = weightedTimeDecayRRF(vectorResults, [], 20);

      // Should be sorted by finalScore descending
      for (let i = 1; i < merged.length; i++) {
        expect(merged[i - 1].finalScore).toBeGreaterThanOrEqual(merged[i].finalScore);
      }
    });

    it('should handle empty inputs', async () => {
      const { weightedTimeDecayRRF } = await import('./rrf');

      const merged = weightedTimeDecayRRF([], [], 20);
      expect(merged).toEqual([]);
    });

    it('should keep earliest timestamp for duplicates', async () => {
      const { weightedTimeDecayRRF } = await import('./rrf');

      const now = Date.now();
      const older = now - 10 * 24 * 60 * 60 * 1000;
      const sharedContent = 'Shared';

      const vectorResults = [
        {
          itemId: 'i1' as Id<'items'>,
          content: sharedContent,
          rawScore: 0.9,
          timestamp: now,
          category: 'test',
        },
      ];

      const graphResults = [
        {
          nodeId: 'n1' as Id<'graphNodes'>,
          nodeType: 'project',
          context: sharedContent,
          rawScore: 0.85,
          timestamp: older,
          edges: 5,
        },
      ];

      const merged = weightedTimeDecayRRF(vectorResults, graphResults, 20);

      // Should use the older timestamp for time-decay calculation
      expect(merged[0].timestamp).toBe(older);
    });
  });
});
