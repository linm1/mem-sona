'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * Props for HybridSearchInput component
 */
interface HybridSearchInputProps {
  onSearch: (query: string) => void;
  debounceMs?: number;
}

/**
 * Search input component with debounced query handling.
 * Features:
 * - Real-time debounced search
 * - Clear button when input has value
 * - Search icon
 * - Neo-brutalist styling
 *
 * @example
 * ```tsx
 * <HybridSearchInput
 *   onSearch={(query) => search(query)}
 *   debounceMs={600}
 * />
 * ```
 */
export function HybridSearchInput({
  onSearch,
  debounceMs = 600,
}: HybridSearchInputProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const isInitialMount = useRef(true);

  // Trigger search when debounced query changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="relative w-full">
      {/* Search Icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <svg
          role="img"
          aria-hidden="true"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input Field */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memories..."
        aria-label="Search memories"
        className="input-brutal w-full pl-12 pr-12 py-3"
      />

      {/* Clear Button */}
      {query && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
