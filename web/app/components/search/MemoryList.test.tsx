import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryList } from './MemoryList';
import { MergedResult } from './types';

describe('MemoryList', () => {
  const mockResults: MergedResult[] = [
    {
      type: 'item',
      content: 'First memory item',
      score: 0.95,
      finalScore: 0.9,
      timestamp: Date.now(),
      source: 'vector',
    },
    {
      type: 'node',
      content: 'Second memory node',
      score: 0.85,
      finalScore: 0.8,
      timestamp: Date.now() - 86400000, // 1 day ago
      source: 'graph',
    },
    {
      type: 'item',
      content: 'Third memory from both sources',
      score: 0.92,
      finalScore: 0.88,
      timestamp: Date.now() - 3600000, // 1 hour ago
      source: 'hybrid',
    },
  ];

  it('renders list of memory results', () => {
    render(<MemoryList results={mockResults} />);

    expect(screen.getByText('First memory item')).toBeInTheDocument();
    expect(screen.getByText('Second memory node')).toBeInTheDocument();
    expect(screen.getByText('Third memory from both sources')).toBeInTheDocument();
  });

  it('displays result type badges', () => {
    render(<MemoryList results={mockResults} />);

    const itemBadges = screen.getAllByText('item');
    const nodeBadges = screen.getAllByText('node');

    expect(itemBadges.length).toBeGreaterThan(0);
    expect(nodeBadges.length).toBeGreaterThan(0);
  });

  it('displays source badges', () => {
    render(<MemoryList results={mockResults} />);

    expect(screen.getAllByText('vector').length).toBeGreaterThan(0);
    expect(screen.getAllByText('graph').length).toBeGreaterThan(0);
    expect(screen.getAllByText('hybrid').length).toBeGreaterThan(0);
  });

  it('displays final scores', () => {
    render(<MemoryList results={mockResults} />);

    expect(screen.getByText(/0\.90/)).toBeInTheDocument();
    expect(screen.getByText(/0\.80/)).toBeInTheDocument();
    expect(screen.getByText(/0\.88/)).toBeInTheDocument();
  });

  it('displays timestamps in human-readable format', () => {
    render(<MemoryList results={mockResults} />);

    // Should show relative time (just now, 1 day ago, etc.)
    expect(screen.getByText(/just now|seconds ago/i)).toBeInTheDocument();
    expect(screen.getByText(/day ago/i)).toBeInTheDocument();
    expect(screen.getByText(/hour ago/i)).toBeInTheDocument();
  });

  it('renders empty state when no results', () => {
    render(<MemoryList results={[]} />);

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('applies different styles for different score levels', () => {
    const resultsWithVariedScores: MergedResult[] = [
      {
        type: 'item',
        content: 'High score',
        score: 0.95,
        finalScore: 0.9,
        timestamp: Date.now(),
        source: 'vector',
      },
      {
        type: 'item',
        content: 'Medium score',
        score: 0.7,
        finalScore: 0.65,
        timestamp: Date.now(),
        source: 'vector',
      },
      {
        type: 'item',
        content: 'Low score',
        score: 0.4,
        finalScore: 0.35,
        timestamp: Date.now(),
        source: 'vector',
      },
    ];

    const { container } = render(<MemoryList results={resultsWithVariedScores} />);

    // Check for score intensity classes
    const highScoreElement = container.querySelector('.score-high');
    const mediumScoreElement = container.querySelector('.score-medium');
    const lowScoreElement = container.querySelector('.score-low');

    expect(highScoreElement).toBeInTheDocument();
    expect(mediumScoreElement).toBeInTheDocument();
    expect(lowScoreElement).toBeInTheDocument();
  });

  it('renders multiline content correctly', () => {
    const multilineResults: MergedResult[] = [
      {
        type: 'node',
        content: 'project: mem-sona\nDescription: Personal memory infrastructure\nRelationships:\n  - uses: Convex',
        score: 0.9,
        finalScore: 0.85,
        timestamp: Date.now(),
        source: 'graph',
      },
    ];

    render(<MemoryList results={multilineResults} />);

    expect(screen.getByText(/project: mem-sona/i)).toBeInTheDocument();
    expect(screen.getByText(/Convex/i)).toBeInTheDocument();
  });

  it('applies neo-brutalist card styling', () => {
    const { container } = render(<MemoryList results={mockResults} />);

    const cards = container.querySelectorAll('.card-brutal');
    expect(cards.length).toBe(mockResults.length);
  });

  it('handles single result', () => {
    const singleResult: MergedResult[] = [mockResults[0]];

    render(<MemoryList results={singleResult} />);

    expect(screen.getByText('First memory item')).toBeInTheDocument();
    expect(screen.queryByText('Second memory node')).not.toBeInTheDocument();
  });

  it('renders results in order provided', () => {
    const { container } = render(<MemoryList results={mockResults} />);

    const items = container.querySelectorAll('.card-brutal');

    // Check order by verifying content
    expect(items[0]).toHaveTextContent('First memory item');
    expect(items[1]).toHaveTextContent('Second memory node');
    expect(items[2]).toHaveTextContent('Third memory from both sources');
  });

  it('handles long content gracefully', () => {
    const longContentResult: MergedResult[] = [
      {
        type: 'item',
        content: 'A'.repeat(1000), // Very long content
        score: 0.9,
        finalScore: 0.85,
        timestamp: Date.now(),
        source: 'vector',
      },
    ];

    const { container } = render(<MemoryList results={longContentResult} />);

    // Should not break layout
    expect(container.querySelector('.card-brutal')).toBeInTheDocument();
  });

  it('displays result count', () => {
    render(<MemoryList results={mockResults} />);

    expect(screen.getByText(`${mockResults.length} results`)).toBeInTheDocument();
  });

  it('shows execution time when provided', () => {
    render(<MemoryList results={mockResults} executionTime={250} />);

    expect(screen.getByText(/250ms/i)).toBeInTheDocument();
  });
});
