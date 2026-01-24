import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryGridCard } from './MemoryGridCard';
import { MergedResult } from '../search/types';

/**
 * Test suite for MemoryGridCard component
 * Tests display for both Items and Nodes, click handling, and styling
 */
describe('MemoryGridCard', () => {
  // Mock data helpers
  const createMockItemResult = (overrides?: Partial<MergedResult>): MergedResult => ({
    type: 'item',
    content: 'User prefers TypeScript over JavaScript',
    score: 0.85,
    finalScore: 0.85,
    timestamp: Date.now() - 86400000, // 1 day ago
    source: 'vector',
    itemId: 'item123',
    category: 'tech_preferences',
    accessCount: 5,
    ...overrides,
  });

  const createMockNodeResult = (overrides?: Partial<MergedResult>): MergedResult => ({
    type: 'node',
    content: 'TypeScript programming language', // For nodes, content is generated context
    score: 0.78,
    finalScore: 0.78,
    timestamp: Date.now() - 172800000, // 2 days ago
    source: 'graph',
    nodeId: 'node456',
    name: 'TypeScript',
    nodeType: 'skill',
    description: 'A strongly typed programming language that builds on JavaScript',
    status: 'active',
    ...overrides,
  });

  describe('Item Display', () => {
    it('displays truncated content for items', () => {
      const result = createMockItemResult({
        content: 'User prefers TypeScript over JavaScript for all new projects',
      });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText(/User prefers TypeScript/)).toBeInTheDocument();
    });

    it('shows category badge for items', () => {
      const result = createMockItemResult({ category: 'tech_preferences' });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('tech_preferences')).toBeInTheDocument();
    });

    it('displays score and timestamp', () => {
      const result = createMockItemResult({
        finalScore: 0.85,
        timestamp: Date.now() - 86400000, // 1 day ago
      });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText(/0\.85/)).toBeInTheDocument();
      expect(screen.getByText(/1 day ago/)).toBeInTheDocument();
    });

    it('shows item type badge', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('item')).toBeInTheDocument();
    });

    it('displays accessCount when present', () => {
      const result = createMockItemResult({ accessCount: 5 });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText(/5x/)).toBeInTheDocument();
    });
  });

  describe('Node Display', () => {
    it('displays node name for graph nodes', () => {
      const result = createMockNodeResult({ name: 'TypeScript' });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('shows type badge (project/tool/skill/concept)', () => {
      const result = createMockNodeResult({ nodeType: 'skill' });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('skill')).toBeInTheDocument();
    });

    it('displays description preview if available', () => {
      const result = createMockNodeResult({
        description: 'A strongly typed programming language that builds on JavaScript',
      });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText(/strongly typed programming language/)).toBeInTheDocument();
    });

    it('shows node type badge', () => {
      const result = createMockNodeResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('node')).toBeInTheDocument();
    });

    it('handles node without description', () => {
      const result = createMockNodeResult({ description: undefined });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      // Should still render without crashing
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('displays different badge colors for different node types', () => {
      const projectResult = createMockNodeResult({ nodeType: 'project' });
      const handleClick = vi.fn();

      const { rerender } = render(<MemoryGridCard result={projectResult} onClick={handleClick} />);
      expect(screen.getByText('project')).toBeInTheDocument();

      const skillResult = createMockNodeResult({ nodeType: 'skill' });
      rerender(<MemoryGridCard result={skillResult} onClick={handleClick} />);
      expect(screen.getByText('skill')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('calls onClick with DOMRect when clicked', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object)); // DOMRect
    });

    it('has cursor-pointer styling', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('supports keyboard activation (Enter key)', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard activation (Space key)', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      fireEvent.keyDown(card, { key: ' ' });

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has proper tabIndex for keyboard navigation', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('has button role for accessibility', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('uses card-brutal styling', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      expect(card).toHaveClass('card-brutal');
    });

    it('has consistent height via min-h constraint', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      // Should have minimum height for consistent grid layout
      expect(card).toHaveClass('min-h-[180px]');
    });

    it('truncates long content appropriately', () => {
      const longContent = 'A'.repeat(500);
      const result = createMockItemResult({ content: longContent });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      // Content should be truncated with line-clamp - find all matching elements
      const contentElements = screen.getAllByText(/A+/);
      // At least one should have line-clamp-3
      const hasLineClamp = contentElements.some(el => el.classList.contains('line-clamp-3'));
      expect(hasLineClamp).toBe(true);
    });

    it('has hover effect (hover-brutal)', () => {
      const result = createMockItemResult();
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      const card = screen.getByTestId('memory-grid-card');
      expect(card.className).toMatch(/card-brutal/);
    });
  });

  describe('Source Badge', () => {
    it('shows vector badge for vector source', () => {
      const result = createMockItemResult({ source: 'vector' });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('vector')).toBeInTheDocument();
    });

    it('shows graph badge for graph source', () => {
      const result = createMockNodeResult({ source: 'graph' });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('graph')).toBeInTheDocument();
    });

    it('shows hybrid badge for hybrid source', () => {
      const result = createMockItemResult({ source: 'hybrid' });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      expect(screen.getByText('hybrid')).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('displays score with visual indicator', () => {
      const result = createMockItemResult({ finalScore: 0.92 });
      const handleClick = vi.fn();

      render(<MemoryGridCard result={result} onClick={handleClick} />);

      // Should show score
      expect(screen.getByText(/0\.92/)).toBeInTheDocument();
    });

    it('shows high score indicator for score >= 0.8', () => {
      const result = createMockItemResult({ finalScore: 0.85 });
      const handleClick = vi.fn();

      const { container } = render(<MemoryGridCard result={result} onClick={handleClick} />);

      // Should have score-high class on score bar
      const scoreBar = container.querySelector('[class*="score-high"]');
      expect(scoreBar).toBeInTheDocument();
    });

    it('shows medium score indicator for score 0.5-0.8', () => {
      const result = createMockItemResult({ finalScore: 0.65 });
      const handleClick = vi.fn();

      const { container } = render(<MemoryGridCard result={result} onClick={handleClick} />);

      // Should have score-medium class on score bar
      const scoreBar = container.querySelector('[class*="score-medium"]');
      expect(scoreBar).toBeInTheDocument();
    });

    it('shows low score indicator for score < 0.5', () => {
      const result = createMockItemResult({ finalScore: 0.35 });
      const handleClick = vi.fn();

      const { container } = render(<MemoryGridCard result={result} onClick={handleClick} />);

      // Should have score-low class on score bar
      const scoreBar = container.querySelector('[class*="score-low"]');
      expect(scoreBar).toBeInTheDocument();
    });
  });
});
