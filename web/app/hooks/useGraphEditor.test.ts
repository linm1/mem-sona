import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGraphEditor } from './useGraphEditor';
import { Doc } from '../../../convex/_generated/dataModel';

/**
 * Mock Convex hooks
 * These will be replaced with actual mocks in beforeEach
 */
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// Import after mocking
import { useQuery, useMutation } from 'convex/react';

/**
 * Test suite for useGraphEditor hook
 * Tests graph editor state management for nodes and edges
 */
describe('useGraphEditor', () => {
  // Mock functions
  let mockGetNode: ReturnType<typeof vi.fn>;
  let mockGetEdge: ReturnType<typeof vi.fn>;
  let mockUpdateNode: ReturnType<typeof vi.fn>;
  let mockArchiveNode: ReturnType<typeof vi.fn>;
  let mockDeleteEdge: ReturnType<typeof vi.fn>;
  let mockUpdateEdge: ReturnType<typeof vi.fn>;

  // Mock data helpers
  const createMockNode = (overrides?: Partial<Doc<'graphNodes'>>): Doc<'graphNodes'> => ({
    _id: 'node123' as any,
    _creationTime: Date.now(),
    name: 'TypeScript',
    type: 'skill',
    properties: {
      description: 'A strongly typed programming language',
      status: 'active',
    },
    embedding: new Array(1024).fill(0.1),
    status: 'active',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    ...overrides,
  });

  const createMockEdge = (overrides?: Partial<Doc<'graphEdges'>>): Doc<'graphEdges'> => ({
    _id: 'edge456' as any,
    _creationTime: Date.now(),
    fromNode: 'node123' as any,
    toNode: 'node789' as any,
    relationship: 'uses',
    weight: 0.8,
    properties: {
      context: 'Uses in production',
      since: Date.now() - 172800000,
    },
    status: 'active',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    ...overrides,
  });

  const createMockSourceRect = (): DOMRect => ({
    x: 100,
    y: 200,
    width: 300,
    height: 180,
    top: 200,
    right: 400,
    bottom: 380,
    left: 100,
    toJSON: () => ({}),
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock functions
    mockGetNode = vi.fn();
    mockGetEdge = vi.fn();
    mockUpdateNode = vi.fn().mockResolvedValue(undefined);
    mockArchiveNode = vi.fn().mockResolvedValue(true);
    mockDeleteEdge = vi.fn().mockResolvedValue(true);
    mockUpdateEdge = vi.fn().mockResolvedValue(undefined);

    // Setup Convex mock implementations
    (useQuery as any).mockImplementation((query: any, args?: any) => {
      if (!args || args === 'skip') return undefined;

      if (args.nodeId) {
        return mockGetNode(args.nodeId);
      }
      if (args.edgeId) {
        return mockGetEdge(args.edgeId);
      }
      return undefined;
    });

    // Track mutation call order to return correct mock
    let mutationCallIndex = 0;
    const mutationMocks = [
      mockUpdateNode,
      mockArchiveNode,
      mockDeleteEdge,
      mockUpdateEdge, // updateEdge mutation
    ];

    (useMutation as any).mockImplementation(() => {
      const mock = mutationMocks[mutationCallIndex % mutationMocks.length];
      mutationCallIndex++;
      return mock;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('returns closed state initially', () => {
      const { result } = renderHook(() => useGraphEditor());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.entity).toBe(null);
      expect(result.current.sourceRect).toBe(null);
      expect(result.current.entityType).toBe(null);
    });

    it('returns no loading state initially', () => {
      const { result } = renderHook(() => useGraphEditor());

      expect(result.current.isLoading).toBe(false);
    });

    it('returns no error initially', () => {
      const { result } = renderHook(() => useGraphEditor());

      expect(result.current.error).toBe(null);
    });
  });

  describe('Opening Editor - Node', () => {
    it('opens editor with node data', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      expect(result.current.entityType).toBe('node');
      expect(result.current.entity).toEqual(mockNode);
      expect(result.current.sourceRect).not.toBe(null);
    });

    it('stores sourceRect for FLIP animation', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);
      const sourceRect = createMockSourceRect();

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', sourceRect);
      });

      await waitFor(() => {
        expect(result.current.sourceRect).toEqual(sourceRect);
      });
    });

    it('clears error when opening', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      // Simulate error state
      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });

    it('waits for node data to load', async () => {
      mockGetNode.mockReturnValue(undefined);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      // Should not open until data is loaded
      expect(result.current.isOpen).toBe(false);

      // Now provide data
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result: result2 } = renderHook(() => useGraphEditor());

      act(() => {
        result2.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result2.current.isOpen).toBe(true);
      });
    });
  });

  describe('Opening Editor - Edge', () => {
    it('opens editor with edge data', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      expect(result.current.entityType).toBe('edge');
      expect(result.current.entity).toEqual(mockEdge);
    });

    it('handles edge data loading', async () => {
      mockGetEdge.mockReturnValue(undefined);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      // Should not open until data is loaded
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Closing Editor', () => {
    it('closes editor and clears error', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('keeps entity and sourceRect for FLIP animation', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      const entityBeforeClose = result.current.entity;
      const sourceRectBeforeClose = result.current.sourceRect;

      act(() => {
        result.current.close();
      });

      // Should keep data for potential FLIP animation
      expect(result.current.entity).toEqual(entityBeforeClose);
      expect(result.current.sourceRect).toEqual(sourceRectBeforeClose);
    });
  });

  describe('Save - Node', () => {
    it('calls updateNode mutation with correct data', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'Updated description',
        });
      });

      expect(mockUpdateNode).toHaveBeenCalledWith({
        nodeId: 'node123',
        properties: {
          description: 'Updated description',
        },
      });
    });

    it('sets loading state during save', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockUpdateNode.mockReturnValue(savePromise);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.save({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'Updated description',
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSave!();
        await savePromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('closes editor after successful save', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'Updated description',
        });
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
      });
    });

    it('sets error message on save failure', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);
      mockUpdateNode.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'Updated description',
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });

    it('keeps editor open on save failure', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);
      mockUpdateNode.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'Updated description',
        });
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });
    });

    it('throws error when no entity is loaded', async () => {
      const { result } = renderHook(() => useGraphEditor());

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'Test',
          nodeType: 'skill',
          description: 'Test',
        });
      });

      expect(result.current.error).toBe('No entity to save');
    });
  });

  describe('Save - Edge', () => {
    it('calls updateEdge mutation with weight only', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      // Setup a separate mock for updateEdge mutation
      const mockUpdateEdgeLocal = vi.fn().mockResolvedValue({
        ...mockEdge,
        weight: 0.9,
      });

      // Override mutation mock for this test
      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 0.9,
        });
      });

      expect(mockUpdateEdgeLocal).toHaveBeenCalledWith({
        edgeId: 'edge456',
        relationship: 'uses_tool',
        weight: 0.9,
        context: undefined,
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('calls updateEdge mutation with context only', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const mockUpdateEdgeLocal = vi.fn().mockResolvedValue({
        ...mockEdge,
        properties: {
          ...mockEdge.properties,
          context: 'Updated context',
        },
      });

      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 0.8,
          context: 'Updated context',
        });
      });

      expect(mockUpdateEdgeLocal).toHaveBeenCalledWith({
        edgeId: 'edge456',
        relationship: 'uses_tool',
        weight: 0.8,
        context: 'Updated context',
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('calls updateEdge mutation with both weight and context', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const mockUpdateEdgeLocal = vi.fn().mockResolvedValue({
        ...mockEdge,
        weight: 0.9,
        properties: {
          ...mockEdge.properties,
          context: 'Updated context',
        },
      });

      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 0.9,
          context: 'Updated context',
        });
      });

      expect(mockUpdateEdgeLocal).toHaveBeenCalledWith({
        edgeId: 'edge456',
        relationship: 'uses_tool',
        weight: 0.9,
        context: 'Updated context',
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('sets loading state during edge save', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      let resolveSave: () => void;
      const savePromise = new Promise<any>((resolve) => {
        resolveSave = resolve;
      });
      const mockUpdateEdgeLocal = vi.fn().mockReturnValue(savePromise);

      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 0.9,
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSave!();
        await savePromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('closes editor after successful edge save', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const mockUpdateEdgeLocal = vi.fn().mockResolvedValue(mockEdge);
      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 0.9,
        });
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
      });
    });

    it('sets error message on edge save failure', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const mockUpdateEdgeLocal = vi.fn().mockRejectedValue(new Error('Update failed'));
      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 0.9,
        });
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Update failed');
      });
    });

    it('keeps editor open on edge save failure', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const mockUpdateEdgeLocal = vi.fn().mockRejectedValue(new Error('Failed'));
      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 0.9,
        });
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });
    });

    it('validates weight range (0.0 - 1.0)', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const mockUpdateEdgeLocal = vi.fn().mockRejectedValue(new Error('Weight must be between 0.0 and 1.0'));
      (useMutation as any).mockImplementation(() => mockUpdateEdgeLocal);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'edge',
          relationship: 'uses_tool',
          weight: 1.5, // Invalid weight
        });
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Weight must be between 0.0 and 1.0');
      });
    });
  });

  describe('Archive/Delete', () => {
    it('calls archiveNode mutation for nodes', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.archive();
      });

      expect(mockArchiveNode).toHaveBeenCalledWith({
        nodeId: 'node123',
      });
    });

    it('calls deleteEdge mutation for edges', async () => {
      const mockEdge = createMockEdge();
      mockGetEdge.mockReturnValue(mockEdge);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('edge', 'edge456', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.archive();
      });

      expect(mockDeleteEdge).toHaveBeenCalledWith({
        edgeId: 'edge456',
      });
    });

    it('sets loading state during archive', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      let resolveArchive: () => void;
      const archivePromise = new Promise<boolean>((resolve) => {
        resolveArchive = () => resolve(true);
      });
      mockArchiveNode.mockReturnValue(archivePromise);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      act(() => {
        result.current.archive();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveArchive!();
        await archivePromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('closes editor after successful archive', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.archive();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
      });
    });

    it('sets error message on archive failure', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);
      mockArchiveNode.mockRejectedValue(new Error('Archive failed'));

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.archive();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Archive failed');
      });
    });

    it('keeps editor open on archive failure', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);
      mockArchiveNode.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.archive();
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });
    });

    it('throws error when no entity is loaded', async () => {
      const { result } = renderHook(() => useGraphEditor());

      await act(async () => {
        await result.current.archive();
      });

      expect(result.current.error).toBe('No entity to archive');
    });
  });

  describe('Error Handling', () => {
    it('handles null entity gracefully', async () => {
      const { result } = renderHook(() => useGraphEditor());

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'Test',
          nodeType: 'skill',
          description: 'Test',
        });
      });

      expect(result.current.error).toBeTruthy();
    });

    it('handles mutation errors gracefully', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);
      mockUpdateNode.mockRejectedValue(new Error('Mutation error'));

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'Test',
        });
      });

      expect(result.current.error).toBe('Mutation error');
      expect(result.current.isLoading).toBe(false);
    });

    it('handles non-Error exceptions', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);
      mockUpdateNode.mockRejectedValue('String error');

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'Test',
        });
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('State Transitions', () => {
    it('resets error when opening new entity', async () => {
      const mockNode1 = createMockNode({ _id: 'node1' as any });
      const mockNode2 = createMockNode({ _id: 'node2' as any });

      mockGetNode
        .mockReturnValueOnce(mockNode1)
        .mockReturnValueOnce(mockNode2);

      mockUpdateNode.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useGraphEditor());

      // Open first node and fail save
      act(() => {
        result.current.open('node', 'node1', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'Test',
          nodeType: 'skill',
          description: 'Test',
        });
      });

      expect(result.current.error).toBeTruthy();

      // Open second node - error should be cleared
      act(() => {
        result.current.open('node', 'node2', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });
    });

    it('handles rapid open/close cycles', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      // Rapid open/close
      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      act(() => {
        result.current.close();
      });

      act(() => {
        result.current.open('node', 'node123', createMockSourceRect());
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      expect(result.current.entity).toEqual(mockNode);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined entity ID', async () => {
      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', undefined as any, createMockSourceRect());
      });

      // Should not crash, just not open
      expect(result.current.isOpen).toBe(false);
    });

    it('handles invalid entity type', async () => {
      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('invalid' as any, 'id123', createMockSourceRect());
      });

      // Should not crash
      expect(result.current.isOpen).toBe(false);
    });

    it('handles missing sourceRect', async () => {
      const mockNode = createMockNode();
      mockGetNode.mockReturnValue(mockNode);

      const { result } = renderHook(() => useGraphEditor());

      act(() => {
        result.current.open('node', 'node123', null as any);
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      // Should still work, just without animation
      expect(result.current.sourceRect).toBe(null);
    });
  });
});
