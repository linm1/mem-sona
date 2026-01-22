import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { HybridSearchResult, MergedResult } from '../components/search/types';

/**
 * Custom hook for performing hybrid memory search.
 * Wraps Convex hybridSearch action with loading/error states.
 *
 * @returns Search state and search function
 *
 * @example
 * ```tsx
 * const { results, isLoading, error, search } = useHybridSearch();
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
export function useHybridSearch() {
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

      // Update state with results
      setResults(result.results);
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
