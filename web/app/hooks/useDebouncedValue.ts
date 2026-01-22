import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing a value.
 * Returns a debounced version of the input value after the specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebouncedValue(query, 600);
 *
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     performSearch(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancel timeout if value changes before delay elapses
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
