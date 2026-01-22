import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHybridSearch } from './useHybridSearch';
import { useAction } from 'convex/react';

// Mock Convex useAction hook
vi.mock('convex/react', () => ({
  useAction: vi.fn(),
}));

describe('useHybridSearch', () => {
  const mockSearchAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAction as any).mockReturnValue(mockSearchAction);
  });

  it('returns initial state with no results', () => {
    const { result } = renderHook(() => useHybridSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.context).toBe('');
    expect(result.current.executionTime).toBe(0);
  });

  it('sets loading state when search is triggered', async () => {
    mockSearchAction.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useHybridSearch());

    // Trigger search
    result.current.search('test query');

    // Should be loading immediately
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns results on successful search', async () => {
    const mockResults = {
      query: 'test query',
      results: [
        {
          type: 'item' as const,
          content: 'Test content',
          score: 0.9,
          finalScore: 0.85,
          timestamp: Date.now(),
          source: 'vector' as const,
        },
      ],
      context: '# Memory Search Results',
      executionTime: 150,
    };

    mockSearchAction.mockResolvedValue(mockResults);

    const { result } = renderHook(() => useHybridSearch());

    // Trigger search
    await result.current.search('test query');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.results).toEqual(mockResults.results);
      expect(result.current.context).toBe(mockResults.context);
      expect(result.current.executionTime).toBe(mockResults.executionTime);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles search errors gracefully', async () => {
    const mockError = new Error('Search failed');
    mockSearchAction.mockRejectedValue(mockError);

    const { result } = renderHook(() => useHybridSearch());

    // Trigger search
    await result.current.search('test query');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.results).toEqual([]);
      expect(result.current.error).toBe('Search failed');
    });
  });

  it('handles empty query', async () => {
    const { result } = renderHook(() => useHybridSearch());

    await result.current.search('');

    // Should not call the action
    expect(mockSearchAction).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('passes maxTokens parameter to action', async () => {
    mockSearchAction.mockResolvedValue({
      query: 'test',
      results: [],
      context: '',
      executionTime: 0,
    });

    const { result } = renderHook(() => useHybridSearch());

    await result.current.search('test query', 3000);

    expect(mockSearchAction).toHaveBeenCalledWith({
      query: 'test query',
      maxTokens: 3000,
    });
  });

  it('uses default maxTokens when not provided', async () => {
    mockSearchAction.mockResolvedValue({
      query: 'test',
      results: [],
      context: '',
      executionTime: 0,
    });

    const { result } = renderHook(() => useHybridSearch());

    await result.current.search('test query');

    expect(mockSearchAction).toHaveBeenCalledWith({
      query: 'test query',
      maxTokens: 2000,
    });
  });

  it('clears previous results when new search starts', async () => {
    const firstResults = {
      query: 'first',
      results: [
        {
          type: 'item' as const,
          content: 'First result',
          score: 0.9,
          finalScore: 0.85,
          timestamp: Date.now(),
          source: 'vector' as const,
        },
      ],
      context: 'First context',
      executionTime: 100,
    };

    const secondResults = {
      query: 'second',
      results: [
        {
          type: 'node' as const,
          content: 'Second result',
          score: 0.8,
          finalScore: 0.75,
          timestamp: Date.now(),
          source: 'graph' as const,
        },
      ],
      context: 'Second context',
      executionTime: 120,
    };

    mockSearchAction
      .mockResolvedValueOnce(firstResults)
      .mockResolvedValueOnce(secondResults);

    const { result } = renderHook(() => useHybridSearch());

    // First search
    await result.current.search('first');

    await waitFor(() => {
      expect(result.current.results).toEqual(firstResults.results);
    });

    // Second search
    await result.current.search('second');

    await waitFor(() => {
      expect(result.current.results).toEqual(secondResults.results);
      expect(result.current.context).toBe(secondResults.context);
    });
  });

  it('handles concurrent searches correctly', async () => {
    const slowResult = {
      query: 'slow',
      results: [
        {
          type: 'item' as const,
          content: 'Slow result',
          score: 0.9,
          finalScore: 0.85,
          timestamp: Date.now(),
          source: 'vector' as const,
        },
      ],
      context: 'Slow context',
      executionTime: 500,
    };

    const fastResult = {
      query: 'fast',
      results: [
        {
          type: 'item' as const,
          content: 'Fast result',
          score: 0.95,
          finalScore: 0.9,
          timestamp: Date.now(),
          source: 'vector' as const,
        },
      ],
      context: 'Fast context',
      executionTime: 50,
    };

    mockSearchAction
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(slowResult), 500)))
      .mockResolvedValueOnce(fastResult);

    const { result } = renderHook(() => useHybridSearch());

    // Start slow search
    const slowPromise = result.current.search('slow');

    // Start fast search immediately after
    const fastPromise = result.current.search('fast');

    // Wait for both to complete
    await Promise.all([slowPromise, fastPromise]);

    await waitFor(() => {
      // Should show fast results (most recent search)
      expect(result.current.results).toEqual(fastResult.results);
    });
  });
});
