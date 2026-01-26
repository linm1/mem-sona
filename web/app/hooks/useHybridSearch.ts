import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { HybridSearchResult, MergedResult } from '../components/search/types';

/**
 * Options for useHybridSearch hook
 */
export interface UseHybridSearchOptions {
  /**
   * When true, only return results with source: "hybrid"
   * These are results that appeared in both vector and text search,
   * indicating higher quality/relevance.
   * @default true
   */
  hybridOnly?: boolean;
}

/**
 * Custom hook for performing hybrid memory search.
 * Wraps Convex hybridSearch action with loading/error states.
 *
 * @param options - Hook options
 * @param options.hybridOnly - When true, only return hybrid source results
 * @returns Search state and search function
 *
 * @example
 * ```tsx
 * // Default: return hybrid-only results (higher quality)
 * const { results, isLoading, error, search } = useHybridSearch();
 *
 * // Return all results (including vector-only and text-only)
 * const { results, isLoading, error, search } = useHybridSearch({ hybridOnly: false });
 *
 * // Trigger search
 * await search('What tools does mem-sona use?', 2000);
 *
 * // Display results
 * {isLoading && <LoadingState />}
 * {error && <ErrorState message={error} />}
 * {results.length > 0 && <MemoryList results={results} />}
 * ```
 */
export function useHybridSearch(options: UseHybridSearchOptions = {}) {
  const { hybridOnly = true } = options;
  const [results, setResults] = useState<MergedResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<string>('');
  const [executionTime, setExecutionTime] = useState<number>(0);

  // Get the hybridSearch action from Convex
  const hybridSearchAction = useAction(api.retrieval.hybridSearch);

  /**
   * Perform hybrid search query.
   *
   * @param query - Search query string
   * @param maxTokens - Maximum tokens for context window (default: 2000)
   */
  const search = async (query: string, maxTokens: number = 2000): Promise<void> => {
    // Don't search if query is empty
    if (!query.trim()) {
      setResults([]);
      setContext('');
      setExecutionTime(0);
      return;
    }

    // Set loading state
    setIsLoading(true);
    setError(null);

    try {
      // Call Convex action
      const result: HybridSearchResult = await hybridSearchAction({
        query,
        maxTokens,
      });

      // Filter results if hybridOnly is enabled
      const filteredResults = hybridOnly
        ? result.results.filter((r) => r.source === 'hybrid')
        : result.results;

      // Update state with results
      setResults(filteredResults);
      setContext(result.context);
      setExecutionTime(result.executionTime);
      setError(null);
    } catch (err) {
      // Handle errors
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setResults([]);
      setContext('');
      setExecutionTime(0);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    results,
    isLoading,
    error,
    context,
    executionTime,
    search,
  };
}
