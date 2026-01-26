'use client';

import { useEffect, useRef } from 'react';
import type { NodeType, ConnectedEdge } from './types';

/**
 * Props for NodeInfoPanel component.
 */
interface NodeInfoPanelProps {
  /** Node ID */
  id: string;
  /** Node display label */
  label: string;
  /** Node type (project, tool, skill, concept) */
  type: NodeType;
  /** Optional description */
  description?: string;
  /** Connected edges */
  edges: ConnectedEdge[];
  /** Callback to close the panel */
  onClose: () => void;
  /** Optional callback to edit an edge */
  onEditEdge?: (edgeId: string) => void;
  /** Optional callback to archive/delete an edge */
  onArchiveEdge?: (edgeId: string) => void;
}

/**
 * Type badge color mapping.
 */
const TYPE_COLORS: Record<NodeType, string> = {
  project: 'bg-highlight text-paper',
  tool: 'bg-muted text-paper',
  skill: 'bg-accent text-paper',
  concept: 'bg-ink text-paper',
};

/**
 * Node information panel displayed when a node is clicked.
 * Shows node details and connected edges.
 * Styled to match the neo-brutalist design system.
 */
export function NodeInfoPanel({
  id,
  label,
  type,
  description,
  edges,
  onClose,
  onEditEdge,
  onArchiveEdge,
}: NodeInfoPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when panel opens for accessibility
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Group edges by direction
  const outgoingEdges = edges.filter((e) => e.direction === 'outgoing');
  const incomingEdges = edges.filter((e) => e.direction === 'incoming');

  // Count edges by target type
  const typeCounts = edges.reduce(
    (acc, edge) => {
      acc[edge.targetType] = (acc[edge.targetType] || 0) + 1;
      return acc;
    },
    {} as Record<NodeType, number>
  );

  return (
    <div
      data-testid="node-info-panel"
      className="absolute bottom-3 left-3 right-3 bg-paper border border-ink p-4 shadow-brutal z-20"
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-0.5 text-xs font-mono-brutal uppercase ${TYPE_COLORS[type]}`}
        >
          {type}
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="text-ink hover:text-highlight transition-colors p-1"
          aria-label="Close panel"
          title="Close"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Node name */}
      <h4 className="font-bold text-ink text-base mb-1">{label}</h4>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted mb-3 leading-relaxed">{description}</p>
      )}

      {/* Edge counts by type */}
      {edges.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {(Object.entries(typeCounts) as [NodeType, number][]).map(
            ([nodeType, count]) => (
              <span
                key={nodeType}
                className={`text-xs font-mono ${
                  nodeType === 'project'
                    ? 'text-highlight'
                    : nodeType === 'skill'
                      ? 'text-accent'
                      : 'text-muted'
                }`}
              >
                {count} {nodeType}
                {count !== 1 ? 's' : ''}
              </span>
            )
          )}
        </div>
      )}

      {/* Connected edges list (collapsible) */}
      {edges.length > 0 && (
        <details className="group">
          <summary className="text-xs font-mono-brutal text-muted cursor-pointer hover:text-ink mb-2">
            {edges.length} connection{edges.length !== 1 ? 's' : ''}
          </summary>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {/* Outgoing edges */}
            {outgoingEdges.map((edge) => (
              <EdgeItem
                key={edge.id}
                edge={edge}
                onEdit={onEditEdge}
                onArchive={onArchiveEdge}
              />
            ))}
            {/* Incoming edges */}
            {incomingEdges.map((edge) => (
              <EdgeItem
                key={edge.id}
                edge={edge}
                onEdit={onEditEdge}
                onArchive={onArchiveEdge}
              />
            ))}
          </div>
        </details>
      )}

      {/* Empty state */}
      {edges.length === 0 && (
        <p className="text-xs text-muted italic">No connections</p>
      )}
    </div>
  );
}

/**
 * Individual edge item in the connections list.
 */
function EdgeItem({
  edge,
  onEdit,
  onArchive,
}: {
  edge: ConnectedEdge;
  onEdit?: (edgeId: string) => void;
  onArchive?: (edgeId: string) => void;
}) {
  const arrow = edge.direction === 'outgoing' ? '→' : '←';
  const relationshipLabel =
    edge.direction === 'outgoing'
      ? edge.relationship
      : `${edge.relationship} (by)`;

  const showActions = onEdit || onArchive;

  return (
    <div
      data-testid="edge-item"
      className={`flex items-center gap-2 text-xs ${
        showActions ? 'hover:bg-muted hover:bg-opacity-10 p-1 -mx-1 rounded transition-colors' : ''
      }`}
    >
      <span className="text-muted">{arrow}</span>
      <span className="font-mono text-accent">{relationshipLabel}</span>
      <span className="text-muted">{arrow}</span>
      <span
        className={`px-1.5 py-0.5 border border-ink font-mono uppercase ${TYPE_COLORS[edge.targetType]}`}
        style={{ fontSize: '10px' }}
      >
        {edge.targetLabel}
      </span>
      {edge.status !== 'active' && (
        <span className="text-muted italic">({edge.status})</span>
      )}

      {/* Action buttons (only shown if callbacks provided) */}
      {showActions && (
        <div className="ml-auto flex gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(edge.id)}
              className="p-0.5 hover:text-highlight transition-colors"
              aria-label="Edit connection"
              title="Edit"
            >
              <EditIcon />
            </button>
          )}
          {onArchive && (
            <button
              type="button"
              onClick={() => onArchive(edge.id)}
              className="p-0.5 hover:text-red-500 transition-colors"
              aria-label="Delete connection"
              title="Delete"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Close icon (X).
 */
function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * Edit icon (pencil).
 */
function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

/**
 * Delete icon (trash).
 */
function DeleteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export type { NodeInfoPanelProps };
