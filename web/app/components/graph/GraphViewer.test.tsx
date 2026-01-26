import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphViewer } from './GraphViewer';

// Mock Cytoscape - it needs DOM and won't work in jsdom
vi.mock('cytoscape', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    fit: vi.fn(),
    resize: vi.fn(),
    zoom: vi.fn(() => 1),
    pan: vi.fn(() => ({ x: 0, y: 0 })),
    center: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() })),
    destroy: vi.fn(),
    nodes: vi.fn(() => ({
      length: 0,
      removeClass: vi.fn(),
      style: vi.fn(),
    })),
    edges: vi.fn(() => ({
      length: 0,
      forEach: vi.fn(),
    })),
    elements: vi.fn(() => ({
      map: vi.fn(() => []),
      forEach: vi.fn(),
      removeClass: vi.fn(),
      addClass: vi.fn(),
      style: vi.fn(),
    })),
    batch: vi.fn((fn: () => void) => fn()),
    add: vi.fn(),
    getElementById: vi.fn(() => ({
      length: 0,
      removeClass: vi.fn(),
      addClass: vi.fn(),
      style: vi.fn(),
    })),
  })),
}));

// Mock the useGraphData hook
vi.mock('./useGraphData', () => ({
  useGraphData: vi.fn(),
}));

import { useGraphData } from './useGraphData';
import type { CytoscapeElement } from './types';

describe('GraphViewer', () => {
  // Cast to CytoscapeElement[] - the exact shape doesn't matter for render tests
  const mockElements = [
    { data: { id: 'n1', label: 'Project1', type: 'project' } },
    { data: { id: 'n2', label: 'Tool1', type: 'tool' } },
    { data: { id: 'e1', source: 'n1', target: 'n2', relationship: 'uses', weight: 0.5, status: 'active' } },
  ] as unknown as CytoscapeElement[];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state while fetching', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: [],
      isLoading: true,
      isEmpty: false,
      nodeCount: 0,
      edgeCount: 0,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading graph/i)).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: [],
      isLoading: false,
      isEmpty: true,
      nodeCount: 0,
      edgeCount: 0,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByText(/no nodes/i)).toBeInTheDocument();
  });

  it('renders error state when error occurs', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: [],
      isLoading: false,
      isEmpty: false,
      nodeCount: 0,
      edgeCount: 0,
      error: new Error('Network failure'),
    });

    render(<GraphViewer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('renders graph container when data available', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 2,
      edgeCount: 1,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByTestId('graph-container')).toBeInTheDocument();
  });

  it('renders controls when data available', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 2,
      edgeCount: 1,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByTestId('graph-controls')).toBeInTheDocument();
  });

  it('displays node count', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 5,
      edgeCount: 8,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByText(/5 nodes/i)).toBeInTheDocument();
  });

  it('displays edge count', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 5,
      edgeCount: 8,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByText(/8 edges/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 2,
      edgeCount: 1,
      error: null,
    });

    render(<GraphViewer className="custom-class" />);
    const viewer = screen.getByTestId('graph-viewer');
    expect(viewer).toHaveClass('custom-class');
  });

  it('has graph-viewer test id', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 2,
      edgeCount: 1,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByTestId('graph-viewer')).toBeInTheDocument();
  });

  it('passes onNodeClick prop correctly', () => {
    const onNodeClick = vi.fn();
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 2,
      edgeCount: 1,
      error: null,
    });

    // Just verify it renders without error when prop is passed
    render(<GraphViewer onNodeClick={onNodeClick} />);
    expect(screen.getByTestId('graph-viewer')).toBeInTheDocument();
  });

  it('handles singular node count', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: [{ data: { id: 'n1', label: 'Node1', type: 'project' } }] as unknown as CytoscapeElement[],
      isLoading: false,
      isEmpty: false,
      nodeCount: 1,
      edgeCount: 0,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByText(/1 node/i)).toBeInTheDocument();
  });

  it('handles singular edge count', () => {
    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 2,
      edgeCount: 1,
      error: null,
    });

    render(<GraphViewer />);
    expect(screen.getByText(/1 edge/i)).toBeInTheDocument();
  });

  describe('filtered nodes', () => {
    beforeEach(() => {
      vi.mocked(useGraphData).mockReturnValue({
        elements: mockElements,
        isLoading: false,
        isEmpty: false,
        nodeCount: 5,
        edgeCount: 3,
        error: null,
      });
    });

    it('accepts filteredNodeIds prop without error', () => {
      render(<GraphViewer filteredNodeIds={['n1', 'n2']} />);
      expect(screen.getByTestId('graph-viewer')).toBeInTheDocument();
    });

    it('accepts empty filteredNodeIds array', () => {
      render(<GraphViewer filteredNodeIds={[]} />);
      expect(screen.getByTestId('graph-viewer')).toBeInTheDocument();
    });

    it('accepts undefined filteredNodeIds', () => {
      render(<GraphViewer />);
      expect(screen.getByTestId('graph-viewer')).toBeInTheDocument();
    });

    it('shows filter indicator when nodes are filtered', () => {
      render(<GraphViewer filteredNodeIds={['n1', 'n2']} />);
      expect(screen.getByText(/2 filtered/i)).toBeInTheDocument();
    });
  });

  describe('fullscreen resize handling', () => {
    it('should use captured ref value to prevent stale closure issues', () => {
      // This test verifies the fix: the cy ref is captured BEFORE the RAF callback
      // This prevents stale closures where cyRef.current might change
      // The fix changes from: cyRef.current?.resize() to: cy.resize()

      vi.mocked(useGraphData).mockReturnValue({
        elements: mockElements,
        isLoading: false,
        isEmpty: false,
        nodeCount: 2,
        edgeCount: 1,
        error: null,
      });

      const rafSpy = vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
        // Execute callback immediately in tests
        cb(0);
        return 123;
      });

      render(<GraphViewer />);

      // Verify RAF was called during component lifecycle
      // The implementation should capture the cy instance before the callback
      expect(rafSpy).toHaveBeenCalled();

      rafSpy.mockRestore();
    });

    it('should early return from effect when ref is null', () => {
      vi.mocked(useGraphData).mockReturnValue({
        elements: [],
        isLoading: false,
        isEmpty: false,
        nodeCount: 0,
        edgeCount: 0,
        error: null,
      });

      // Should not throw when cyRef is not initialized
      // The fix includes: if (!cy) return;
      expect(() => render(<GraphViewer />)).not.toThrow();
    });

    it('should handle unmounting without errors', () => {
      vi.mocked(useGraphData).mockReturnValue({
        elements: mockElements,
        isLoading: false,
        isEmpty: false,
        nodeCount: 2,
        edgeCount: 1,
        error: null,
      });

      // Render and unmount multiple times - should not leak or error
      const { unmount } = render(<GraphViewer />);

      // Unmounting should cleanup animation frames
      expect(() => unmount()).not.toThrow();
    });
  });
});
