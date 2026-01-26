import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';

/**
 * Editable data for graph nodes
 * Only description is editable; name and type are read-only
 */
export interface EditableNodeData {
  type: 'node';
  description?: string;
}

/**
 * Editable data for graph edges
 */
export interface EditableEdgeData {
  type: 'edge';
  relationship: string;
  weight: number;
  context?: string;
}

/**
 * Union type for all editable graph entities
 */
export type EditableGraphEntity = EditableNodeData | EditableEdgeData;

/**
 * Type for entity that can be edited (node or edge)
 */
export type GraphEntity = Doc<'graphNodes'> | Doc<'graphEdges'>;

/**
 * Type for entity type identifier
 */
export type EntityType = 'node' | 'edge';

/**
 * Return type for useGraphEditor hook
 */
export interface UseGraphEditorReturn {
  /** Whether the editor is open */
  isOpen: boolean;
  /** The entity being edited (node or edge) */
  entity: GraphEntity | null;
  /** The entity type ('node' or 'edge') */
  entityType: EntityType | null;
  /** Source rectangle for FLIP animation */
  sourceRect: DOMRect | null;
  /** Whether a save/archive operation is in progress */
  isLoading: boolean;
  /** Error message from last operation */
  error: string | null;
  /** Open the editor with an entity */
  open: (entityType: EntityType, entityId: string, rect: DOMRect) => void;
  /** Close the editor */
  close: () => void;
  /** Save the edited data */
  save: (data: EditableGraphEntity) => Promise<void>;
  /** Archive node or delete edge */
  archive: () => Promise<void>;
}

/**
 * useGraphEditor hook - manages state for the graph editor
 *
 * Handles opening/closing the editor, saving changes to Nodes or Edges,
 * and archiving/deleting entities. Integrates with Convex mutations.
 *
 * @returns Editor state and control functions
 *
 * @example
 * ```tsx
 * const editor = useGraphEditor();
 *
 * // Open editor when node is clicked
 * const handleNodeClick = (nodeId, rect) => {
 *   editor.open('node', nodeId, rect);
 * };
 *
 * // Render the editor
 * <GraphEditorFloat
 *   isOpen={editor.isOpen}
 *   entity={editor.entity}
 *   sourceRect={editor.sourceRect}
 *   onSave={editor.save}
 *   onArchive={editor.archive}
 *   onClose={editor.close}
 * />
 * ```
 */
export function useGraphEditor(): UseGraphEditorReturn {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldOpen, setShouldOpen] = useState(false);

  // Fetch entity data based on type and ID
  const nodeData = useQuery(
    api.graph.getNode,
    entityType === 'node' && entityId ? { nodeId: entityId as Id<'graphNodes'> } : 'skip'
  );

  const edgeData = useQuery(
    api.graph.getEdge,
    entityType === 'edge' && entityId ? { edgeId: entityId as Id<'graphEdges'> } : 'skip'
  );

  // Determine current entity
  const entity: GraphEntity | null = entityType === 'node' ? nodeData ?? null : entityType === 'edge' ? edgeData ?? null : null;

  // Convex mutations
  const updateNodeMutation = useMutation(api.graph.updateNode);
  const archiveNodeMutation = useMutation(api.graph.archiveNode);
  const deleteEdgeMutation = useMutation(api.graph.deleteEdge);
  const updateEdgeMutation = useMutation(api.graph.updateEdge);

  /**
   * Open the editor with an entity
   */
  const open = useCallback((type: EntityType, id: string, rect: DOMRect) => {
    setEntityType(type);
    setEntityId(id);
    setSourceRect(rect);
    setError(null);
    setShouldOpen(true);
  }, []);

  /**
   * Effect to open editor once entity data is loaded
   */
  useEffect(() => {
    if (shouldOpen && entityType && entityId && entity && !isOpen) {
      setIsOpen(true);
      setShouldOpen(false);
    }
  }, [shouldOpen, entityType, entityId, entity, isOpen]);

  /**
   * Close the editor
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    // Keep entityType, entityId, entity, and sourceRect for potential FLIP animation on re-open
  }, []);

  /**
   * Save the edited data
   */
  const save = useCallback(async (data: EditableGraphEntity): Promise<void> => {
    if (!entity) {
      setError('No entity to save');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (data.type === 'node') {
        // Update node via mutation
        if (!('name' in entity)) {
          throw new Error('Entity is not a node');
        }

        await updateNodeMutation({
          nodeId: entity._id as Id<'graphNodes'>,
          properties: {
            description: data.description,
          },
        });
      } else if (data.type === 'edge') {
        // Update edge (weight and/or context) via mutation
        if (!('weight' in entity)) {
          throw new Error('Entity is not an edge');
        }

        await updateEdgeMutation({
          edgeId: entity._id as Id<'graphEdges'>,
          relationship: data.relationship,
          weight: data.weight,
          context: data.context,
        });
      }

      setIsOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setError(errorMessage);
      // Don't close on error - keep editor open
    } finally {
      setIsLoading(false);
    }
  }, [entity, updateNodeMutation, updateEdgeMutation]);

  /**
   * Archive node or delete edge
   */
  const archive = useCallback(async (): Promise<void> => {
    if (!entity) {
      setError('No entity to archive');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (entityType === 'node') {
        // Soft delete (archive) for nodes
        if (!('name' in entity)) {
          throw new Error('Entity is not a node');
        }

        await archiveNodeMutation({
          nodeId: entity._id as Id<'graphNodes'>,
        });
      } else if (entityType === 'edge') {
        // Soft delete (archive) for edges
        if (!('weight' in entity)) {
          throw new Error('Entity is not an edge');
        }

        await deleteEdgeMutation({
          edgeId: entity._id as Id<'graphEdges'>,
        });
      }

      setIsOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Archive failed';
      setError(errorMessage);
      // Don't close on error
    } finally {
      setIsLoading(false);
    }
  }, [entity, entityType, archiveNodeMutation, deleteEdgeMutation]);

  return {
    isOpen,
    entity,
    entityType,
    sourceRect,
    isLoading,
    error,
    open,
    close,
    save,
    archive,
  };
}
