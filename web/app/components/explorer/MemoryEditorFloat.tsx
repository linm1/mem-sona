import {
  useState,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
  ChangeEvent,
  FormEvent,
} from 'react';
import { MergedResult } from '../search/types';
import { TypeBadge, SourceBadge } from '../search/badges';
import { formatRelativeTime } from '../../utils/formatters';

/**
 * Discriminated union for editable data
 */
export type EditableData =
  | { type: 'item'; content: string; category: string }
  | { type: 'node'; name: string; nodeType: string; description: string };

/**
 * Props for MemoryEditorFloat component
 */
interface MemoryEditorFloatProps {
  /** Whether the editor is open */
  isOpen: boolean;
  /** The memory result to edit */
  result: MergedResult | null;
  /** Source rectangle for FLIP animation */
  sourceRect: DOMRect | null;
  /** Callback when save is triggered */
  onSave: (data: EditableData) => Promise<void>;
  /** Callback when delete is triggered */
  onDelete: () => Promise<void>;
  /** Callback when editor is closed */
  onClose: () => void;
}

/**
 * Available categories for items
 */
const ITEM_CATEGORIES = [
  'tech_preferences',
  'work_context',
  'personal',
  'projects',
  'skills',
  'tools',
  'concepts',
] as const;

/**
 * Available types for nodes
 */
const NODE_TYPES = ['project', 'tool', 'skill', 'concept'] as const;

/**
 * MemoryEditorFloat component - FLIP-animated float window editor
 *
 * Handles editing both Items (atomic facts) and GraphNodes (entities)
 * with a unified layout that dynamically shows fields based on result type.
 *
 * Features:
 * - FLIP animation from card position to center
 * - Unified layout with dynamic fields based on result.type
 * - Dirty state tracking with unsaved changes warning
 * - Keyboard navigation (ESC to close)
 * - Form validation
 * - Loading states for save/delete
 * - Accessibility (dialog role, focus trap, aria attributes)
 *
 * @example
 * ```tsx
 * <MemoryEditorFloat
 *   isOpen={isOpen}
 *   result={selectedResult}
 *   sourceRect={cardRect}
 *   onSave={handleSave}
 *   onDelete={handleDelete}
 *   onClose={handleClose}
 * />
 * ```
 */
export function MemoryEditorFloat({
  isOpen,
  result,
  sourceRect,
  onSave,
  onDelete,
  onClose,
}: MemoryEditorFloatProps) {
  // Form state
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState('');
  const [description, setDescription] = useState('');

  // UI state
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const titleId = 'memory-editor-title';

  // Initialize form state when result changes
  useEffect(() => {
    if (result) {
      if (result.type === 'item') {
        setContent(result.content || '');
        setCategory(result.category || 'tech_preferences');
        setName('');
        setNodeType('');
        setDescription('');
      } else {
        setName(result.name || '');
        setNodeType(result.nodeType || 'concept');
        setDescription(result.description || '');
        setContent('');
        setCategory('');
      }
      setIsDirty(false);
      setError(null);
      setValidationError(null);
    }
  }, [result]);

  // Focus first field when opening
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      // Delay to allow animation to start
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
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  // Validate primary field
  const validatePrimaryField = useCallback(() => {
    if (result?.type === 'item') {
      if (!content.trim()) {
        setValidationError('Content cannot be empty');
        return false;
      }
    } else if (result?.type === 'node') {
      if (!name.trim()) {
        setValidationError('Name cannot be empty');
        return false;
      }
    }
    setValidationError(null);
    return true;
  }, [result?.type, content, name]);

  // Check if primary field is valid
  const isPrimaryFieldValid = useCallback(() => {
    if (result?.type === 'item') {
      return content.trim().length > 0;
    } else if (result?.type === 'node') {
      return name.trim().length > 0;
    }
    return false;
  }, [result?.type, content, name]);

  // Handle close with dirty check
  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) {
        return;
      }
    }
    onClose();
  }, [isDirty, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Handle content change (item)
  const handleContentChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
    if (!e.target.value.trim()) {
      setValidationError('Content cannot be empty');
    } else {
      setValidationError(null);
    }
  }, []);

  // Handle category change (item)
  const handleCategoryChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setIsDirty(true);
  }, []);

  // Handle name change (node)
  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setIsDirty(true);
    if (!e.target.value.trim()) {
      setValidationError('Name cannot be empty');
    } else {
      setValidationError(null);
    }
  }, []);

  // Handle type change (node)
  const handleTypeChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setNodeType(e.target.value);
    setIsDirty(true);
  }, []);

  // Handle description change (node)
  const handleDescriptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setIsDirty(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validatePrimaryField()) {
      return;
    }

    setIsLoading(true);
    setLoadingAction('save');
    setError(null);

    try {
      if (result?.type === 'item') {
        await onSave({
          type: 'item',
          content: content.trim(),
          category,
        });
      } else if (result?.type === 'node') {
        await onSave({
          type: 'node',
          name: name.trim(),
          nodeType,
          description: description.trim(),
        });
      }
      setIsDirty(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }, [result?.type, content, category, name, nodeType, description, onSave, onClose, validatePrimaryField]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    const actionName = result?.type === 'node' ? 'archive' : 'delete';
    const confirmed = window.confirm(`Are you sure you want to ${actionName} this memory?`);
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setLoadingAction('delete');
    setError(null);

    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }, [result?.type, onDelete, onClose]);

  // Don't render if not open or no result
  if (!isOpen || !result) {
    return null;
  }

  const isItem = result.type === 'item';
  const relativeTime = formatRelativeTime(result.timestamp);
  const displayId = isItem ? result.itemId : result.nodeId;

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
              '--flip-start-x': `${sourceRect.left + sourceRect.width / 2 - window.innerWidth / 2}px`,
              '--flip-start-y': `${sourceRect.top + sourceRect.height / 2 - window.innerHeight / 2}px`,
            } as React.CSSProperties),
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-ink bg-ink text-paper">
            <div className="flex items-center gap-3">
              <TypeBadge type={result.type} />
              <span id={titleId} className="font-mono text-sm truncate max-w-[200px]">
                {displayId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 hover:bg-paper/20 transition-colors"
              aria-label="Close"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Error Alert */}
            {error && (
              <div role="alert" className="p-3 bg-highlight/10 border border-highlight text-highlight text-sm font-mono">
                {error}
              </div>
            )}

            {/* Validation Error */}
            {validationError && (
              <div className="text-highlight text-xs font-mono">
                {validationError}
              </div>
            )}

            {/* Item Fields */}
            {isItem && (
              <>
                {/* Content */}
                <div>
                  <label
                    htmlFor="editor-content"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Content
                  </label>
                  <textarea
                    ref={firstFocusableRef as React.RefObject<HTMLTextAreaElement>}
                    id="editor-content"
                    value={content}
                    onChange={handleContentChange}
                    className="w-full h-32 p-3 border-2 border-ink font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Memory content..."
                    disabled={isLoading}
                  />
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="editor-category"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Category
                  </label>
                  <select
                    id="editor-category"
                    value={category}
                    onChange={handleCategoryChange}
                    className="w-full p-3 border-2 border-ink font-mono text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={isLoading}
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Node Fields */}
            {!isItem && (
              <>
                {/* Name */}
                <div>
                  <label
                    htmlFor="editor-name"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Name
                  </label>
                  <input
                    ref={firstFocusableRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    id="editor-name"
                    value={name}
                    onChange={handleNameChange}
                    className="w-full p-3 border-2 border-ink font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Entity name..."
                    disabled={isLoading}
                  />
                </div>

                {/* Type */}
                <div>
                  <label
                    htmlFor="editor-type"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Type
                  </label>
                  <select
                    id="editor-type"
                    value={nodeType}
                    onChange={handleTypeChange}
                    className="w-full p-3 border-2 border-ink font-mono text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={isLoading}
                  >
                    {NODE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="editor-description"
                    className="block font-mono uppercase tracking-wide text-xs text-muted mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="editor-description"
                    value={description}
                    onChange={handleDescriptionChange}
                    className="w-full h-24 p-3 border-2 border-ink font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Entity description..."
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {/* Metadata (Read-only) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-paper border border-ink">
              <div>
                <span className="font-mono uppercase tracking-wide text-xs text-muted block">Score</span>
                <span className="font-mono text-sm font-bold text-ink">
                  {result.finalScore.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="font-mono uppercase tracking-wide text-xs text-muted block">Source</span>
                <SourceBadge source={result.source} />
              </div>
              <div>
                <span className="font-mono uppercase tracking-wide text-xs text-muted block">Age</span>
                <span className="font-mono text-sm text-ink">{relativeTime}</span>
              </div>
              {isItem && result.accessCount !== undefined && (
                <div>
                  <span className="font-mono uppercase tracking-wide text-xs text-muted block">Accessed</span>
                  <span className="font-mono text-sm text-ink">{result.accessCount}x</span>
                </div>
              )}
              {!isItem && result.status && (
                <div>
                  <span className="font-mono uppercase tracking-wide text-xs text-muted block">Status</span>
                  <span className="font-mono text-sm text-ink">{result.status}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t-2 border-ink">
            {/* Delete/Archive Button */}
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 border-2 border-highlight text-highlight font-mono text-sm uppercase hover:bg-highlight hover:text-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              aria-label={isItem ? 'Delete' : 'Archive'}
            >
              {loadingAction === 'delete' ? (
                'Deleting...'
              ) : isItem ? (
                'Delete'
              ) : (
                'Archive'
              )}
            </button>

            {/* Cancel/Save Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
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
                disabled={isLoading || !isPrimaryFieldValid()}
                aria-label="Save"
              >
                {loadingAction === 'save' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
