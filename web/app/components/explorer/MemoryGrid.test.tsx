import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryGrid } from './MemoryGrid';
import { MergedResult } from '../search/types';

/**
 * Test suite for MemoryGrid component
 * Tests layout, rendering, and callback handling
 */
describe('MemoryGrid', () => {
  // Mock data helpers
  const createMockResult = (id: string, type: 'item' | 'node' = 'item'): MergedResult => ({
    type,
    content: `Content for ${id}`,
    score: 0.85,
    finalScore: 0.85,
    timestamp: Date.now() - 86400000,
    source: type === 'item' ? 'vector' : 'graph',
    itemId: type === 'item' ? id : undefined,
    nodeId: type === 'node' ? id : undefined,
    category: type === 'item' ? 'tech_preferences' : undefined,
    name: type === 'node' ? `Node ${id}` : undefined,
    nodeType: type === 'node' ? 'skill' : undefined,
  });

  const createMockResults = (count: number): MergedResult[] =>
    Array.from({ length: count }, (_, i) => createMockResult(`result-${i}`, i % 2 === 0 ? 'item' : 'node'));

  describe('Layout', () => {
    it('renders 3-column grid on large screens', () => {
      const results = createMockResults(9);
      const handleCardClick = vi.fn();

      const { container } = render(
        <MemoryGrid results={results} onCardClick={handleCardClick} />
      );

      const grid = container.querySelector('[data-testid="memory-grid"]');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('renders 2-column grid on medium screens', () => {
      const results = createMockResults(6);
      const handleCardClick = vi.fn();

      const { container } = render(
        <MemoryGrid results={results} onCardClick={handleCardClick} />
      );

      const grid = container.querySelector('[data-testid="memory-grid"]');
      expect(grid).toHaveClass('md:grid-cols-2');
    });

    it('renders 1-column grid on small screens', () => {
      const results = createMockResults(3);
      const handleCardClick = vi.fn();

      const { container } = render(
        <MemoryGrid results={results} onCardClick={handleCardClick} />
      );

      const grid = container.querySelector('[data-testid="memory-grid"]');
      expect(grid).toHaveClass('grid-cols-1');
    });

    it('applies correct gap spacing', () => {
      const results = createMockResults(4);
      const handleCardClick = vi.fn();

      const { container } = render(
        <MemoryGrid results={results} onCardClick={handleCardClick} />
      );

      const grid = container.querySelector('[data-testid="memory-grid"]');
      expect(grid).toHaveClass('gap-4');
    });
  });

  describe('Rendering', () => {
    it('renders MemoryGridCard for each result', () => {
      const results = createMockResults(6);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const cards = screen.getAllByTestId('memory-grid-card');
      expect(cards).toHaveLength(6);
    });

    it('handles empty results array', () => {
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={[]} onCardClick={handleCardClick} />);

      // Should render empty state message
      expect(screen.getByText(/no memories/i)).toBeInTheDocument();
    });

    it('renders mixed items and nodes', () => {
      const results = [
        createMockResult('item1', 'item'),
        createMockResult('node1', 'node'),
        createMockResult('item2', 'item'),
      ];
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const cards = screen.getAllByTestId('memory-grid-card');
      expect(cards).toHaveLength(3);

      // Verify both types are rendered
      expect(screen.getAllByText('item')).toHaveLength(2);
      expect(screen.getByText('node')).toBeInTheDocument();
    });
  });

  describe('Callback Handling', () => {
    it('passes onCardClick callback to each card', () => {
      const results = createMockResults(3);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const cards = screen.getAllByTestId('memory-grid-card');
      fireEvent.click(cards[0]);

      expect(handleCardClick).toHaveBeenCalledTimes(1);
      expect(handleCardClick).toHaveBeenCalledWith(
        results[0],
        expect.any(Object) // DOMRect
      );
    });

    it('passes correct result to callback when card clicked', () => {
      const results = createMockResults(3);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const cards = screen.getAllByTestId('memory-grid-card');
      fireEvent.click(cards[1]); // Click second card

      expect(handleCardClick).toHaveBeenCalledWith(
        results[1],
        expect.any(Object)
      );
    });

    it('passes DOMRect to callback for FLIP animation', () => {
      const results = createMockResults(1);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const card = screen.getByTestId('memory-grid-card');
      fireEvent.click(card);

      const [, rect] = handleCardClick.mock.calls[0];
      // DOMRect has these properties
      expect(rect).toHaveProperty('x');
      expect(rect).toHaveProperty('y');
      expect(rect).toHaveProperty('width');
      expect(rect).toHaveProperty('height');
    });
  });

  describe('Accessibility', () => {
    it('has grid role', () => {
      const results = createMockResults(4);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });

    it('has proper aria-label', () => {
      const results = createMockResults(4);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', 'Memory results');
    });

    it('cards are keyboard navigable', () => {
      const results = createMockResults(3);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      const cards = screen.getAllByRole('button');
      expect(cards).toHaveLength(3);
      cards.forEach(card => {
        expect(card).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Execution Time Display', () => {
    it('displays execution time when provided', () => {
      const results = createMockResults(4);
      const handleCardClick = vi.fn();

      render(
        <MemoryGrid
          results={results}
          onCardClick={handleCardClick}
          executionTime={125}
        />
      );

      expect(screen.getByText(/125ms/)).toBeInTheDocument();
    });

    it('hides execution time when not provided', () => {
      const results = createMockResults(4);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      expect(screen.queryByText(/ms$/)).not.toBeInTheDocument();
    });
  });

  describe('Results Count', () => {
    it('displays number of results', () => {
      const results = createMockResults(9);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      expect(screen.getByText(/9 results/)).toBeInTheDocument();
    });

    it('displays singular "result" for single result', () => {
      const results = createMockResults(1);
      const handleCardClick = vi.fn();

      render(<MemoryGrid results={results} onCardClick={handleCardClick} />);

      expect(screen.getByText(/1 result$/)).toBeInTheDocument();
    });
  });
});
