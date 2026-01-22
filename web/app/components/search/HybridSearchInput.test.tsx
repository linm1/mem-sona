import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridSearchInput } from './HybridSearchInput';
import userEvent from '@testing-library/user-event';

describe('HybridSearchInput', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<HybridSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/search memories/i);
    expect(input).toBeInTheDocument();
  });

  it('renders search icon', () => {
    render(<HybridSearchInput onSearch={mockOnSearch} />);

    const searchIcon = screen.getByRole('img', { hidden: true });
    expect(searchIcon).toBeInTheDocument();
  });

  it('calls onSearch with debounced value', async () => {
    vi.useFakeTimers();

    render(<HybridSearchInput onSearch={mockOnSearch} debounceMs={500} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    // Type into input
    act(() => {
      fireEvent.change(input, { target: { value: 'test query' } });
    });

    // Should not call immediately
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Fast-forward past debounce delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
    expect(mockOnSearch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('cancels previous debounce when typing quickly', async () => {
    vi.useFakeTimers();

    render(<HybridSearchInput onSearch={mockOnSearch} debounceMs={500} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    // Type first query
    act(() => {
      fireEvent.change(input, { target: { value: 'first' } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // Type second query before debounce completes
    act(() => {
      fireEvent.change(input, { target: { value: 'second' } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Should only call with final value
    expect(mockOnSearch).toHaveBeenCalledWith('second');
    expect(mockOnSearch).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('shows clear button when input has value', () => {
    render(<HybridSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    // Initially no clear button
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();

    // Type into input
    fireEvent.change(input, { target: { value: 'test' } });

    // Clear button should appear
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    vi.useFakeTimers();

    render(<HybridSearchInput onSearch={mockOnSearch} debounceMs={500} />);

    const input = screen.getByPlaceholderText(/search memories/i) as HTMLInputElement;

    // Type into input
    act(() => {
      fireEvent.change(input, { target: { value: 'test query' } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Wait for onSearch to be called
    expect(mockOnSearch).toHaveBeenCalledWith('test query');

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /clear/i });
    act(() => {
      fireEvent.click(clearButton);
    });

    // Input should be cleared
    expect(input.value).toBe('');

    // Should call onSearch with empty string
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(mockOnSearch).toHaveBeenCalledWith('');

    vi.useRealTimers();
  });

  it('applies custom debounce delay', async () => {
    vi.useFakeTimers();

    render(<HybridSearchInput onSearch={mockOnSearch} debounceMs={1000} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    act(() => {
      fireEvent.change(input, { target: { value: 'custom delay' } });
    });

    // Should not call after 500ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Should call after 1000ms total
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(mockOnSearch).toHaveBeenCalledWith('custom delay');

    vi.useRealTimers();
  });

  it('uses default debounce of 600ms', async () => {
    vi.useFakeTimers();

    render(<HybridSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    act(() => {
      fireEvent.change(input, { target: { value: 'default' } });
    });

    // Should not call after 500ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(mockOnSearch).not.toHaveBeenCalled();

    // Should call after 600ms total
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(mockOnSearch).toHaveBeenCalledWith('default');

    vi.useRealTimers();
  });

  it('handles empty input gracefully', async () => {
    vi.useFakeTimers();

    render(<HybridSearchInput onSearch={mockOnSearch} debounceMs={500} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    // Type first to trigger a non-initial state
    act(() => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    // Wait for debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Clear the mock to focus on the next call
    mockOnSearch.mockClear();

    // Now clear the input
    act(() => {
      fireEvent.change(input, { target: { value: '' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(mockOnSearch).toHaveBeenCalledWith('');

    vi.useRealTimers();
  });

  it('has proper accessibility attributes', () => {
    render(<HybridSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('aria-label', 'Search memories');
  });

  it('applies brutal styling classes', () => {
    render(<HybridSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    expect(input.className).toContain('input-brutal');
  });

  it('focuses input when clicked', async () => {
    const user = userEvent.setup();

    render(<HybridSearchInput onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/search memories/i);

    // Use userEvent to click which properly focuses
    await user.click(input);

    expect(input).toHaveFocus();
  });
});
