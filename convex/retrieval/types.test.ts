// convex/retrieval/types.test.ts
// TDD Tests for type definitions and validators

import { describe, it, expect } from 'vitest';

describe('retrieval/types', () => {
  describe('type exports', () => {
    it('should export VectorResult type', async () => {
      const module = await import('./types');
      expect(module).toBeDefined();
      // Type checking is done at compile time
      // This test ensures the module can be imported
    });

    it('should export GraphResult type', async () => {
      const module = await import('./types');
      expect(module).toBeDefined();
    });

    it('should export MergedResult type', async () => {
      const module = await import('./types');
      expect(module).toBeDefined();
    });

    it('should export HybridSearchResult type', async () => {
      const module = await import('./types');
      expect(module).toBeDefined();
    });

    it('should export EdgeData type', async () => {
      const module = await import('./types');
      expect(module).toBeDefined();
    });

    it('should export RRF input types', async () => {
      const module = await import('./types');
      expect(module).toBeDefined();
    });

    it('should export 4-way types', async () => {
      const module = await import('./types');
      expect(module).toBeDefined();
    });
  });

  describe('validators', () => {
    it('should export vectorResultValidator', async () => {
      const { vectorResultValidator } = await import('./types');
      expect(vectorResultValidator).toBeDefined();
      expect(typeof vectorResultValidator).toBe('object');
    });

    it('should export graphResultValidator', async () => {
      const { graphResultValidator } = await import('./types');
      expect(graphResultValidator).toBeDefined();
      expect(typeof graphResultValidator).toBe('object');
    });

    it('should export mergedResultValidator', async () => {
      const { mergedResultValidator } = await import('./types');
      expect(mergedResultValidator).toBeDefined();
      expect(typeof mergedResultValidator).toBe('object');
    });

    it('should export edgeDataValidator', async () => {
      const { edgeDataValidator } = await import('./types');
      expect(edgeDataValidator).toBeDefined();
      expect(typeof edgeDataValidator).toBe('object');
    });

    it('should export rrfVectorInputValidator', async () => {
      const { rrfVectorInputValidator } = await import('./types');
      expect(rrfVectorInputValidator).toBeDefined();
      expect(typeof rrfVectorInputValidator).toBe('object');
    });

    it('should export rrfGraphInputValidator', async () => {
      const { rrfGraphInputValidator } = await import('./types');
      expect(rrfGraphInputValidator).toBeDefined();
      expect(typeof rrfGraphInputValidator).toBe('object');
    });

    it('should export rrfFusedResultValidator', async () => {
      const { rrfFusedResultValidator } = await import('./types');
      expect(rrfFusedResultValidator).toBeDefined();
      expect(typeof rrfFusedResultValidator).toBe('object');
    });
  });
});
