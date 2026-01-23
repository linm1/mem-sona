/**
 * Loading state for graph viewer.
 * Displays spinner and loading message.
 */
export function GraphLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4"
    >
      <div className="w-12 h-12 border-4 border-ink border-t-accent animate-spin" />
      <p className="font-mono text-sm text-muted uppercase tracking-wide">
        Loading graph...
      </p>
    </div>
  );
}

/**
 * Empty state when no graph data exists.
 * Guides user to add data via MCP tools.
 */
export function GraphEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-6">
      {/* Empty graph illustration */}
      <div className="w-20 h-20 flex items-center justify-center">
        <svg
          className="w-full h-full text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          {/* Node circles */}
          <circle cx="12" cy="12" r="3" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          {/* Dashed connection lines */}
          <path d="M5 7v10M19 7v10M7 5h10M7 19h10" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <h3 className="font-mono text-lg font-bold uppercase tracking-wide">
          No Nodes Found
        </h3>
        <p className="text-muted text-sm max-w-md">
          Your knowledge graph is empty. Add entities using the MCP tools to see
          them visualized here.
        </p>
      </div>
    </div>
  );
}

/**
 * Props for GraphErrorState component.
 */
interface GraphErrorStateProps {
  /** Error message to display, or undefined for default */
  message?: string;
}

/**
 * Error state for graph loading failures.
 * Displays error icon and message.
 */
export function GraphErrorState({ message }: GraphErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4"
    >
      {/* Error icon */}
      <div className="w-16 h-16 flex items-center justify-center">
        <svg
          className="w-full h-full text-danger"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error message */}
      <p className="text-center text-danger font-medium">
        {message || 'Failed to load graph data'}
      </p>
    </div>
  );
}
