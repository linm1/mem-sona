'use client';

import { useCallback, useState } from 'react';
import { useHybridSearch, useMemoryEditor } from '@/app/hooks';
import {
  HybridSearchInput,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/app/components/search';
import {
  MemoryGrid,
  MemoryEditorFloat,
  EditableData,
} from '@/app/components/explorer';
import { MergedResult } from '@/app/components/search/types';

/**
 * Memory Explorer Page
 * Main search interface for exploring stored memories.
 *
 * Features:
 * - Real-time hybrid search (vector + graph)
 * - 3x3 responsive grid layout for results
 * - FLIP-animated float editor for editing memories
 * - Debounced input for performance
 * - Loading/error/empty states
 */
export default function MemoryExplorerPage() {
  const { results, isLoading, error, executionTime, search } = useHybridSearch();
  const editor = useMemoryEditor();
  const [lastQuery, setLastQuery] = useState('');

  const handleSearch = useCallback(async (query: string) => {
    setLastQuery(query);
    await search(query, 2000);
  }, [search]);

  const handleRetry = useCallback(async () => {
    await search(lastQuery, 2000);
  }, [search, lastQuery]);

  const handleCardClick = useCallback((result: MergedResult, rect: DOMRect) => {
    editor.open(result, rect);
  }, [editor]);

  const handleSave = useCallback(async (data: EditableData) => {
    await editor.save(data);
    // Refresh results after save
    if (lastQuery) {
      await search(lastQuery, 2000);
    }
  }, [editor, lastQuery, search]);

  const handleDelete = useCallback(async () => {
    await editor.deleteMemory();
    // Refresh results after delete
    if (lastQuery) {
      await search(lastQuery, 2000);
    }
  }, [editor, lastQuery, search]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
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
            <EmptyState query={lastQuery} />
          )}

          {/* Results Grid */}
          {!isLoading && !error && results.length > 0 && (
            <MemoryGrid
              results={results}
              onCardClick={handleCardClick}
              executionTime={executionTime}
            />
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

      {/* Float Editor */}
      <MemoryEditorFloat
        isOpen={editor.isOpen}
        result={editor.result}
        sourceRect={editor.sourceRect}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={editor.close}
      />
    </div>
  );
}
