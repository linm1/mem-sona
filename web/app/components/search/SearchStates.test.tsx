import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoadingState, ErrorState, EmptyState } from './SearchStates';

describe('LoadingState', () => {
  it('renders loading spinner', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays loading message', () => {
    render(<LoadingState />);

    expect(screen.getByText(/searching memories/i)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingState />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });
});

describe('ErrorState', () => {
  const mockOnRetry = vi.fn();

  it('renders error message', () => {
    render(<ErrorState message="Search failed" onRetry={mockOnRetry} />);

    expect(screen.getByText(/search failed/i)).toBeInTheDocument();
  });

  it('displays default error message when not provided', () => {
    render(<ErrorState onRetry={mockOnRetry} />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('renders retry button', () => {
    render(<ErrorState message="Error" onRetry={mockOnRetry} />);

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    render(<ErrorState message="Error" onRetry={mockOnRetry} />);

    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('displays error icon', () => {
    render(<ErrorState message="Error" onRetry={mockOnRetry} />);

    const errorIcon = screen.getByRole('img', { hidden: true });
    expect(errorIcon).toBeInTheDocument();
  });

  it('applies danger styling', () => {
    const { container } = render(<ErrorState message="Error" onRetry={mockOnRetry} />);

    expect(container.querySelector('.text-danger')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ErrorState message="Error" onRetry={mockOnRetry} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders empty state message', () => {
    render(<EmptyState query="" />);

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('displays the search query in message', () => {
    render(<EmptyState query="test query" />);

    expect(screen.getByText(/test query/i)).toBeInTheDocument();
  });

  it('shows helpful suggestions', () => {
    render(<EmptyState query="" />);

    expect(screen.getByText(/try different keywords/i)).toBeInTheDocument();
  });

  it('displays empty state icon', () => {
    render(<EmptyState query="" />);

    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toBeInTheDocument();
  });

  it('renders when query is empty string', () => {
    render(<EmptyState query="" />);

    expect(screen.getByText(/start typing to search/i)).toBeInTheDocument();
  });

  it('renders when query has results but is filtered to zero', () => {
    render(<EmptyState query="specific term" />);

    expect(screen.getByText(/no results found for "specific term"/i)).toBeInTheDocument();
  });

  it('applies muted text styling', () => {
    const { container } = render(<EmptyState query="" />);

    expect(container.querySelector('.text-muted')).toBeInTheDocument();
  });

  it('shows suggestion list', () => {
    render(<EmptyState query="" />);

    // Check for bullet points or suggestion items
    expect(screen.getByText(/check your spelling/i)).toBeInTheDocument();
    expect(screen.getByText(/try more general terms/i)).toBeInTheDocument();
  });
});
