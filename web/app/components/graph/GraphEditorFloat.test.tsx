import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphEditorFloat } from './GraphEditorFloat';
import type { Doc } from '../../../convex/_generated/dataModel';
import type { EntityType } from '../../hooks/useGraphEditor';

/**
 * Tests for GraphEditorFloat component
 */
describe('GraphEditorFloat', () => {
  // Mock node entity
  const mockNode: Doc<'graphNodes'> = {
    _id: 'node-1' as any,
    _creationTime: Date.now(),
    name: 'Test Node',
    type: 'project',
    properties: {
      description: 'Test description',
    },
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Mock edge entity
  const mockEdge: Doc<'graphEdges'> = {
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

  const mockSourceRect = new DOMRect(100, 100, 200, 100);

  const defaultProps = {
    isOpen: true,
    entity: null,
    entityType: null as EntityType | null,
    sourceRect: mockSourceRect,
    isLoading: false,
    error: null,
    fromNodeName: null,
    toNodeName: null,
    onSave: vi.fn(),
    onArchive: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<GraphEditorFloat {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should not render when entity is null', () => {
      render(<GraphEditorFloat {...defaultProps} entity={null} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render dialog when open with node entity', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Node')).toBeInTheDocument();
    });

    it('should render dialog when open with edge entity', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Connection')).toBeInTheDocument();
    });

    it('should render overlay', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
        />
      );
      expect(screen.getByTestId('editor-overlay')).toBeInTheDocument();
    });
  });

  describe('Node Editing', () => {
    it('should display node name as read-only', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
        />
      );
      const nameInput = screen.getByDisplayValue('Test Node');
      expect(nameInput).toBeDisabled();
    });

    it('should display node type as read-only', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
        />
      );
      expect(screen.getByText('project')).toBeInTheDocument();
    });

    it('should allow editing description', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
        />
      );
      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).not.toBeDisabled();
      fireEvent.change(descriptionInput, {
        target: { value: 'Updated description' },
      });
      expect(descriptionInput).toHaveValue('Updated description');
    });

    it('should call onSave with updated node data', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          onSave={onSave}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      fireEvent.change(descriptionInput, {
        target: { value: 'Updated description' },
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          type: 'node',
          description: 'Updated description',
        });
      });
    });
  });

  describe('Edge Editing', () => {
    it('should display from node as read-only badge', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      expect(screen.getByText('Source Node')).toBeInTheDocument();
    });

    it('should display to node as read-only badge', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      expect(screen.getByText('Target Node')).toBeInTheDocument();
    });

    it('should allow editing relationship type', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      const relationshipSelect = screen.getByLabelText(/relationship/i);
      expect(relationshipSelect).not.toBeDisabled();
      fireEvent.change(relationshipSelect, { target: { value: 'requires' } });
      expect(relationshipSelect).toHaveValue('requires');
    });

    it('should allow editing weight with slider', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      const weightSlider = screen.getByLabelText(/weight/i);
      expect(weightSlider).not.toBeDisabled();
      fireEvent.change(weightSlider, { target: { value: '0.5' } });
      expect(weightSlider).toHaveValue('0.5');
    });

    it('should display weight numeric value', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      expect(screen.getByText('0.80')).toBeInTheDocument();
    });

    it('should allow editing context', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      const contextInput = screen.getByLabelText(/context/i);
      expect(contextInput).not.toBeDisabled();
      fireEvent.change(contextInput, {
        target: { value: 'Updated context' },
      });
      expect(contextInput).toHaveValue('Updated context');
    });

    it('should display status visually via connection line style', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );
      // Status is now shown via connection line (solid for active, dashed for archived)
      const connectionLine = screen.getByTestId('edge-connection-line');
      expect(connectionLine).toBeInTheDocument();
      // Active status = solid line (no dashed class)
      expect(connectionLine).not.toHaveClass('border-dashed');
    });

    it('should call onSave with updated edge data', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
          onSave={onSave}
        />
      );

      const relationshipSelect = screen.getByLabelText(/relationship/i);
      fireEvent.change(relationshipSelect, { target: { value: 'requires' } });

      const weightSlider = screen.getByLabelText(/weight/i);
      fireEvent.change(weightSlider, { target: { value: '0.9' } });

      const contextInput = screen.getByLabelText(/context/i);
      fireEvent.change(contextInput, {
        target: { value: 'Updated context' },
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          type: 'edge',
          relationship: 'requires',
          weight: 0.9,
          context: 'Updated context',
        });
      });
    });
  });

  describe('Actions', () => {
    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          onClose={onClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          onClose={onClose}
        />
      );

      const overlay = screen.getByTestId('editor-overlay');
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          onClose={onClose}
        />
      );

      const closeButton = screen.getByLabelText(/close/i);
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onArchive when archive button is clicked for nodes', async () => {
      const onArchive = vi.fn().mockResolvedValue(undefined);
      // Mock window.confirm
      global.confirm = vi.fn(() => true);

      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          onArchive={onArchive}
        />
      );

      const archiveButton = screen.getByRole('button', { name: /archive/i });
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(onArchive).toHaveBeenCalled();
      });
    });

    it('should call onArchive when archive button is clicked for edges', async () => {
      const onArchive = vi.fn().mockResolvedValue(undefined);
      // Mock window.confirm
      global.confirm = vi.fn(() => true);

      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
          onArchive={onArchive}
        />
      );

      const archiveButton = screen.getByRole('button', { name: /archive/i });
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(onArchive).toHaveBeenCalled();
      });
    });

    it('should not call onArchive if confirmation is cancelled', async () => {
      const onArchive = vi.fn();
      global.confirm = vi.fn(() => false);

      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          onArchive={onArchive}
        />
      );

      const archiveButton = screen.getByRole('button', { name: /archive/i });
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(onArchive).not.toHaveBeenCalled();
      });
    });
  });

  describe('Loading States', () => {
    it('should disable inputs when isLoading is true', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          isLoading={true}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toBeDisabled();
    });

    it('should disable buttons when isLoading is true', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /archive/i })).toBeDisabled();
    });
  });

  describe('Error States', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          error="Save failed"
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
    });

    it('should not display error alert when error is null', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          error={null}
        />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Node Name Resolution', () => {
    it('should display node names when provided for edges', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName="Source Node"
          toNodeName="Target Node"
        />
      );

      expect(screen.getByText('Source Node')).toBeInTheDocument();
      expect(screen.getByText('Target Node')).toBeInTheDocument();
    });

    it('should display node IDs as fallback when names not provided', () => {
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockEdge}
          entityType="edge"
          fromNodeName={null}
          toNodeName={null}
        />
      );

      expect(screen.getByText('node-1')).toBeInTheDocument();
      expect(screen.getByText('node-2')).toBeInTheDocument();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should close editor when ESC key is pressed', () => {
      const onClose = vi.fn();
      render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          onClose={onClose}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('FLIP Animation', () => {
    it('should apply FLIP CSS variables when sourceRect is provided', () => {
      const { container } = render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          sourceRect={mockSourceRect}
        />
      );

      const dialog = container.querySelector('[role="dialog"]')?.firstChild as HTMLElement;
      expect(dialog?.style.getPropertyValue('--flip-start-x')).toBeTruthy();
      expect(dialog?.style.getPropertyValue('--flip-start-y')).toBeTruthy();
    });

    it('should not apply FLIP CSS variables when sourceRect is null', () => {
      const { container } = render(
        <GraphEditorFloat
          {...defaultProps}
          entity={mockNode}
          entityType="node"
          sourceRect={null}
        />
      );

      const dialog = container.querySelector('[role="dialog"]')?.firstChild as HTMLElement;
      expect(dialog?.style.getPropertyValue('--flip-start-x')).toBeFalsy();
      expect(dialog?.style.getPropertyValue('--flip-start-y')).toBeFalsy();
    });
  });
});
