// convex/graph.test.ts
// Tests for graph query functions (US-031)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';

// Mock types for Convex context
type MockQueryCtx = {
  db: {
    get: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
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
  properties: {},
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('listActiveNodes', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    // Create fresh mock context for each test
    mockCtx = {
      db: {
        get: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('returns all active nodes when no type filter provided', async () => {
    const mockNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'Project A', type: 'project', status: 'active' }),
      createMockNode({ _id: 'n2' as Id<'graphNodes'>, name: 'Tool B', type: 'tool', status: 'active' }),
      createMockNode({ _id: 'n3' as Id<'graphNodes'>, name: 'Skill C', type: 'skill', status: 'active' }),
    ];

    // Mock the query chain
    const mockCollect = vi.fn().mockResolvedValue(mockNodes);
    const mockWithIndex = vi.fn().mockReturnValue({ collect: mockCollect });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    // Import the function (we'll implement this after tests)
    const { listActiveNodes } = await import('./graph');

    const result = await (listActiveNodes as any)(mockCtx as any, {});

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Project A');
    expect(mockCtx.db.query).toHaveBeenCalledWith('graphNodes');
    expect(mockWithIndex).toHaveBeenCalledWith('by_status', expect.any(Function));
  });

  it('returns only nodes matching type filter', async () => {
    const mockNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'Project A', type: 'project', status: 'active' }),
      createMockNode({ _id: 'n2' as Id<'graphNodes'>, name: 'Project B', type: 'project', status: 'active' }),
    ];

    const mockFilter = vi.fn().mockReturnValue({ collect: vi.fn().mockResolvedValue(mockNodes) });
    const mockWithIndex = vi.fn().mockReturnValue({ filter: mockFilter });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { listActiveNodes } = await import('./graph');

    const result = await (listActiveNodes as any)(mockCtx as any, { type: 'project' });

    expect(result).toHaveLength(2);
    expect(result.every((n: any) => n.type === 'project')).toBe(true);
    expect(mockWithIndex).toHaveBeenCalledWith('by_type', expect.any(Function));
  });

  it('excludes archived nodes', async () => {
    const mockNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'Active Node', status: 'active' }),
    ];

    const mockFilter = vi.fn().mockReturnValue({ collect: vi.fn().mockResolvedValue(mockNodes) });
    const mockWithIndex = vi.fn().mockReturnValue({ filter: mockFilter });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { listActiveNodes } = await import('./graph');

    const result = await (listActiveNodes as any)(mockCtx as any, { type: 'project' });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('active');
  });

  it('returns empty array when no active nodes exist', async () => {
    const mockCollect = vi.fn().mockResolvedValue([]);
    const mockWithIndex = vi.fn().mockReturnValue({ collect: mockCollect });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { listActiveNodes } = await import('./graph');

    const result = await (listActiveNodes as any)(mockCtx as any, {});

    expect(result).toEqual([]);
  });
});

describe('listActiveEdgesPublic', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('returns all active edges when no relationship filter provided', async () => {
    const mockEdges = [
      createMockEdge({ _id: 'e1' as Id<'graphEdges'>, relationship: 'uses', status: 'active' }),
      createMockEdge({ _id: 'e2' as Id<'graphEdges'>, relationship: 'requires', status: 'active' }),
      createMockEdge({ _id: 'e3' as Id<'graphEdges'>, relationship: 'works_at', status: 'active' }),
    ];

    const mockCollect = vi.fn().mockResolvedValue(mockEdges);
    const mockWithIndex = vi.fn().mockReturnValue({ collect: mockCollect });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { listActiveEdgesPublic } = await import('./graph');

    const result = await (listActiveEdgesPublic as any)(mockCtx as any, {});

    expect(result).toHaveLength(3);
    expect(mockWithIndex).toHaveBeenCalledWith('by_status', expect.any(Function));
  });

  it('returns only edges matching relationship filter', async () => {
    const mockEdges = [
      createMockEdge({ _id: 'e1' as Id<'graphEdges'>, relationship: 'uses', status: 'active' }),
      createMockEdge({ _id: 'e2' as Id<'graphEdges'>, relationship: 'uses', status: 'active' }),
    ];

    const mockCollect = vi.fn().mockResolvedValue([
      createMockEdge({ _id: 'e1' as Id<'graphEdges'>, relationship: 'uses', status: 'active' }),
      createMockEdge({ _id: 'e2' as Id<'graphEdges'>, relationship: 'uses', status: 'active' }),
      createMockEdge({ _id: 'e3' as Id<'graphEdges'>, relationship: 'requires', status: 'active' }),
    ]);
    const mockWithIndex = vi.fn().mockReturnValue({ collect: mockCollect });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { listActiveEdgesPublic } = await import('./graph');

    const result = await (listActiveEdgesPublic as any)(mockCtx as any, { relationship: 'uses' });

    expect(result).toHaveLength(2);
    expect(result.every((e: any) => e.relationship === 'uses')).toBe(true);
  });

  it('excludes archived and superseded edges', async () => {
    const mockEdges = [
      createMockEdge({ _id: 'e1' as Id<'graphEdges'>, status: 'active' }),
    ];

    const mockCollect = vi.fn().mockResolvedValue(mockEdges);
    const mockWithIndex = vi.fn().mockReturnValue({ collect: mockCollect });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { listActiveEdgesPublic } = await import('./graph');

    const result = await (listActiveEdgesPublic as any)(mockCtx as any, {});

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('active');
  });

  it('returns empty array when no active edges exist', async () => {
    const mockCollect = vi.fn().mockResolvedValue([]);
    const mockWithIndex = vi.fn().mockReturnValue({ collect: mockCollect });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { listActiveEdgesPublic } = await import('./graph');

    const result = await (listActiveEdgesPublic as any)(mockCtx as any, {});

    expect(result).toEqual([]);
  });
});

describe('getNodeDetails', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('returns node with outgoing and incoming edges and neighbors', async () => {
    const nodeId = 'node123' as Id<'graphNodes'>;
    const node = createMockNode({ _id: nodeId, name: 'Main Node' });
    const neighbor1 = createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'Neighbor 1' });
    const neighbor2 = createMockNode({ _id: 'n2' as Id<'graphNodes'>, name: 'Neighbor 2' });

    const outgoingEdges = [
      createMockEdge({ _id: 'e1' as Id<'graphEdges'>, fromNode: nodeId, toNode: 'n1' as Id<'graphNodes'>, status: 'active' }),
    ];
    const incomingEdges = [
      createMockEdge({ _id: 'e2' as Id<'graphEdges'>, fromNode: 'n2' as Id<'graphNodes'>, toNode: nodeId, status: 'active' }),
    ];

    // Mock db.get for node and neighbors
    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(node) // Initial node fetch
      .mockResolvedValueOnce(neighbor1) // Neighbor 1
      .mockResolvedValueOnce(neighbor2); // Neighbor 2

    // Mock outgoing edges query
    const mockOutgoingFilter = vi.fn().mockReturnValue({ collect: vi.fn().mockResolvedValue(outgoingEdges) });
    const mockOutgoingWithIndex = vi.fn().mockReturnValue({ filter: mockOutgoingFilter });

    // Mock incoming edges query
    const mockIncomingFilter = vi.fn().mockReturnValue({ collect: vi.fn().mockResolvedValue(incomingEdges) });
    const mockIncomingWithIndex = vi.fn().mockReturnValue({ filter: mockIncomingFilter });

    mockCtx.db.query = vi.fn()
      .mockReturnValueOnce({ withIndex: mockOutgoingWithIndex })
      .mockReturnValueOnce({ withIndex: mockIncomingWithIndex });

    const { getNodeDetails } = await import('./graph');

    const result = await (getNodeDetails as any)(mockCtx as any, { nodeId });

    expect(result).toBeDefined();
    expect(result?.node).toEqual(node);
    expect(result?.outgoingEdges).toHaveLength(1);
    expect(result?.incomingEdges).toHaveLength(1);
    expect(result?.neighbors).toHaveLength(2);
  });

  it('returns null when node does not exist', async () => {
    const nodeId = 'nonexistent' as Id<'graphNodes'>;
    mockCtx.db.get = vi.fn().mockResolvedValue(null);

    const { getNodeDetails } = await import('./graph');

    const result = await (getNodeDetails as any)(mockCtx as any, { nodeId });

    expect(result).toBeNull();
  });

  it('filters out archived neighbors', async () => {
    const nodeId = 'node123' as Id<'graphNodes'>;
    const node = createMockNode({ _id: nodeId });
    const activeNeighbor = createMockNode({ _id: 'n1' as Id<'graphNodes'>, status: 'active' });
    const archivedNeighbor = createMockNode({ _id: 'n2' as Id<'graphNodes'>, status: 'archived' });

    const outgoingEdges = [
      createMockEdge({ fromNode: nodeId, toNode: 'n1' as Id<'graphNodes'>, status: 'active' }),
      createMockEdge({ fromNode: nodeId, toNode: 'n2' as Id<'graphNodes'>, status: 'active' }),
    ];

    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(node)
      .mockResolvedValueOnce(activeNeighbor)
      .mockResolvedValueOnce(archivedNeighbor);

    const mockFilter = vi.fn().mockReturnValue({ collect: vi.fn().mockResolvedValue(outgoingEdges) });
    const mockWithIndex = vi.fn().mockReturnValue({ filter: mockFilter });
    mockCtx.db.query = vi.fn()
      .mockReturnValueOnce({ withIndex: mockWithIndex })
      .mockReturnValueOnce({ withIndex: vi.fn().mockReturnValue({ filter: vi.fn().mockReturnValue({ collect: vi.fn().mockResolvedValue([]) }) }) });

    const { getNodeDetails } = await import('./graph');

    const result = await (getNodeDetails as any)(mockCtx as any, { nodeId });

    expect(result?.neighbors).toHaveLength(1);
    expect(result?.neighbors[0].status).toBe('active');
  });

  it('handles node with no edges', async () => {
    const nodeId = 'isolated' as Id<'graphNodes'>;
    const node = createMockNode({ _id: nodeId });

    mockCtx.db.get = vi.fn().mockResolvedValue(node);

    const mockFilter = vi.fn().mockReturnValue({ collect: vi.fn().mockResolvedValue([]) });
    const mockWithIndex = vi.fn().mockReturnValue({ filter: mockFilter });
    mockCtx.db.query = vi.fn().mockReturnValue({ withIndex: mockWithIndex });

    const { getNodeDetails } = await import('./graph');

    const result = await (getNodeDetails as any)(mockCtx as any, { nodeId });

    expect(result?.node).toEqual(node);
    expect(result?.outgoingEdges).toHaveLength(0);
    expect(result?.incomingEdges).toHaveLength(0);
    expect(result?.neighbors).toHaveLength(0);
  });
});
