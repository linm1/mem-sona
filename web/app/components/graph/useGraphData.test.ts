import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGraphData } from './useGraphData';
import type { GraphNode, GraphEdge } from './types';

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

import { useQuery } from 'convex/react';

describe('useGraphData', () => {
  const mockNodes: GraphNode[] = [
    {
      _id: 'n1',
      name: 'Project1',
      type: 'project',
      properties: { description: 'Test project' },
      status: 'active',
      createdAt: 0,
      updatedAt: 0,
    },
    {
      _id: 'n2',
      name: 'Tool1',
      type: 'tool',
      properties: {},
      status: 'active',
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  const mockEdges: GraphEdge[] = [
    {
      _id: 'e1',
      fromNode: 'n1',
      toNode: 'n2',
      relationship: 'uses_tool',
      weight: 0.8,
      properties: {},
      status: 'active',
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state when nodes are undefined', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(undefined) // nodes
      .mockReturnValueOnce([]); // edges

    const { result } = renderHook(() => useGraphData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.elements).toEqual([]);
  });

  it('returns loading state when edges are undefined', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce([]) // nodes
      .mockReturnValueOnce(undefined); // edges

    const { result } = renderHook(() => useGraphData());

    expect(result.current.isLoading).toBe(true);
  });

  it('returns loading state when both are undefined', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.elements).toEqual([]);
    expect(result.current.nodeCount).toBe(0);
    expect(result.current.edgeCount).toBe(0);
  });

  it('returns elements when data is loaded', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.elements).toHaveLength(3); // 2 nodes + 1 edge
  });

  it('transforms nodes correctly', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    const { result } = renderHook(() => useGraphData());

    const firstNode = result.current.elements[0] as { data: { id: string; label: string; type: string } };
    expect(firstNode.data.id).toBe('n1');
    expect(firstNode.data.label).toBe('Project1');
    expect(firstNode.data.type).toBe('project');
  });

  it('transforms edges correctly', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    const { result } = renderHook(() => useGraphData());

    const edge = result.current.elements[2] as { data: { id: string; source: string; target: string } };
    expect(edge.data.id).toBe('e1');
    expect(edge.data.source).toBe('n1');
    expect(edge.data.target).toBe('n2');
  });

  it('handles empty graph', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.elements).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('isEmpty is false when nodes exist', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce([]);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.isEmpty).toBe(false);
  });

  it('counts nodes correctly', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.nodeCount).toBe(2);
  });

  it('counts edges correctly', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.edgeCount).toBe(1);
  });

  it('passes nodeType filter to query', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    renderHook(() => useGraphData({ nodeType: 'project' }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'project' })
    );
  });

  it('passes relationship filter to query', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    renderHook(() => useGraphData({ relationship: 'uses_tool' }));

    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ relationship: 'uses_tool' })
    );
  });

  it('returns null error by default', () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockNodes)
      .mockReturnValueOnce(mockEdges);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.error).toBeNull();
  });

  it('handles many nodes efficiently', () => {
    const manyNodes = Array.from({ length: 100 }, (_, i) => ({
      _id: `n${i}`,
      name: `Node${i}`,
      type: 'concept' as const,
      properties: {},
      status: 'active',
      createdAt: 0,
      updatedAt: 0,
    }));

    vi.mocked(useQuery)
      .mockReturnValueOnce(manyNodes)
      .mockReturnValueOnce([]);

    const { result } = renderHook(() => useGraphData());

    expect(result.current.nodeCount).toBe(100);
    expect(result.current.elements).toHaveLength(100);
  });
});
