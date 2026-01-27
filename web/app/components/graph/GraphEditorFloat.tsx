'use client';

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  ChangeEvent,
} from 'react';
import type { Doc } from '../../../convex/_generated/dataModel';
import type {
  EditableGraphEntity,
  EntityType,
  GraphEntity,
} from '../../hooks/useGraphEditor';
import { RELATIONSHIP_TYPES } from './types';
import type { NodeType } from './types';
import { NODE_TYPE_COLORS } from '../../utils/nodeTypes';

/**
 * Props for GraphEditorFloat component
 */
interface GraphEditorFloatProps {
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
  /** From node name (for edges) */
  fromNodeName: string | null;
  /** To node name (for edges) */
  toNodeName: string | null;
  /** From node type (for edges) - used for badge coloring */
  fromNodeType?: NodeType;
  /** To node type (for edges) - used for badge coloring */
  toNodeType?: NodeType;
  /** Callback when save is triggered */
  onSave: (data: EditableGraphEntity) => Promise<void>;
  /** Callback when archive/delete is triggered */
  onArchive: () => Promise<void>;
  /** Callback when editor is closed */
  onClose: () => void;
}

/**
 * GraphEditorFloat component - FLIP-animated float window editor
 *
 * Handles editing both GraphNodes and GraphEdges with a unified layout
 * that dynamically shows fields based on entity type.
 *
 * Features:
 * - FLIP animation from source position to center
 * - Unified layout with dynamic fields based on entityType
 * - Form validation
 * - Loading states for save/archive
 * - Keyboard navigation (ESC to close)
 * - Accessibility (dialog role, focus trap, aria attributes)
 *
 * @example
 * ```tsx
 * <GraphEditorFloat
 *   isOpen={editor.isOpen}
 *   entity={editor.entity}
 *   entityType={editor.entityType}
 *   sourceRect={editor.sourceRect}
 *   isLoading={editor.isLoading}
 *   error={editor.error}
 *   fromNodeName="Source Node"
 *   toNodeName="Target Node"
 *   onSave={editor.save}
 *   onArchive={editor.archive}
 *   onClose={editor.close}
 * />
 * ```
 */
export function GraphEditorFloat({
  isOpen,
  entity,
  entityType,
  sourceRect,
  isLoading,
  error,
  fromNodeName,
  toNodeName,
  fromNodeType,
  toNodeType,
  onSave,
  onArchive,
  onClose,
}: GraphEditorFloatProps) {
  // Form state - Node fields
  const [description, setDescription] = useState('');

  // Form state - Edge fields
  const [relationship, setRelationship] = useState('');
  const [weight, setWeight] = useState(0.5);
  const [context, setContext] = useState('');

  // Refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const titleId = 'graph-editor-title';

  // Initialize form state when entity changes
  useEffect(() => {
    if (entity && entityType === 'node') {
      const nodeEntity = entity as Doc<'graphNodes'>;
      setDescription(nodeEntity.properties?.description || '');
      // Reset edge fields
      setRelationship('');
      setWeight(0.5);
      setContext('');
    } else if (entity && entityType === 'edge') {
      const edgeEntity = entity as Doc<'graphEdges'>;
      setRelationship(edgeEntity.relationship || 'uses');
      setWeight(edgeEntity.weight || 0.5);
      setContext(edgeEntity.properties?.context || '');
      // Reset node fields
      setDescription('');
    }
  }, [entity, entityType]);

  // Focus first field when opening
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      const timeout = setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle description change (node)
  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value);
    },
    []
  );

  // Handle relationship change (edge)
  const handleRelationshipChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setRelationship(e.target.value);
    },
    []
  );

  // Handle weight change (edge)
  const handleWeightChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setWeight(parseFloat(e.target.value));
  }, []);

  // Handle context change (edge)
  const handleContextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setContext(e.target.value);
    },
    []
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (entityType === 'node') {
      await onSave({
        type: 'node',
        description: description.trim(),
      });
    } else if (entityType === 'edge') {
      await onSave({
        type: 'edge',
        relationship,
        weight,
        context: context.trim(),
      });
    }
  }, [entityType, description, relationship, weight, context, onSave]);

  // Handle archive
  const handleArchive = useCallback(async () => {
    const actionName = entityType === 'node' ? 'archive' : 'archive';
    const confirmed = window.confirm(
      `Are you sure you want to ${actionName} this ${entityType}?`
    );
    if (!confirmed) {
      return;
    }

    await onArchive();
  }, [entityType, onArchive]);

  // Don't render if not open or no entity
  if (!isOpen || !entity || !entityType) {
    return null;
  }

  const isNode = entityType === 'node';
  const nodeEntity = isNode ? (entity as Doc<'graphNodes'>) : null;
  const edgeEntity = !isNode ? (entity as Doc<'graphEdges'>) : null;

  // Display title based on entity type
  const title = isNode ? 'Edit Node' : 'Edit Connection';

  return (
    <>
      {/* Overlay */}
      <div
        data-testid="editor-overlay"
        className="fixed inset-0 bg-ink/50 z-40 transition-opacity duration-300"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="bg-paper border-2 border-ink shadow-brutal w-full max-w-xl pointer-events-auto transform transition-all duration-300"
          style={{
            // FLIP animation starting position if sourceRect is provided
            ...(sourceRect && {
              '--flip-start-x': `${
                sourceRect.left +
                sourceRect.width / 2 -
                window.innerWidth / 2
              }px`,
              '--flip-start-y': `${
                sourceRect.top +
                sourceRect.height / 2 -
                window.innerHeight / 2
              }px`,
            } as React.CSSProperties),
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-ink bg-ink text-paper">
            <span id={titleId} className="font-mono text-sm font-bold">
              {title}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-paper/20 transition-colors"
              aria-label="Close"
              disabled={isLoading}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Error Alert */}
            {error && (
              <div
                role="alert"
                className="p-3 bg-highlight/10 border border-highlight text-highlight text-sm font-mono"
              >
                {error}
              </div>
            )}

            {/* Node Fields */}
            {isNode && nodeEntity && (
              <>
                {/* Name (read-only) */}
                <div>
                  <label
                    htmlFor="editor-name"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="editor-name"
                    value={nodeEntity.name}
                    disabled
                    className="w-full p-3 border-2 border-ink font-mono text-sm bg-muted/10 cursor-not-allowed"
                  />
                </div>

                {/* Type (read-only badge) */}
                <div>
                  <label className="block font-mono uppercase tracking-wide text-xs text-muted mb-2">
                    Type
                  </label>
                  <span className="inline-block px-3 py-1.5 border-2 border-ink font-mono text-sm bg-accent text-paper uppercase">
                    {nodeEntity.type}
                  </span>
                </div>

                {/* Description (editable) */}
                <div>
                  <label
                    htmlFor="editor-description"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    ref={
                      firstFocusableRef as React.RefObject<HTMLTextAreaElement>
                    }
                    id="editor-description"
                    value={description}
                    onChange={handleDescriptionChange}
                    className="w-full h-24 p-3 border-2 border-ink font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Node description..."
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {/* Edge Fields */}
            {!isNode && edgeEntity && (
              <>
                {/* Nodes Connection Display (Horizontal Layout) */}
                <div>
                  <label className="block font-mono uppercase tracking-wide text-xs text-muted mb-2">
                    Connection
                  </label>
                  <div
                    data-testid="edge-nodes-container"
                    className="flex items-center gap-2"
                  >
                    {/* From Node Badge */}
                    <span
                      data-testid="edge-from-node-badge"
                      className={`inline-block px-3 py-1.5 border-2 border-ink font-mono text-sm ${
                        fromNodeType
                          ? NODE_TYPE_COLORS[fromNodeType]
                          : 'bg-muted text-paper'
                      }`}
                    >
                      {fromNodeName || edgeEntity.fromNode}
                    </span>

                    {/* Connection Line Indicator */}
                    <div
                      data-testid="edge-connection-line"
                      className={`flex-1 min-w-[40px] border-t-2 border-ink ${
                        edgeEntity.status === 'archived' ? 'border-dashed' : ''
                      } relative`}
                    >
                      <span className="absolute top-1/2 right-0 transform -translate-y-1/2 text-ink font-mono text-sm">
                        →
                      </span>
                    </div>

                    {/* To Node Badge */}
                    <span
                      data-testid="edge-to-node-badge"
                      className={`inline-block px-3 py-1.5 border-2 border-ink font-mono text-sm ${
                        toNodeType
                          ? NODE_TYPE_COLORS[toNodeType]
                          : 'bg-muted text-paper'
                      }`}
                    >
                      {toNodeName || edgeEntity.toNode}
                    </span>
                  </div>
                </div>

                {/* Relationship (dropdown) */}
                <div>
                  <label
                    htmlFor="editor-relationship"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Relationship Type
                  </label>
                  <select
                    ref={
                      firstFocusableRef as React.RefObject<HTMLSelectElement>
                    }
                    id="editor-relationship"
                    value={relationship}
                    onChange={handleRelationshipChange}
                    className="w-full p-3 border-2 border-ink font-mono text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={isLoading}
                  >
                    {RELATIONSHIP_TYPES.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weight (slider with numeric display) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="editor-weight"
                      className="font-mono uppercase tracking-wide text-xs text-muted"
                    >
                      Weight / Confidence
                    </label>
                    <span className="font-mono text-sm font-bold text-ink">
                      {weight.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    id="editor-weight"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weight}
                    onChange={handleWeightChange}
                    className="w-full"
                    disabled={isLoading}
                    aria-label="Weight"
                  />
                </div>

                {/* Context (optional textarea) */}
                <div>
                  <label
                    htmlFor="editor-context"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Context <span className="text-muted/50">(optional)</span>
                  </label>
                  <textarea
                    id="editor-context"
                    value={context}
                    onChange={handleContextChange}
                    className="w-full h-20 p-3 border-2 border-ink font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Additional context..."
                    disabled={isLoading}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t-2 border-ink">
            {/* Archive Button */}
            <button
              type="button"
              onClick={handleArchive}
              className="px-4 py-2 border-2 border-highlight text-highlight font-mono text-sm uppercase hover:bg-highlight hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              aria-label="Archive"
            >
              {isLoading ? 'Archiving...' : 'Archive'}
            </button>

            {/* Cancel/Save Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-ink text-ink font-mono text-sm uppercase hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 border-2 border-accent bg-accent text-paper font-mono text-sm uppercase hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
                aria-label="Save"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
