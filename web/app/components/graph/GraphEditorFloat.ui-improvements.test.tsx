import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphEditorFloat } from './GraphEditorFloat';
import type { Doc } from '../../../convex/_generated/dataModel';

/**
 * Tests for GraphEditorFloat UI improvements:
 * 1. Node color themes applied to from/to badges
 * 2. Horizontal layout for from/to nodes
 * 3. Visual connection line indicator (solid/dashed based on status)
 */
describe('GraphEditorFloat - UI Improvements', () => {
  // Mock edge entity with active status
  const mockActiveEdge: Doc<'graphEdges'> = {
    _id: 'edge-1' as any,
    _creationTime: Date.now(),
    fromNode: 'node-1' as any,
    toNode: 'node-2' as any,
    relationship: 'uses',
    weight: 0.8,
    properties: {
      context: 'Test context',
    },
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Mock edge entity with archived status
  const mockArchivedEdge: Doc<'graphEdges'> = {
    ...mockActiveEdge,
    _id: 'edge-2' as any,
    status: 'archived',
  };

  const mockSourceRect = new DOMRect(100, 100, 200, 100);

  const defaultProps = {
    isOpen: true,
    entity: mockActiveEdge,
    entityType: 'edge' as const,
    sourceRect: mockSourceRect,
    isLoading: false,
    error: null,
    fromNodeName: 'Project A',
    toNodeName: 'Tool B',
    fromNodeType: 'project' as const,
    toNodeType: 'tool' as const,
    onSave: vi.fn(),
    onArchive: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Node Color Themes', () => {
    it('should apply project color (bg-highlight) to from node badge when type is project', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          fromNodeType="project"
        />
      );

      const fromBadge = screen.getByTestId('edge-from-node-badge');
      expect(fromBadge).toHaveClass('bg-highlight', 'text-paper');
    });

    it('should apply tool color (bg-muted) to to node badge when type is tool', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          toNodeType="tool"
        />
      );

      const toBadge = screen.getByTestId('edge-to-node-badge');
      expect(toBadge).toHaveClass('bg-muted', 'text-paper');
    });

    it('should apply skill color (bg-accent) to node badge when type is skill', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          fromNodeType="skill"
          toNodeType="skill"
        />
      );

      const fromBadge = screen.getByTestId('edge-from-node-badge');
      expect(fromBadge).toHaveClass('bg-accent', 'text-paper');
    });

    it('should apply concept color (bg-ink) to node badge when type is concept', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          fromNodeType="concept"
          toNodeType="concept"
        />
      );

      const fromBadge = screen.getByTestId('edge-from-node-badge');
      expect(fromBadge).toHaveClass('bg-ink', 'text-paper');
    });

    it('should fallback to default color when node type is not provided', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          fromNodeType={undefined}
          toNodeType={undefined}
        />
      );

      const fromBadge = screen.getByTestId('edge-from-node-badge');
      // Should use default gray/muted color
      expect(fromBadge).toHaveClass('bg-muted', 'text-paper');
    });
  });

  describe('Horizontal Node Layout', () => {
    it('should render from and to nodes in horizontal layout container', () => {
      render(<GraphEditorFloat {...defaultProps} />);

      const container = screen.getByTestId('edge-nodes-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'items-center');
    });

    it('should display from node, connection line, and to node in order', () => {
      const { container } = render(<GraphEditorFloat {...defaultProps} />);

      const nodesContainer = screen.getByTestId('edge-nodes-container');
      const children = Array.from(nodesContainer.children);

      // Should have exactly 3 children: from badge, connection line, to badge
      expect(children).toHaveLength(3);

      // First child should be from node badge
      expect(children[0]).toHaveAttribute('data-testid', 'edge-from-node-badge');

      // Second child should be connection line
      expect(children[1]).toHaveAttribute('data-testid', 'edge-connection-line');

      // Third child should be to node badge
      expect(children[2]).toHaveAttribute('data-testid', 'edge-to-node-badge');
    });
  });

  describe('Visual Connection Line Indicator', () => {
    it('should display solid connection line for active edges', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockActiveEdge}
        />
      );

      const connectionLine = screen.getByTestId('edge-connection-line');
      expect(connectionLine).toBeInTheDocument();
      // Should NOT have dashed border (solid is default)
      expect(connectionLine).not.toHaveClass('border-dashed');
    });

    it('should display dashed connection line for archived edges', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockArchivedEdge}
        />
      );

      const connectionLine = screen.getByTestId('edge-connection-line');
      expect(connectionLine).toBeInTheDocument();
      expect(connectionLine).toHaveClass('border-dashed');
    });

    it('should not display standalone status badge field', () => {
      render(<GraphEditorFloat {...defaultProps} />);

      // The old status field should be removed
      expect(screen.queryByText(/^Status$/i)).not.toBeInTheDocument();
    });

    it('should display connection line with arrow indicating direction', () => {
      render(<GraphEditorFloat {...defaultProps} />);

      const connectionLine = screen.getByTestId('edge-connection-line');
      // Should contain an arrow or directional indicator
      expect(connectionLine).toHaveTextContent('→');
    });

    it('should apply proper spacing between badges and connection line', () => {
      render(<GraphEditorFloat {...defaultProps} />);

      const container = screen.getByTestId('edge-nodes-container');
      // Should have gap classes for spacing
      expect(container).toHaveClass('gap-2');
    });
  });

  describe('Integration with existing functionality', () => {
    it('should preserve from/to node name display', () => {
      render(<GraphEditorFloat {...defaultProps} />);

      expect(screen.getByText('Project A')).toBeInTheDocument();
      expect(screen.getByText('Tool B')).toBeInTheDocument();
    });

    it('should still show node IDs when names are not provided', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          fromNodeName={null}
          toNodeName={null}
        />
      );

      expect(screen.getByText('node-1')).toBeInTheDocument();
      expect(screen.getByText('node-2')).toBeInTheDocument();
    });

    it('should maintain all other edge editing fields', () => {
      render(<GraphEditorFloat {...defaultProps} />);

      // Relationship field should still exist
      expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument();

      // Weight field should still exist
      expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();

      // Context field should still exist
      expect(screen.getByLabelText(/context/i)).toBeInTheDocument();
    });
  });
});
