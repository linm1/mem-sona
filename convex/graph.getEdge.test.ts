// convex/graph.getEdge.test.ts
// Tests for getEdge query function

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';

// Mock types for Convex context
type MockQueryCtx = {
  db: {
    get: ReturnType<typeof vi.fn>;
  };
};

// Test fixtures
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

const createMockEdge = (overrides: Partial<Doc<'graphEdges'>> = {}): Doc<'graphEdges'> => ({
  _id: 'edge123' as Id<'graphEdges'>,
  _creationTime: Date.now(),
  fromNode: 'node1' as Id<'graphNodes'>,
  toNode: 'node2' as Id<'graphNodes'>,
  relationship: 'uses',
  weight: 0.5,
  properties: { context: 'Testing context' },
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('getEdge', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    // Create fresh mock context for each test
    mockCtx = {
      db: {
        get: vi.fn(),
      },
    };
  });

  it('returns edge with enriched node labels for valid edge ID', async () => {
    const fromNodeId = 'fromNode123' as Id<'graphNodes'>;
    const toNodeId = 'toNode456' as Id<'graphNodes'>;
    const edgeId = 'edge789' as Id<'graphEdges'>;

    const mockFromNode = createMockNode({
      _id: fromNodeId,
      name: 'Project Alpha',
      type: 'project',
    });

    const mockToNode = createMockNode({
      _id: toNodeId,
      name: 'TypeScript',
      type: 'tool',
    });

    const mockEdge = createMockEdge({
      _id: edgeId,
      fromNode: fromNodeId,
      toNode: toNodeId,
      relationship: 'uses',
      weight: 0.8,
      properties: { context: 'Used for development' },
      status: 'active',
    });

    // Mock db.get calls in order: edge, fromNode, toNode
    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(mockEdge)
      .mockResolvedValueOnce(mockFromNode)
      .mockResolvedValueOnce(mockToNode);

    // Import the function
    const { getEdge } = await import('./graph');

    const result = await (getEdge as any)(mockCtx as any, { edgeId });

    // Verify enriched result
    expect(result).toBeDefined();
    expect(result._id).toBe(edgeId);
    expect(result.fromNode).toBe(fromNodeId);
    expect(result.toNode).toBe(toNodeId);
    expect(result.relationship).toBe('uses');
    expect(result.weight).toBe(0.8);
    expect(result.properties.context).toBe('Used for development');
    expect(result.status).toBe('active');
    expect(result.fromNodeLabel).toBe('Project Alpha');
    expect(result.fromNodeType).toBe('project');
    expect(result.toNodeLabel).toBe('TypeScript');
    expect(result.toNodeType).toBe('tool');

    // Verify db.get was called correctly
    expect(mockCtx.db.get).toHaveBeenCalledTimes(3);
    expect(mockCtx.db.get).toHaveBeenNthCalledWith(1, edgeId);
    expect(mockCtx.db.get).toHaveBeenNthCalledWith(2, fromNodeId);
    expect(mockCtx.db.get).toHaveBeenNthCalledWith(3, toNodeId);
  });

  it('returns null for invalid edge ID', async () => {
    const edgeId = 'nonexistent' as Id<'graphEdges'>;

    mockCtx.db.get = vi.fn().mockResolvedValue(null);

    const { getEdge } = await import('./graph');

    const result = await (getEdge as any)(mockCtx as any, { edgeId });

    expect(result).toBeNull();
    expect(mockCtx.db.get).toHaveBeenCalledTimes(1);
    expect(mockCtx.db.get).toHaveBeenCalledWith(edgeId);
  });

  it('returns Unknown label when fromNode is deleted', async () => {
    const fromNodeId = 'deletedNode' as Id<'graphNodes'>;
    const toNodeId = 'toNode456' as Id<'graphNodes'>;
    const edgeId = 'edge789' as Id<'graphEdges'>;

    const mockToNode = createMockNode({
      _id: toNodeId,
      name: 'React',
      type: 'tool',
    });

    const mockEdge = createMockEdge({
      _id: edgeId,
      fromNode: fromNodeId,
      toNode: toNodeId,
      relationship: 'uses',
    });

    // Mock db.get: edge exists, fromNode is null (deleted), toNode exists
    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(mockEdge)
      .mockResolvedValueOnce(null) // fromNode deleted
      .mockResolvedValueOnce(mockToNode);

    const { getEdge } = await import('./graph');

    const result = await (getEdge as any)(mockCtx as any, { edgeId });

    expect(result).toBeDefined();
    expect(result.fromNodeLabel).toBe('Unknown');
    expect(result.fromNodeType).toBe('concept'); // Default type
    expect(result.toNodeLabel).toBe('React');
    expect(result.toNodeType).toBe('tool');
  });

  it('returns Unknown label when toNode is deleted', async () => {
    const fromNodeId = 'fromNode123' as Id<'graphNodes'>;
    const toNodeId = 'deletedNode' as Id<'graphNodes'>;
    const edgeId = 'edge789' as Id<'graphEdges'>;

    const mockFromNode = createMockNode({
      _id: fromNodeId,
      name: 'Backend Service',
      type: 'project',
    });

    const mockEdge = createMockEdge({
      _id: edgeId,
      fromNode: fromNodeId,
      toNode: toNodeId,
      relationship: 'uses',
    });

    // Mock db.get: edge exists, fromNode exists, toNode is null (deleted)
    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(mockEdge)
      .mockResolvedValueOnce(mockFromNode)
      .mockResolvedValueOnce(null); // toNode deleted

    const { getEdge } = await import('./graph');

    const result = await (getEdge as any)(mockCtx as any, { edgeId });

    expect(result).toBeDefined();
    expect(result.fromNodeLabel).toBe('Backend Service');
    expect(result.fromNodeType).toBe('project');
    expect(result.toNodeLabel).toBe('Unknown');
    expect(result.toNodeType).toBe('concept'); // Default type
  });

  it('returns Unknown labels when both nodes are deleted', async () => {
    const fromNodeId = 'deletedNode1' as Id<'graphNodes'>;
    const toNodeId = 'deletedNode2' as Id<'graphNodes'>;
    const edgeId = 'edge789' as Id<'graphEdges'>;

    const mockEdge = createMockEdge({
      _id: edgeId,
      fromNode: fromNodeId,
      toNode: toNodeId,
      relationship: 'knows',
    });

    // Mock db.get: edge exists, both nodes are null (deleted)
    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(mockEdge)
      .mockResolvedValueOnce(null) // fromNode deleted
      .mockResolvedValueOnce(null); // toNode deleted

    const { getEdge } = await import('./graph');

    const result = await (getEdge as any)(mockCtx as any, { edgeId });

    expect(result).toBeDefined();
    expect(result.fromNodeLabel).toBe('Unknown');
    expect(result.fromNodeType).toBe('concept');
    expect(result.toNodeLabel).toBe('Unknown');
    expect(result.toNodeType).toBe('concept');
  });

  it('preserves all edge fields in enriched result', async () => {
    const fromNodeId = 'fromNode123' as Id<'graphNodes'>;
    const toNodeId = 'toNode456' as Id<'graphNodes'>;
    const edgeId = 'edge789' as Id<'graphEdges'>;
    const creationTime = Date.now();
    const createdAt = Date.now() - 1000;
    const updatedAt = Date.now();

    const mockFromNode = createMockNode({ _id: fromNodeId, name: 'Node A' });
    const mockToNode = createMockNode({ _id: toNodeId, name: 'Node B' });

    const mockEdge = createMockEdge({
      _id: edgeId,
      _creationTime: creationTime,
      fromNode: fromNodeId,
      toNode: toNodeId,
      relationship: 'requires',
      weight: 0.95,
      properties: {
        context: 'Mandatory dependency',
        since: createdAt,
      },
      status: 'active',
      createdAt,
      updatedAt,
    });

    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(mockEdge)
      .mockResolvedValueOnce(mockFromNode)
      .mockResolvedValueOnce(mockToNode);

    const { getEdge } = await import('./graph');

    const result = await (getEdge as any)(mockCtx as any, { edgeId });

    // Verify all original edge fields are preserved
    expect(result._id).toBe(edgeId);
    expect(result._creationTime).toBe(creationTime);
    expect(result.fromNode).toBe(fromNodeId);
    expect(result.toNode).toBe(toNodeId);
    expect(result.relationship).toBe('requires');
    expect(result.weight).toBe(0.95);
    expect(result.properties).toEqual({
      context: 'Mandatory dependency',
      since: createdAt,
    });
    expect(result.status).toBe('active');
    expect(result.createdAt).toBe(createdAt);
    expect(result.updatedAt).toBe(updatedAt);

    // Verify enriched fields are added
    expect(result.fromNodeLabel).toBe('Node A');
    expect(result.toNodeLabel).toBe('Node B');
  });

  it('handles edges with missing properties.context gracefully', async () => {
    const fromNodeId = 'fromNode123' as Id<'graphNodes'>;
    const toNodeId = 'toNode456' as Id<'graphNodes'>;
    const edgeId = 'edge789' as Id<'graphEdges'>;

    const mockFromNode = createMockNode({ _id: fromNodeId, name: 'Source' });
    const mockToNode = createMockNode({ _id: toNodeId, name: 'Target' });

    const mockEdge = createMockEdge({
      _id: edgeId,
      fromNode: fromNodeId,
      toNode: toNodeId,
      relationship: 'related_to',
      properties: {}, // No context
    });

    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(mockEdge)
      .mockResolvedValueOnce(mockFromNode)
      .mockResolvedValueOnce(mockToNode);

    const { getEdge } = await import('./graph');

    const result = await (getEdge as any)(mockCtx as any, { edgeId });

    expect(result).toBeDefined();
    expect(result.properties.context).toBeUndefined();
    expect(result.fromNodeLabel).toBe('Source');
    expect(result.toNodeLabel).toBe('Target');
  });
});
