'use client';

import { useHybridSearch } from '@/hooks';
import {
  HybridSearchInput,
  MemoryList,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/search';

/**
 * Memory Explorer Page
 * Main search interface for exploring stored memories.
 *
 * Features:
 * - Real-time hybrid search (vector + graph)
 * - Debounced input for performance
 * - Loading/error/empty states
 * - Result list with scores and timestamps
 */
export default function MemoryExplorerPage() {
  const { results, isLoading, error, executionTime, search } = useHybridSearch();

  const handleSearch = async (query: string) => {
    await search(query, 2000);
  };

  const handleRetry = async () => {
    // Retry last search (would need to track last query)
    await search('', 2000);
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-4">
          <h1 className="font-mono-brutal text-4xl">
            Memory Explorer
          </h1>
          <p className="text-body text-muted">
            Search your memories using hybrid semantic and graph-based retrieval
          </p>
        </header>

        {/* Search Input */}
        <div className="card-brutal p-6">
          <HybridSearchInput
            onSearch={handleSearch}
            debounceMs={600}
          />
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && <LoadingState />}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorState message={error} onRetry={handleRetry} />
          )}

          {/* Empty State */}
          {!isLoading && !error && results.length === 0 && (
            <EmptyState query="" />
          )}

          {/* Results List */}
          {!isLoading && !error && results.length > 0 && (
            <MemoryList results={results} executionTime={executionTime} />
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-muted space-y-1">
          <p>
            Powered by Convex, voyage-4 embeddings, and RRF fusion
          </p>
          <p>
            Results ranked by relevance with 30-day time-decay
          </p>
        </footer>
      </div>
    </div>
  );
}
