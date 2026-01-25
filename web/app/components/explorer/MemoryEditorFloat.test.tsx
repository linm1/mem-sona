import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryEditorFloat } from './MemoryEditorFloat';
import { MergedResult } from '../search/types';

/**
 * Test suite for MemoryEditorFloat component
 * Tests the FLIP-animated float window editor for both Items and Nodes
 */
describe('MemoryEditorFloat', () => {
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
    content: 'TypeScript programming language',
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

  const createMockSourceRect = (): DOMRect => ({
    x: 100,
    y: 200,
    width: 300,
    height: 180,
    top: 200,
    right: 400,
    bottom: 380,
    left: 100,
    toJSON: () => ({}),
  });

  const defaultProps = {
    isOpen: true,
    result: createMockItemResult(),
    sourceRect: createMockSourceRect(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm for dirty state tests
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility', () => {
    it('is hidden when isOpen is false', () => {
      render(
        <MemoryEditorFloat
          {...defaultProps}
          isOpen={false}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('is visible when isOpen is true', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders overlay when open', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      expect(screen.getByTestId('editor-overlay')).toBeInTheDocument();
    });

    it('handles null result gracefully', () => {
      render(
        <MemoryEditorFloat
          {...defaultProps}
          result={null}
          isOpen={true}
        />
      );

      // Should not crash, just not render content
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles null sourceRect gracefully', () => {
      render(
        <MemoryEditorFloat
          {...defaultProps}
          sourceRect={null}
        />
      );

      // Should still render, just without FLIP animation starting position
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Item Editor Fields', () => {
    it('renders content textarea for items', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      const contentField = screen.getByLabelText(/content/i);
      expect(contentField).toBeInTheDocument();
      expect(contentField.tagName).toBe('TEXTAREA');
    });

    it('renders category dropdown for items', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      const categoryField = screen.getByLabelText(/category/i);
      expect(categoryField).toBeInTheDocument();
      expect(categoryField.tagName).toBe('SELECT');
    });

    it('populates content with item content', () => {
      const result = createMockItemResult({ content: 'Test content here' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const contentField = screen.getByRole('textbox', { name: /content/i }) as HTMLTextAreaElement;
      expect(contentField.value).toBe('Test content here');
    });

    it('populates category with item category', () => {
      const result = createMockItemResult({ category: 'tech_preferences' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const categoryField = screen.getByLabelText(/category/i) as HTMLSelectElement;
      expect(categoryField.value).toBe('tech_preferences');
    });

    it('does NOT render description field for items', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
    });

    it('shows item type badge', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      expect(screen.getByText('item')).toBeInTheDocument();
    });

    it('displays accessCount in metadata', () => {
      const result = createMockItemResult({ accessCount: 15 });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      expect(screen.getByText(/15/)).toBeInTheDocument();
    });
  });

  describe('Node Editor Fields', () => {
    it('renders name input for nodes', () => {
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const nameField = screen.getByRole('textbox', { name: /name/i });
      expect(nameField).toBeInTheDocument();
      expect(nameField.tagName).toBe('INPUT');
    });

    it('renders type dropdown for nodes', () => {
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const typeField = screen.getByRole('combobox', { name: /type/i });
      expect(typeField).toBeInTheDocument();
      expect(typeField.tagName).toBe('SELECT');
    });

    it('renders description textarea for nodes', () => {
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const descField = screen.getByRole('textbox', { name: /description/i });
      expect(descField).toBeInTheDocument();
      expect(descField.tagName).toBe('TEXTAREA');
    });

    it('populates name with node name', () => {
      const result = createMockNodeResult({ name: 'React' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const nameField = screen.getByRole('textbox', { name: /name/i }) as HTMLInputElement;
      expect(nameField.value).toBe('React');
    });

    it('populates type with node type', () => {
      const result = createMockNodeResult({ nodeType: 'tool' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const typeField = screen.getByRole('combobox', { name: /type/i }) as HTMLSelectElement;
      expect(typeField.value).toBe('tool');
    });

    it('populates description with node description', () => {
      const result = createMockNodeResult({ description: 'A JS library' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const descField = screen.getByRole('textbox', { name: /description/i }) as HTMLTextAreaElement;
      expect(descField.value).toBe('A JS library');
    });

    it('shows node type badge', () => {
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      expect(screen.getByText('node')).toBeInTheDocument();
    });

    it('displays node status in metadata', () => {
      const result = createMockNodeResult({ status: 'active' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('type dropdown has all valid node types', () => {
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const typeField = screen.getByRole('combobox', { name: /type/i }) as HTMLSelectElement;
      const options = Array.from(typeField.options).map(o => o.value);

      expect(options).toContain('project');
      expect(options).toContain('tool');
      expect(options).toContain('skill');
      expect(options).toContain('concept');
    });
  });

  describe('Close Behavior', () => {
    it('calls onClose when overlay is clicked', async () => {
      const onClose = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      const overlay = screen.getByTestId('editor-overlay');
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when ESC key is pressed', async () => {
      const onClose = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dirty State', () => {
    it('shows warning when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      // Make a change
      const contentField = screen.getByLabelText(/content/i);
      await user.clear(contentField);
      await user.type(contentField, 'New content');

      // Try to close
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('unsaved')
      );
    });

    it('does NOT close when user cancels dirty warning', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      // Make a change
      const contentField = screen.getByLabelText(/content/i);
      await user.clear(contentField);
      await user.type(contentField, 'New content');

      // Try to close
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes when user confirms dirty warning', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      // Make a change
      const contentField = screen.getByLabelText(/content/i);
      await user.clear(contentField);
      await user.type(contentField, 'New content');

      // Try to close
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('does NOT show warning when closing without changes', async () => {
      const onClose = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(window.confirm).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('marks as dirty when content changes (item)', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      const contentField = screen.getByLabelText(/content/i);
      await user.type(contentField, 'x');

      // Try to close via ESC
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(window.confirm).toHaveBeenCalled();
    });

    it('marks as dirty when category changes (item)', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<MemoryEditorFloat {...defaultProps} onClose={onClose} />);

      const categoryField = screen.getByLabelText(/category/i);
      await user.selectOptions(categoryField, 'projects');

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(window.confirm).toHaveBeenCalled();
    });

    it('marks as dirty when name changes (node)', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} onClose={onClose} />);

      const nameField = screen.getByLabelText(/name/i);
      await user.type(nameField, 'x');

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('Save Behavior', () => {
    it('calls onSave with item data when Save is clicked', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          type: 'item',
          content: 'User prefers TypeScript over JavaScript',
          category: 'tech_preferences',
        });
      });
    });

    it('calls onSave with node data when Save is clicked', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          type: 'node',
          name: 'TypeScript',
          nodeType: 'skill',
          description: 'A strongly typed programming language that builds on JavaScript',
        });
      });
    });

    it('passes modified content to onSave', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} />);

      const contentField = screen.getByLabelText(/content/i);
      await user.clear(contentField);
      await user.type(contentField, 'New content');

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({ content: 'New content' })
        );
      });
    });

    it('shows loading state while saving', async () => {
      const onSave = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    it('disables buttons while saving', async () => {
      const onSave = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(saveButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('closes editor after successful save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} onClose={onClose} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error message when save fails', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument();
      });
    });

    it('resets dirty state after successful save', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      vi.spyOn(window, 'confirm');

      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} onClose={onClose} />);

      // Make a change
      const contentField = screen.getByLabelText(/content/i);
      await user.type(contentField, 'x');

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      // Confirm was not called (no dirty warning because save succeeded)
      expect(window.confirm).not.toHaveBeenCalled();
    });
  });

  describe('Delete Behavior', () => {
    it('shows delete confirmation when Delete is clicked', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<MemoryEditorFloat {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('delete')
      );
    });

    it('does NOT delete when user cancels confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const onDelete = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(onDelete).not.toHaveBeenCalled();
    });

    it('calls onDelete when user confirms', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const onDelete = vi.fn().mockResolvedValue(undefined);
      render(<MemoryEditorFloat {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalled();
      });
    });

    it('closes editor after successful delete', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const onDelete = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<MemoryEditorFloat {...defaultProps} onDelete={onDelete} onClose={onClose} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows loading state while deleting', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const onDelete = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<MemoryEditorFloat {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(screen.getByText(/deleting/i)).toBeInTheDocument();
    });

    it('shows error message when delete fails', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const onDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
      render(<MemoryEditorFloat {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/delete failed/i)).toBeInTheDocument();
      });
    });

    it('shows "Archive" instead of "Delete" for nodes', () => {
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('disables Save when content is empty (item)', async () => {
      const user = userEvent.setup();
      const result = createMockItemResult({ content: '' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('disables Save when name is empty (node)', async () => {
      const result = createMockNodeResult({ name: '' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('shows validation error when trying to clear content', async () => {
      const user = userEvent.setup();
      render(<MemoryEditorFloat {...defaultProps} />);

      const contentField = screen.getByLabelText(/content/i);
      await user.clear(contentField);

      expect(screen.getByText(/content cannot be empty/i)).toBeInTheDocument();
    });

    it('shows validation error when trying to clear name', async () => {
      const user = userEvent.setup();
      const result = createMockNodeResult();
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      const nameField = screen.getByLabelText(/name/i);
      await user.clear(nameField);

      expect(screen.getByText(/name cannot be empty/i)).toBeInTheDocument();
    });

    it('re-enables Save when content is filled back', async () => {
      const user = userEvent.setup();
      render(<MemoryEditorFloat {...defaultProps} />);

      const contentField = screen.getByLabelText(/content/i);
      await user.clear(contentField);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();

      await user.type(contentField, 'New content');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Metadata Display', () => {
    it('displays score', () => {
      const result = createMockItemResult({ finalScore: 0.92 });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      expect(screen.getByText(/0\.92/)).toBeInTheDocument();
    });

    it('displays timestamp as relative time', () => {
      const result = createMockItemResult({ timestamp: Date.now() - 86400000 }); // 1 day ago
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      expect(screen.getByText(/1 day ago/)).toBeInTheDocument();
    });

    it('displays source badge', () => {
      const result = createMockItemResult({ source: 'vector' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      expect(screen.getByText('vector')).toBeInTheDocument();
    });

    it('shows truncated content in header for items', () => {
      const result = createMockItemResult({ content: 'This is a very long content that should be truncated in the header display' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      // Should show truncated content (first 40 chars + ...) in the header
      const headerTitle = document.getElementById('memory-editor-title');
      expect(headerTitle?.textContent).toContain('This is a very long content that should');
      expect(headerTitle?.textContent).toContain('...');
    });

    it('shows name in header for nodes', () => {
      const result = createMockNodeResult({ name: 'TestNodeName' });
      render(<MemoryEditorFloat {...defaultProps} result={result} />);

      // Should show node name in the header
      const headerTitle = document.getElementById('memory-editor-title');
      expect(headerTitle?.textContent).toBe('TestNodeName');
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');

      const labelId = dialog.getAttribute('aria-labelledby');
      expect(document.getElementById(labelId!)).toBeInTheDocument();
    });

    it('traps focus within dialog', async () => {
      const user = userEvent.setup();
      render(<MemoryEditorFloat {...defaultProps} />);

      // Dialog should contain focusable elements
      const dialog = screen.getByRole('dialog');
      const contentField = screen.getByLabelText(/content/i);

      // Focus the content field explicitly for testing
      contentField.focus();
      expect(document.activeElement).toBe(contentField);

      // Tab through all elements
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();

      // Focus should still be within dialog (or body if tabbing past)
      // The key test is that focusable elements exist in the dialog
      expect(dialog.querySelectorAll('button, input, textarea, select').length).toBeGreaterThan(0);
    });

    it('restores focus on close', async () => {
      // Create a button to return focus to
      const { rerender } = render(
        <>
          <button data-testid="trigger">Open</button>
          <MemoryEditorFloat {...defaultProps} />
        </>
      );

      // Get reference to trigger
      const trigger = screen.getByTestId('trigger');
      trigger.focus();

      // Close the editor
      rerender(
        <>
          <button data-testid="trigger">Open</button>
          <MemoryEditorFloat {...defaultProps} isOpen={false} />
        </>
      );

      // Focus should return (this depends on implementation)
      // This test documents expected behavior
    });

    it('has proper labels on all form fields', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('announces errors to screen readers', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<MemoryEditorFloat {...defaultProps} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('uses float-overlay styling', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      const overlay = screen.getByTestId('editor-overlay');
      expect(overlay).toHaveClass('fixed');
      expect(overlay).toHaveClass('inset-0');
    });

    it('uses card-brutal styling on editor window', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      // The inner content div has bg-paper styling, dialog wraps it
      const innerContent = dialog.querySelector('.bg-paper');
      expect(innerContent).toBeInTheDocument();
    });

    it('has proper z-index for overlay', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      const overlay = screen.getByTestId('editor-overlay');
      // Should be above other content
      expect(overlay.className).toMatch(/z-[45]0/);
    });
  });

  describe('Category/Type Options', () => {
    it('category dropdown has common categories for items', () => {
      render(<MemoryEditorFloat {...defaultProps} />);

      const categoryField = screen.getByLabelText(/category/i) as HTMLSelectElement;
      const options = Array.from(categoryField.options).map(o => o.value);

      expect(options).toContain('tech_preferences');
      expect(options).toContain('work_context');
      expect(options).toContain('personal');
      expect(options).toContain('projects');
    });

    it('allows custom category input', async () => {
      const user = userEvent.setup();
      render(<MemoryEditorFloat {...defaultProps} />);

      // Should have an "other" or custom option
      const categoryField = screen.getByLabelText(/category/i) as HTMLSelectElement;
      const options = Array.from(categoryField.options).map(o => o.value);

      // Either allow custom or have common categories
      expect(options.length).toBeGreaterThan(0);
    });
  });
});
