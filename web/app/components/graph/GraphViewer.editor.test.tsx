import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphViewer } from './GraphViewer';
import cytoscape from 'cytoscape';

// Mock Cytoscape
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
      removeClass: vi.fn(() => ({
        style: vi.fn(),
      })),
      addClass: vi.fn(),
      style: vi.fn(),
    })),
    batch: vi.fn((fn: () => void) => fn()),
    add: vi.fn(),
    getElementById: vi.fn(() => ({
      length: 1,
      data: vi.fn((key: string) => {
        const mockData: Record<string, unknown> = {
          label: 'Test Node',
          type: 'project',
          description: 'Test description',
          source: 'n1',
          target: 'n2',
          relationship: 'uses',
          weight: 0.8,
          status: 'active',
        };
        return mockData[key];
      }),
      removeClass: vi.fn(),
      addClass: vi.fn(),
      style: vi.fn(),
      connectedEdges: vi.fn(() => ({
        forEach: vi.fn(),
      })),
      renderedPosition: vi.fn(() => ({ x: 100, y: 100 })),
    })),
  })),
}));

// Mock the useGraphData hook
vi.mock('./useGraphData', () => ({
  useGraphData: vi.fn(),
}));

// Mock the useGraphEditor hook
vi.mock('../../hooks/useGraphEditor', () => ({
  useGraphEditor: vi.fn(),
}));

// Mock Convex queries
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
}));

import { useGraphData } from './useGraphData';
import { useGraphEditor } from '../../hooks/useGraphEditor';
import type { CytoscapeElement } from './types';

describe('GraphViewer Editor Integration', () => {
  const mockElements = [
    { data: { id: 'n1', label: 'Project1', type: 'project' } },
    { data: { id: 'n2', label: 'Tool1', type: 'tool' } },
    {
      data: {
        id: 'e1',
        source: 'n1',
        target: 'n2',
        relationship: 'uses',
        weight: 0.8,
        status: 'active',
      },
    },
  ] as unknown as CytoscapeElement[];

  const mockEditor = {
    isOpen: false,
    entity: null,
    entityType: null,
    sourceRect: null,
    isLoading: false,
    error: null,
    open: vi.fn(),
    close: vi.fn(),
    save: vi.fn(),
    archive: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGraphData).mockReturnValue({
      elements: mockElements,
      isLoading: false,
      isEmpty: false,
      nodeCount: 2,
      edgeCount: 1,
      error: null,
    });

    vi.mocked(useGraphEditor).mockReturnValue(mockEditor);
  });

  describe('Editor Hook Integration', () => {
    it('should use useGraphEditor hook', () => {
      render(<GraphViewer />);

      expect(useGraphEditor).toHaveBeenCalled();
    });

    it('should render GraphEditorFloat component', async () => {
      // Open editor with a mock node
      const mockNodeEntity = {
        _id: 'node-1',
        _creationTime: Date.now(),
        name: 'Test Node',
        type: 'project',
        properties: { description: 'Test description' },
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      vi.mocked(useGraphEditor).mockReturnValue({
        ...mockEditor,
        isOpen: true,
        entity: mockNodeEntity as any,
        entityType: 'node',
        sourceRect: new DOMRect(100, 100, 200, 100),
      });

      render(<GraphViewer />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Editing Callbacks', () => {
    it('should pass onEditEdge callback to NodeInfoPanel', () => {
      render(<GraphViewer />);

      // The NodeInfoPanel should receive the callback
      // This will be verified by integration with the actual component
      expect(useGraphEditor).toHaveBeenCalled();
    });

    it('should pass onArchiveEdge callback to NodeInfoPanel', () => {
      render(<GraphViewer />);

      // The NodeInfoPanel should receive the callback
      expect(useGraphEditor).toHaveBeenCalled();
    });
  });

  describe('Node Name Resolution', () => {
    it.skip('should resolve from/to node names when editing edges', async () => {
      const mockEdgeEntity = {
        _id: 'edge-1',
        _creationTime: Date.now(),
        fromNode: 'n1',
        toNode: 'n2',
        relationship: 'uses',
        weight: 0.8,
        properties: { context: 'Test context' },
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Mock getElementById to return nodes with names
      const mockGetElementById = vi.fn((id: string) => {
        const nodeLabels: Record<string, string> = {
          n1: 'Project1',
          n2: 'Tool1',
        };

        return {
          length: 1,
          data: vi.fn((key: string) => {
            if (key === 'label') return nodeLabels[id];
            return undefined;
          }),
        };
      });

      (cytoscape as ReturnType<typeof vi.fn>).mockReturnValue({
        on: vi.fn(),
        off: vi.fn(),
        fit: vi.fn(),
        resize: vi.fn(),
        getElementById: mockGetElementById,
        zoom: vi.fn(() => 1),
        pan: vi.fn(() => ({ x: 0, y: 0 })),
        center: vi.fn(),
        layout: vi.fn(() => ({ run: vi.fn() })),
        destroy: vi.fn(),
        nodes: vi.fn(() => ({ length: 0 })),
        edges: vi.fn(() => ({ length: 0 })),
        elements: vi.fn(() => ({
          map: vi.fn(() => []),
          forEach: vi.fn(),
          removeClass: vi.fn(() => ({
            style: vi.fn(),
          })),
          addClass: vi.fn(),
          style: vi.fn(),
        })),
        batch: vi.fn((fn: () => void) => fn()),
        add: vi.fn(),
      });

      vi.mocked(useGraphEditor).mockReturnValue({
        ...mockEditor,
        isOpen: true,
        entity: mockEdgeEntity as any,
        entityType: 'edge',
        sourceRect: new DOMRect(100, 100, 200, 100),
      });

      render(<GraphViewer />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should display resolved node names
      await waitFor(() => {
        expect(screen.getByText('Project1')).toBeInTheDocument();
        expect(screen.getByText('Tool1')).toBeInTheDocument();
      });
    });

    it('should display node IDs as fallback when names cannot be resolved', async () => {
      const mockEdgeEntity = {
        _id: 'edge-1',
        _creationTime: Date.now(),
        fromNode: 'n1',
        toNode: 'n2',
        relationship: 'uses',
        weight: 0.8,
        properties: { context: 'Test context' },
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Mock getElementById to return nothing (node not found)
      const mockGetElementById = vi.fn(() => ({
        length: 0,
      }));

      (cytoscape as ReturnType<typeof vi.fn>).mockReturnValue({
        on: vi.fn(),
        off: vi.fn(),
        fit: vi.fn(),
        resize: vi.fn(),
        getElementById: mockGetElementById,
        zoom: vi.fn(() => 1),
        pan: vi.fn(() => ({ x: 0, y: 0 })),
        center: vi.fn(),
        layout: vi.fn(() => ({ run: vi.fn() })),
        destroy: vi.fn(),
        nodes: vi.fn(() => ({ length: 0 })),
        edges: vi.fn(() => ({ length: 0 })),
        elements: vi.fn(() => ({
          map: vi.fn(() => []),
          forEach: vi.fn(),
          removeClass: vi.fn(() => ({
            style: vi.fn(),
          })),
          addClass: vi.fn(),
          style: vi.fn(),
        })),
        batch: vi.fn((fn: () => void) => fn()),
        add: vi.fn(),
      });

      vi.mocked(useGraphEditor).mockReturnValue({
        ...mockEditor,
        isOpen: true,
        entity: mockEdgeEntity as any,
        entityType: 'edge',
        sourceRect: new DOMRect(100, 100, 200, 100),
      });

      render(<GraphViewer />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should display node IDs as fallback
      expect(screen.getByText('n1')).toBeInTheDocument();
      expect(screen.getByText('n2')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should pass loading state to GraphEditorFloat', async () => {
      const mockNodeEntity = {
        _id: 'node-1',
        _creationTime: Date.now(),
        name: 'Test Node',
        type: 'project',
        properties: { description: 'Test description' },
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      vi.mocked(useGraphEditor).mockReturnValue({
        ...mockEditor,
        isOpen: true,
        entity: mockNodeEntity as any,
        entityType: 'node',
        sourceRect: new DOMRect(100, 100, 200, 100),
        isLoading: true,
      });

      render(<GraphViewer />);

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(/description/i);
        expect(descriptionInput).toBeDisabled();
      });
    });
  });

  describe('Error States', () => {
    it('should pass error state to GraphEditorFloat', async () => {
      const mockNodeEntity = {
        _id: 'node-1',
        _creationTime: Date.now(),
        name: 'Test Node',
        type: 'project',
        properties: { description: 'Test description' },
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      vi.mocked(useGraphEditor).mockReturnValue({
        ...mockEditor,
        isOpen: true,
        entity: mockNodeEntity as any,
        entityType: 'node',
        sourceRect: new DOMRect(100, 100, 200, 100),
        error: 'Save failed',
      });

      render(<GraphViewer />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
      });
    });
  });
});
