import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MergedResult } from '../components/search/types';

// Mock functions - defined before mock setup
const mockUpdateItem = vi.fn();
const mockDeleteItem = vi.fn();
const mockUpdateNode = vi.fn();
const mockArchiveNode = vi.fn();

// Mock Convex hooks - must be before import
vi.mock('convex/react', () => ({
  useAction: vi.fn(() => mockUpdateItem),
  useMutation: vi.fn((path) => {
    const pathStr = String(path);
    if (pathStr.includes('deleteItem')) return mockDeleteItem;
    if (pathStr.includes('archiveNode')) return mockArchiveNode;
    if (pathStr.includes('updateNode')) return mockUpdateNode;
    return vi.fn();
  }),
}));

// Mock the api import
vi.mock('../../../convex/_generated/api', () => ({
  api: {
    items: {
      updateItem: 'items.updateItem',
      deleteItem: 'items.deleteItem',
    },
    graph: {
      updateNode: 'graph.updateNode',
      archiveNode: 'graph.archiveNode',
    },
  },
}));

// Import after mocks are set up
import { useMemoryEditor } from './useMemoryEditor';
import { useAction, useMutation } from 'convex/react';

/**
 * Test suite for useMemoryEditor hook
 * Tests state management for the float editor
 */
describe('useMemoryEditor', () => {
  // Mock data helpers
  const createMockItemResult = (overrides?: Partial<MergedResult>): MergedResult => ({
    type: 'item',
    content: 'User prefers TypeScript over JavaScript',
    score: 0.85,
    finalScore: 0.85,
    timestamp: Date.now() - 86400000,
    source: 'vector',
    itemId: 'item123',
    category: 'tech_preferences',
    accessCount: 5,
    ...overrides,
  });

  const createMockNodeResult = (overrides?: Partial<MergedResult>): MergedResult => ({
    type: 'node',
    content: 'TypeScript programming language',
    score: 0.78,
    finalScore: 0.78,
    timestamp: Date.now() - 172800000,
    source: 'graph',
    nodeId: 'node456',
    name: 'TypeScript',
    nodeType: 'skill',
    description: 'A strongly typed programming language',
    status: 'active',
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

    // Reset mock implementations
    mockUpdateItem.mockResolvedValue({ _id: 'item123' });
    mockDeleteItem.mockResolvedValue(true);
    mockUpdateNode.mockResolvedValue({ _id: 'node456' });
    mockArchiveNode.mockResolvedValue(true);

    // Reset useAction to return the update functions
    (useAction as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateItem);

    // Reset useMutation to return appropriate mock based on path
    (useMutation as ReturnType<typeof vi.fn>).mockImplementation((path) => {
      const pathStr = String(path);
      if (pathStr.includes('deleteItem')) return mockDeleteItem;
      if (pathStr.includes('archiveNode')) return mockArchiveNode;
      if (pathStr.includes('updateNode')) return mockUpdateNode;
      return vi.fn();
    });
  });

  describe('Initial State', () => {
    it('starts with isOpen=false', () => {
      const { result } = renderHook(() => useMemoryEditor());

      expect(result.current.isOpen).toBe(false);
    });

    it('starts with result=null', () => {
      const { result } = renderHook(() => useMemoryEditor());

      expect(result.current.result).toBeNull();
    });

    it('starts with sourceRect=null', () => {
      const { result } = renderHook(() => useMemoryEditor());

      expect(result.current.sourceRect).toBeNull();
    });

    it('starts with isDirty=false', () => {
      const { result } = renderHook(() => useMemoryEditor());

      expect(result.current.isDirty).toBe(false);
    });

    it('starts with isLoading=false', () => {
      const { result } = renderHook(() => useMemoryEditor());

      expect(result.current.isLoading).toBe(false);
    });

    it('starts with error=null', () => {
      const { result } = renderHook(() => useMemoryEditor());

      expect(result.current.error).toBeNull();
    });
  });

  describe('open()', () => {
    it('sets isOpen to true', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('stores the result', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult({ itemId: 'test-item' });
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      expect(result.current.result).toEqual(mockResult);
    });

    it('stores the sourceRect', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      expect(result.current.sourceRect).toEqual(mockRect);
    });

    it('resets isDirty to false', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      expect(result.current.isDirty).toBe(false);
    });

    it('clears any previous error', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('close()', () => {
    it('sets isOpen to false', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('preserves result for potential re-open', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      act(() => {
        result.current.close();
      });

      // Result is kept for FLIP animation reverse
      expect(result.current.result).not.toBeNull();
    });

    it('resets error state', () => {
      const { result } = renderHook(() => useMemoryEditor());

      act(() => {
        result.current.close();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('save() for Items', () => {
    it('calls updateItem action for items', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult({ itemId: 'item123' });
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'item',
          content: 'Updated content',
          category: 'tech_preferences',
        });
      });

      expect(mockUpdateItem).toHaveBeenCalledWith({
        itemId: 'item123',
        content: 'Updated content',
        category: 'tech_preferences',
      });
    });

    it('sets isLoading during save', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      // Make the mock slow to observe loading state
      let resolvePromise: () => void;
      mockUpdateItem.mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve;
      }));

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      // Start save but don't await yet
      act(() => {
        result.current.save({
          type: 'item',
          content: 'Updated',
          category: 'test',
        });
      });

      // Check loading state immediately
      expect(result.current.isLoading).toBe(true);

      // Resolve and clean up
      await act(async () => {
        resolvePromise!();
      });
    });

    it('clears isLoading after successful save', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'item',
          content: 'Updated',
          category: 'test',
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error on save failure', async () => {
      mockUpdateItem.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'item',
          content: 'Updated',
          category: 'test',
        });
      });

      expect(result.current.error).toBe('Update failed');
    });

    it('closes editor on successful save', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'item',
          content: 'Updated',
          category: 'test',
        });
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('does NOT close editor on save failure', async () => {
      mockUpdateItem.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'item',
          content: 'Updated',
          category: 'test',
        });
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('save() for Nodes', () => {
    it('calls updateNode mutation for nodes', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockNodeResult({ nodeId: 'node456' });
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'Updated Name',
          nodeType: 'tool',
          description: 'Updated description',
        });
      });

      expect(mockUpdateNode).toHaveBeenCalledWith({
        nodeId: 'node456',
        properties: {
          description: 'Updated description',
        },
      });
    });

    it('handles node save errors', async () => {
      mockUpdateNode.mockRejectedValue(new Error('Node update failed'));

      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockNodeResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'node',
          name: 'Updated',
          nodeType: 'tool',
          description: '',
        });
      });

      expect(result.current.error).toBe('Node update failed');
    });
  });

  describe('deleteMemory() for Items', () => {
    it('calls deleteItem mutation for items', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult({ itemId: 'item123' });
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.deleteMemory();
      });

      expect(mockDeleteItem).toHaveBeenCalledWith({
        itemId: 'item123',
      });
    });

    it('sets isLoading during delete', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      let resolvePromise: () => void;
      mockDeleteItem.mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve;
      }));

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      act(() => {
        result.current.deleteMemory();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!();
      });
    });

    it('closes editor on successful delete', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.deleteMemory();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('sets error on delete failure', async () => {
      mockDeleteItem.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.deleteMemory();
      });

      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('deleteMemory() for Nodes', () => {
    it('calls archiveNode mutation for nodes (soft delete)', async () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockNodeResult({ nodeId: 'node456' });
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.deleteMemory();
      });

      expect(mockArchiveNode).toHaveBeenCalledWith({
        nodeId: 'node456',
      });
    });

    it('handles node archive errors', async () => {
      mockArchiveNode.mockRejectedValue(new Error('Archive failed'));

      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockNodeResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.deleteMemory();
      });

      expect(result.current.error).toBe('Archive failed');
    });
  });

  describe('setDirty()', () => {
    it('sets isDirty to true', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      act(() => {
        result.current.setDirty(true);
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('can reset isDirty to false', () => {
      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
        result.current.setDirty(true);
      });

      act(() => {
        result.current.setDirty(false);
      });

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('clearError()', () => {
    it('clears the error state', async () => {
      mockUpdateItem.mockRejectedValue(new Error('Some error'));

      const { result } = renderHook(() => useMemoryEditor());
      const mockResult = createMockItemResult();
      const mockRect = createMockSourceRect();

      act(() => {
        result.current.open(mockResult, mockRect);
      });

      await act(async () => {
        await result.current.save({
          type: 'item',
          content: 'test',
          category: 'test',
        });
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Return type stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => useMemoryEditor());

      const firstRender = {
        open: result.current.open,
        close: result.current.close,
        save: result.current.save,
        deleteMemory: result.current.deleteMemory,
      };

      rerender();

      // Functions should be memoized
      expect(result.current.open).toBe(firstRender.open);
      expect(result.current.close).toBe(firstRender.close);
      expect(result.current.save).toBe(firstRender.save);
      expect(result.current.deleteMemory).toBe(firstRender.deleteMemory);
    });
  });
});
