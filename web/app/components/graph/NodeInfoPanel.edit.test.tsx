// web/app/components/graph/NodeInfoPanel.edit.test.tsx
// Unit tests for NodeInfoPanel edit/delete functionality
// Following TDD methodology: Write tests FIRST, then implement

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeInfoPanel } from './NodeInfoPanel';
import type { ConnectedEdge, NodeType } from './types';

describe('NodeInfoPanel - Edge Editing', () => {
  const mockOnClose = vi.fn();
  const mockOnEditEdge = vi.fn();
  const mockOnArchiveEdge = vi.fn();

  const mockEdges: ConnectedEdge[] = [
    {
      id: 'edge1',
      relationship: 'uses',
      targetId: 'node2',
      targetLabel: 'TypeScript',
      targetType: 'tool',
      weight: 0.8,
      status: 'active',
      direction: 'outgoing',
    },
    {
      id: 'edge2',
      relationship: 'requires',
      targetId: 'node3',
      targetLabel: 'Node.js',
      targetType: 'skill',
      weight: 0.9,
      status: 'active',
      direction: 'outgoing',
    },
  ];

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnEditEdge.mockClear();
    mockOnArchiveEdge.mockClear();
  });

  it('should accept onEditEdge callback prop', () => {
    const { container } = render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    expect(container).toBeDefined();
  });

  it('should accept onArchiveEdge callback prop', () => {
    const { container } = render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    expect(container).toBeDefined();
  });

  it('should display edit icon for each edge', () => {
    render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    // Open connections details
    const detailsElement = screen.getByText(/connection/i).closest('details');
    if (detailsElement) {
      fireEvent.click(detailsElement.querySelector('summary')!);
    }

    // Should have edit buttons for each edge
    const editButtons = screen.getAllByLabelText(/edit connection/i);
    expect(editButtons).toHaveLength(mockEdges.length);
  });

  it('should NOT display delete icon for edges', () => {
    render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    // Open connections details
    const detailsElement = screen.getByText(/connection/i).closest('details');
    if (detailsElement) {
      fireEvent.click(detailsElement.querySelector('summary')!);
    }

    // Should NOT have delete buttons
    const deleteButtons = screen.queryAllByLabelText(/delete connection/i);
    expect(deleteButtons).toHaveLength(0);
  });

  it('should call onEditEdge when edit icon is clicked', () => {
    render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    // Open connections details
    const detailsElement = screen.getByText(/connection/i).closest('details');
    if (detailsElement) {
      fireEvent.click(detailsElement.querySelector('summary')!);
    }

    // Click first edit button
    const editButtons = screen.getAllByLabelText(/edit connection/i);
    fireEvent.click(editButtons[0]);

    // Should call onEditEdge with edge ID
    expect(mockOnEditEdge).toHaveBeenCalledTimes(1);
    expect(mockOnEditEdge).toHaveBeenCalledWith('edge1');
  });

  it('should only show edit icon, not delete icon', () => {
    render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    // Open connections details
    const detailsElement = screen.getByText(/connection/i).closest('details');
    if (detailsElement) {
      fireEvent.click(detailsElement.querySelector('summary')!);
    }

    // Should have edit buttons
    const editButtons = screen.getAllByLabelText(/edit connection/i);
    expect(editButtons).toHaveLength(mockEdges.length);

    // Should NOT have delete buttons
    const deleteButtons = screen.queryAllByLabelText(/delete connection/i);
    expect(deleteButtons).toHaveLength(0);
  });

  it('should apply readable hover styles with accent color to edge rows', () => {
    const { container } = render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    // Open connections details
    const detailsElement = screen.getByText(/connection/i).closest('details');
    if (detailsElement) {
      fireEvent.click(detailsElement.querySelector('summary')!);
    }

    // Find edge rows
    const edgeRows = container.querySelectorAll('[data-testid="edge-item"]');
    expect(edgeRows.length).toBeGreaterThan(0);

    // Verify new hover class is present (accent color for better readability)
    edgeRows.forEach(row => {
      expect(row.className).toContain('hover:bg-accent/10');
      // Should NOT contain old dark muted hover style
      expect(row.className).not.toContain('hover:bg-muted');
    });
  });

  it('should not show edit/delete icons if callbacks not provided', () => {
    render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
      />
    );

    // Open connections details
    const detailsElement = screen.getByText(/connection/i).closest('details');
    if (detailsElement) {
      fireEvent.click(detailsElement.querySelector('summary')!);
    }

    // Should not have edit or delete buttons
    const editButtons = screen.queryAllByLabelText(/edit connection/i);
    const deleteButtons = screen.queryAllByLabelText(/delete connection/i);

    expect(editButtons).toHaveLength(0);
    expect(deleteButtons).toHaveLength(0);
  });

  it('should handle clicks on different edges correctly', () => {
    render(
      <NodeInfoPanel
        id="node1"
        label="Test Project"
        type="project"
        edges={mockEdges}
        onClose={mockOnClose}
        onEditEdge={mockOnEditEdge}
        onArchiveEdge={mockOnArchiveEdge}
      />
    );

    // Open connections details
    const detailsElement = screen.getByText(/connection/i).closest('details');
    if (detailsElement) {
      fireEvent.click(detailsElement.querySelector('summary')!);
    }

    // Click second edit button
    const editButtons = screen.getAllByLabelText(/edit connection/i);
    fireEvent.click(editButtons[1]);

    // Should call onEditEdge with second edge ID
    expect(mockOnEditEdge).toHaveBeenCalledWith('edge2');
  });
});
