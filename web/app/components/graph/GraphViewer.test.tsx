import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphViewer } from './GraphViewer';

// Mock Cytoscape - it needs DOM and won't work in jsdom
vi.mock('cytoscape', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    fit: vi.fn(),
    zoom: vi.fn(() => 1),
    pan: vi.fn(() => ({ x: 0, y: 0 })),
    center: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() })),
    destroy: vi.fn(),
    nodes: vi.fn(() => ({ length: 0 })),
    edges: vi.fn(() => ({ length: 0 })),
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
});
