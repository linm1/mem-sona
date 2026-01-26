// convex/graph.updateEdge.mutation.test.ts
// Unit tests for updateEdge mutation
// Following TDD methodology: Write tests FIRST, then implement

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';

// Mock types for Convex context
type MockMutationCtx = {
  db: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
};

// Test fixtures
const createMockEdge = (overrides: Partial<Doc<'graphEdges'>> = {}): Doc<'graphEdges'> => ({
  _id: 'edge123' as Id<'graphEdges'>,
  _creationTime: Date.now(),
  fromNode: 'node1' as Id<'graphNodes'>,
  toNode: 'node2' as Id<'graphNodes'>,
  relationship: 'uses',
  weight: 0.5,
  properties: { context: 'Original context', since: Date.now() - 1000 },
  status: 'active',
  createdAt: Date.now() - 1000,
  updatedAt: Date.now() - 1000,
  ...overrides,
});

describe('updateEdge mutation', () => {
  let mockCtx: MockMutationCtx;
  const edgeId = 'edge123' as Id<'graphEdges'>;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        patch: vi.fn(),
      },
    };
  });

  it('should update relationship only and preserve other fields', async () => {
    const originalEdge = createMockEdge({
      relationship: 'uses',
      weight: 0.7,
      properties: { context: 'Test context', since: 12345 },
    });

    const updatedEdge = {
      ...originalEdge,
      relationship: 'requires',
      updatedAt: Date.now(),
    };

    mockCtx.db.get
      .mockResolvedValueOnce(originalEdge)
      .mockResolvedValueOnce(updatedEdge);

    const { updateEdge } = await import('./graph');

    const result = await (updateEdge as any)(mockCtx as any, {
      edgeId,
      relationship: 'requires',
    });

    expect(result.relationship).toBe('requires');
    expect(result.weight).toBe(0.7);
    expect(result.properties.context).toBe('Test context');
    expect(result.properties.since).toBe(12345);
    expect(mockCtx.db.patch).toHaveBeenCalledWith(
      edgeId,
      expect.objectContaining({
        relationship: 'requires',
        updatedAt: expect.any(Number),
      })
    );
  });

  it('should update weight only and preserve other fields', async () => {
    const originalEdge = createMockEdge({
      relationship: 'uses',
      weight: 0.5,
      properties: { context: 'Test context', since: 12345 },
    });

    const updatedEdge = {
      ...originalEdge,
      weight: 0.9,
      updatedAt: Date.now(),
    };

    mockCtx.db.get
      .mockResolvedValueOnce(originalEdge)
      .mockResolvedValueOnce(updatedEdge);

    const { updateEdge } = await import('./graph');

    const result = await (updateEdge as any)(mockCtx as any, {
      edgeId,
      weight: 0.9,
    });

    expect(result.weight).toBe(0.9);
    expect(result.relationship).toBe('uses');
    expect(result.properties.context).toBe('Test context');
  });

  it('should update context only and preserve other fields', async () => {
    const originalEdge = createMockEdge({
      relationship: 'uses',
      weight: 0.5,
      properties: { context: 'Old context', since: 12345 },
    });

    const updatedEdge = {
      ...originalEdge,
      properties: { context: 'New context', since: 12345 },
      updatedAt: Date.now(),
    };

    mockCtx.db.get
      .mockResolvedValueOnce(originalEdge)
      .mockResolvedValueOnce(updatedEdge);

    const { updateEdge } = await import('./graph');

    const result = await (updateEdge as any)(mockCtx as any, {
      edgeId,
      context: 'New context',
    });

    expect(result.properties.context).toBe('New context');
    expect(result.properties.since).toBe(12345);
    expect(result.weight).toBe(0.5);
    expect(result.relationship).toBe('uses');
  });

  it('should update all three fields simultaneously', async () => {
    const originalEdge = createMockEdge({
      relationship: 'uses',
      weight: 0.5,
      properties: { context: 'Old context', since: 12345 },
    });

    const updatedEdge = {
      ...originalEdge,
      relationship: 'requires',
      weight: 0.8,
      properties: { context: 'New context', since: 12345 },
      updatedAt: Date.now(),
    };

    mockCtx.db.get
      .mockResolvedValueOnce(originalEdge)
      .mockResolvedValueOnce(updatedEdge);

    const { updateEdge } = await import('./graph');

    const result = await (updateEdge as any)(mockCtx as any, {
      edgeId,
      relationship: 'requires',
      weight: 0.8,
      context: 'New context',
    });

    expect(result.relationship).toBe('requires');
    expect(result.weight).toBe(0.8);
    expect(result.properties.context).toBe('New context');
  });

  it('should validate weight is between 0.0 and 1.0', async () => {
    const { updateEdge } = await import('./graph');

    await expect(
      (updateEdge as any)(mockCtx as any, {
        edgeId,
        weight: -0.1,
      })
    ).rejects.toThrow('Weight must be between 0.0 and 1.0');

    await expect(
      (updateEdge as any)(mockCtx as any, {
        edgeId,
        weight: 1.5,
      })
    ).rejects.toThrow('Weight must be between 0.0 and 1.0');
  });

  it('should throw error if edge not found', async () => {
    mockCtx.db.get.mockResolvedValue(null);

    const { updateEdge } = await import('./graph');

    await expect(
      (updateEdge as any)(mockCtx as any, {
        edgeId,
        weight: 0.5,
      })
    ).rejects.toThrow('Edge not found');
  });

  it('should throw error if no fields provided to update', async () => {
    const { updateEdge } = await import('./graph');

    await expect(
      (updateEdge as any)(mockCtx as any, {
        edgeId,
      })
    ).rejects.toThrow('Must provide at least one field to update');
  });

  it('should update updatedAt timestamp', async () => {
    const originalEdge = createMockEdge({
      updatedAt: 1000,
    });

    const updatedEdge = {
      ...originalEdge,
      weight: 0.9,
      updatedAt: 2000,
    };

    mockCtx.db.get
      .mockResolvedValueOnce(originalEdge)
      .mockResolvedValueOnce(updatedEdge);

    const { updateEdge } = await import('./graph');

    const result = await (updateEdge as any)(mockCtx as any, {
      edgeId,
      weight: 0.9,
    });

    expect(result.updatedAt).toBeGreaterThan(originalEdge.updatedAt);
  });

  it('should preserve properties.since when updating context', async () => {
    const originalEdge = createMockEdge({
      properties: { context: 'Old context', since: 12345 },
    });

    const updatedEdge = {
      ...originalEdge,
      properties: { context: 'New context', since: 12345 },
      updatedAt: Date.now(),
    };

    mockCtx.db.get
      .mockResolvedValueOnce(originalEdge)
      .mockResolvedValueOnce(updatedEdge);

    const { updateEdge } = await import('./graph');

    const result = await (updateEdge as any)(mockCtx as any, {
      edgeId,
      context: 'New context',
    });

    expect(result.properties.since).toBe(12345);
  });

  it('should use immutable pattern (not mutate original edge)', async () => {
    const originalEdge = createMockEdge();
    const originalSnapshot = { ...originalEdge };

    const updatedEdge = {
      ...originalEdge,
      weight: 0.9,
      updatedAt: Date.now(),
    };

    mockCtx.db.get
      .mockResolvedValueOnce(originalEdge)
      .mockResolvedValueOnce(updatedEdge);

    const { updateEdge } = await import('./graph');

    await (updateEdge as any)(mockCtx as any, {
      edgeId,
      weight: 0.9,
    });

    // Verify original object reference wasn't mutated
    expect(originalEdge).toEqual(originalSnapshot);
  });
});
