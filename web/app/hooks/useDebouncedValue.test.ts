import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('does not update value before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Update the value
    rerender({ value: 'updated', delay: 500 });

    // Fast-forward time by 400ms (less than delay)
    vi.advanceTimersByTime(400);

    // Should still be initial value
    expect(result.current).toBe('initial');
  });

  it('updates value after delay elapses', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Update the value
    act(() => {
      rerender({ value: 'updated', delay: 500 });
    });

    // Fast-forward time by 500ms and run pending timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current).toBe('updated');
  });

  it('cancels previous timeout when value changes quickly', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // First update
    act(() => {
      rerender({ value: 'first', delay: 500 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // Second update before first completes
    act(() => {
      rerender({ value: 'second', delay: 500 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Should only update to 'second', not 'first'
    expect(result.current).toBe('second');
  });

  it('works with different types (number)', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    );

    act(() => {
      rerender({ value: 42, delay: 300 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current).toBe(42);
  });

  it('works with different types (object)', async () => {
    const initialObj = { query: 'test' };
    const updatedObj = { query: 'updated' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: initialObj, delay: 300 } }
    );

    act(() => {
      rerender({ value: updatedObj, delay: 300 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current).toEqual(updatedObj);
  });

  it('handles empty string', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    act(() => {
      rerender({ value: '', delay: 500 });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current).toBe('');
  });

  it('handles delay of 0', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    );

    act(() => {
      rerender({ value: 'instant', delay: 0 });
    });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current).toBe('instant');
  });
});
