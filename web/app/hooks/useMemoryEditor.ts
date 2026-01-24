import { useState, useCallback } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { MergedResult } from '../components/search/types';
import { EditableData } from '../components/explorer/MemoryEditorFloat';
import { Id } from '../../../convex/_generated/dataModel';

/**
 * Return type for useMemoryEditor hook
 */
export interface UseMemoryEditorReturn {
  /** Whether the editor is open */
  isOpen: boolean;
  /** The memory result being edited */
  result: MergedResult | null;
  /** Source rectangle for FLIP animation */
  sourceRect: DOMRect | null;
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Whether a save/delete operation is in progress */
  isLoading: boolean;
  /** Error message from last operation */
  error: string | null;
  /** Open the editor with a result */
  open: (result: MergedResult, rect: DOMRect) => void;
  /** Close the editor */
  close: () => void;
  /** Save the edited data */
  save: (data: EditableData) => Promise<void>;
  /** Delete the current memory */
  deleteMemory: () => Promise<void>;
  /** Set dirty state manually */
  setDirty: (dirty: boolean) => void;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * useMemoryEditor hook - manages state for the float editor
 *
 * Handles opening/closing the editor, saving changes to Items or Nodes,
 * and deleting memories. Integrates with Convex mutations/actions.
 *
 * @returns Editor state and control functions
 *
 * @example
 * ```tsx
 * const editor = useMemoryEditor();
 *
 * // Open editor when card is clicked
 * const handleCardClick = (result, rect) => {
 *   editor.open(result, rect);
 * };
 *
 * // Render the editor
 * <MemoryEditorFloat
 *   isOpen={editor.isOpen}
 *   result={editor.result}
 *   sourceRect={editor.sourceRect}
 *   onSave={editor.save}
 *   onDelete={editor.deleteMemory}
 *   onClose={editor.close}
 * />
 * ```
 */
export function useMemoryEditor(): UseMemoryEditorReturn {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<MergedResult | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convex actions and mutations
  const updateItemAction = useAction(api.items.updateItem);
  const deleteItemMutation = useMutation(api.items.deleteItem);
  const updateNodeMutation = useMutation(api.graph.updateNode);
  const archiveNodeMutation = useMutation(api.graph.archiveNode);

  /**
   * Open the editor with a result
   */
  const open = useCallback((newResult: MergedResult, rect: DOMRect) => {
    setResult(newResult);
    setSourceRect(rect);
    setIsOpen(true);
    setIsDirty(false);
    setError(null);
  }, []);

  /**
   * Close the editor
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    // Keep result and sourceRect for potential FLIP animation on re-open
  }, []);

  /**
   * Save the edited data
   */
  const save = useCallback(async (data: EditableData): Promise<void> => {
    if (!result) {
      setError('No result to save');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (data.type === 'item') {
        // Update item via action (handles embedding regeneration)
        if (!result.itemId) {
          throw new Error('Item ID is missing');
        }

        await updateItemAction({
          itemId: result.itemId as Id<'items'>,
          content: data.content,
          category: data.category,
        });
      } else if (data.type === 'node') {
        // Update node via mutation
        if (!result.nodeId) {
          throw new Error('Node ID is missing');
        }

        await updateNodeMutation({
          nodeId: result.nodeId as Id<'graphNodes'>,
          properties: {
            description: data.description,
          },
        });

        // Note: Currently updateNode only updates properties.
        // If name or type changes are needed, a new action would be required
        // similar to updateItem that handles embedding regeneration.
      }

      setIsDirty(false);
      setIsOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setError(errorMessage);
      // Don't close on error - keep editor open
    } finally {
      setIsLoading(false);
    }
  }, [result, updateItemAction, updateNodeMutation]);

  /**
   * Delete the current memory
   */
  const deleteMemory = useCallback(async (): Promise<void> => {
    if (!result) {
      setError('No result to delete');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (result.type === 'item') {
        // Hard delete for items
        if (!result.itemId) {
          throw new Error('Item ID is missing');
        }

        await deleteItemMutation({
          itemId: result.itemId as Id<'items'>,
        });
      } else if (result.type === 'node') {
        // Soft delete (archive) for nodes
        if (!result.nodeId) {
          throw new Error('Node ID is missing');
        }

        await archiveNodeMutation({
          nodeId: result.nodeId as Id<'graphNodes'>,
        });
      }

      setIsDirty(false);
      setIsOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      // Don't close on error
    } finally {
      setIsLoading(false);
    }
  }, [result, deleteItemMutation, archiveNodeMutation]);

  /**
   * Set dirty state manually
   */
  const setDirtyState = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isOpen,
    result,
    sourceRect,
    isDirty,
    isLoading,
    error,
    open,
    close,
    save,
    deleteMemory,
    setDirty: setDirtyState,
    clearError,
  };
}
