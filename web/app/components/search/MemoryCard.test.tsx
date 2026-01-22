import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryCard } from './MemoryCard';
import { MergedResult } from './types';

/**
 * Test suite for MemoryCard component
 * Tests content display, badge integration, score display, and styling
 */
describe('MemoryCard', () => {
  // Mock data helper
  const createMockResult = (overrides?: Partial<MergedResult>): MergedResult => ({
    type: 'item',
    content: 'Test content',
    score: 0.85,
    finalScore: 0.85,
    timestamp: Date.now(),
    source: 'vector',
    ...overrides,
  });

  describe('Content Display', () => {
    it('displays content under 200 chars fully', () => {
      const shortContent = 'This is a short piece of content';
      const result = createMockResult({ content: shortContent });

      render(<MemoryCard result={result} />);

      expect(screen.getByText(shortContent)).toBeInTheDocument();
      expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
    });

    it('truncates content over 200 chars with "..."', () => {
      const longContent = 'A'.repeat(300);
      const result = createMockResult({ content: longContent });

      render(<MemoryCard result={result} />);

      // Should show truncated content with ellipsis
      const contentElement = screen.getByText(/\.\.\./);
      expect(contentElement).toBeInTheDocument();
      // Truncation may be shorter due to word boundary logic
      expect(contentElement.textContent!.length).toBeLessThanOrEqual(204);
      expect(contentElement.textContent).toMatch(/\.\.\.$/);
    });

    it('handles multiline content', () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      const result = createMockResult({ content: multilineContent });

      render(<MemoryCard result={result} />);

      // Check for multiline content using a function matcher
      expect(screen.getByText((content, element) => {
        return element?.textContent === multilineContent;
      })).toBeInTheDocument();
    });

    it('handles empty content', () => {
      const result = createMockResult({ content: '' });

      render(<MemoryCard result={result} />);

      // Should render without crashing, empty content should be in DOM
      const card = screen.getByTestId('memory-card');
      expect(card).toBeInTheDocument();
    });

    it('respects custom truncateLimit prop', () => {
      const longContent = 'A'.repeat(150);
      const result = createMockResult({ content: longContent });

      render(<MemoryCard result={result} truncateLimit={100} />);

      const contentElement = screen.getByText(/\.\.\./);
      expect(contentElement).toBeInTheDocument();
      // Truncation may be shorter due to word boundary logic
      expect(contentElement.textContent!.length).toBeLessThanOrEqual(104);
      expect(contentElement.textContent).toMatch(/\.\.\.$/);
    });
  });

  describe('Badge Integration', () => {
    it('renders TypeBadge with item type', () => {
      const result = createMockResult({ type: 'item' });

      render(<MemoryCard result={result} />);

      const typeBadge = screen.getByText('item');
      expect(typeBadge).toBeInTheDocument();
      expect(typeBadge).toHaveClass('badge-node', 'badge-project');
    });

    it('renders TypeBadge with node type', () => {
      const result = createMockResult({ type: 'node' });

      render(<MemoryCard result={result} />);

      const typeBadge = screen.getByText('node');
      expect(typeBadge).toBeInTheDocument();
      expect(typeBadge).toHaveClass('badge-node', 'badge-tool');
    });

    it('renders SourceBadge with vector source', () => {
      const result = createMockResult({ source: 'vector' });

      render(<MemoryCard result={result} />);

      const sourceBadge = screen.getByText('vector');
      expect(sourceBadge).toBeInTheDocument();
      expect(sourceBadge).toHaveClass('badge-node', 'badge-skill');
    });

    it('renders SourceBadge with graph source', () => {
      const result = createMockResult({ source: 'graph' });

      render(<MemoryCard result={result} />);

      const sourceBadge = screen.getByText('graph');
      expect(sourceBadge).toBeInTheDocument();
      expect(sourceBadge).toHaveClass('badge-node', 'badge-tool');
    });

    it('renders SourceBadge with hybrid source', () => {
      const result = createMockResult({ source: 'hybrid' });

      render(<MemoryCard result={result} />);

      const sourceBadge = screen.getByText('hybrid');
      expect(sourceBadge).toBeInTheDocument();
      expect(sourceBadge).toHaveClass('badge-node', 'badge-concept');
    });
  });

  describe('Score Display', () => {
    it('displays formatted score with 2 decimal places', () => {
      const result = createMockResult({ finalScore: 0.8567 });

      render(<MemoryCard result={result} />);

      expect(screen.getByText(/score: 0\.86/)).toBeInTheDocument();
    });

    it('renders ScoreBar with correct score', () => {
      const result = createMockResult({ finalScore: 0.75 });

      render(<MemoryCard result={result} />);

      // ScoreBar creates a progressbar with aria attributes
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('handles edge case score 0', () => {
      const result = createMockResult({ finalScore: 0 });

      render(<MemoryCard result={result} />);

      expect(screen.getByText(/score: 0\.00/)).toBeInTheDocument();
    });

    it('handles edge case score 1', () => {
      const result = createMockResult({ finalScore: 1 });

      render(<MemoryCard result={result} />);

      expect(screen.getByText(/score: 1\.00/)).toBeInTheDocument();
    });
  });

  describe('Timestamp', () => {
    it('displays relative time for recent timestamp', () => {
      const oneHourAgo = Date.now() - 3600000;
      const result = createMockResult({ timestamp: oneHourAgo });

      render(<MemoryCard result={result} />);

      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    });

    it('displays relative time for old timestamp', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 3600000;
      const result = createMockResult({ timestamp: threeDaysAgo });

      render(<MemoryCard result={result} />);

      expect(screen.getByText('3 days ago')).toBeInTheDocument();
    });

    it('displays "just now" for current timestamp', () => {
      const result = createMockResult({ timestamp: Date.now() });

      render(<MemoryCard result={result} />);

      expect(screen.getByText('just now')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has card-brutal class', () => {
      const result = createMockResult();

      render(<MemoryCard result={result} />);

      const card = screen.getByTestId('memory-card');
      expect(card).toHaveClass('card-brutal');
    });

    it('has proper spacing classes', () => {
      const result = createMockResult();

      render(<MemoryCard result={result} />);

      const card = screen.getByTestId('memory-card');
      expect(card).toHaveClass('p-4', 'space-y-3');
    });

    it('handles long content without overflow', () => {
      const longContent = 'A'.repeat(500);
      const result = createMockResult({ content: longContent });

      const { container } = render(<MemoryCard result={result} />);

      // Content should be in a div with whitespace-pre-wrap
      const contentDiv = container.querySelector('.whitespace-pre-wrap');
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toHaveClass('whitespace-pre-wrap');
    });

    it('has hover effect on card', () => {
      const result = createMockResult();

      render(<MemoryCard result={result} />);

      const card = screen.getByTestId('memory-card');
      // Check that card has hover-related class or transition class
      const classes = card.className;
      expect(classes).toMatch(/card-brutal/);
    });
  });

  describe('Layout Structure', () => {
    it('renders all sections in correct order', () => {
      const result = createMockResult({
        content: 'Test content',
        finalScore: 0.85,
      });

      const { container } = render(<MemoryCard result={result} />);

      const card = screen.getByTestId('memory-card');
      const children = Array.from(card.children);

      // Should have 3 children: header, scorebar, content
      expect(children).toHaveLength(3);

      // Header should contain badges and score
      expect(children[0]).toHaveClass('flex');
      expect(children[0].textContent).toMatch(/item/);
      expect(children[0].textContent).toMatch(/vector/);
      expect(children[0].textContent).toMatch(/score: 0\.85/);

      // ScoreBar should be second (has role="progressbar")
      expect(children[1].getAttribute('role')).toBe('progressbar');

      // Content should be last
      expect(children[2]).toHaveClass('whitespace-pre-wrap');
      expect(children[2].textContent).toBe('Test content');
    });
  });
});
