'use client';

/**
 * Loading state component with spinner and message.
 * Displays while search is in progress.
 */
export function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center py-16 space-y-4"
    >
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-ink border-t-accent animate-spin" />

      {/* Message */}
      <p className="font-mono-brutal text-sm text-muted">
        Searching memories...
      </p>
    </div>
  );
}

/**
 * Props for ErrorState component
 */
interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Error state component with retry functionality.
 * Displays when search fails.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const displayMessage = message || 'Something went wrong. Please try again.';

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-16 space-y-4"
    >
      {/* Error Icon */}
      <div className="w-16 h-16 flex items-center justify-center">
        <svg
          role="img"
          aria-hidden="true"
          className="w-full h-full text-danger"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Error Message */}
      <p className="text-center text-danger font-medium max-w-md">
        {displayMessage}
      </p>

      {/* Retry Button */}
      <button
        type="button"
        onClick={onRetry}
        className="btn-brutal-danger"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Props for EmptyState component
 */
interface EmptyStateProps {
  query: string;
}

/**
 * Empty state component with helpful suggestions.
 * Displays when search returns no results.
 */
export function EmptyState({ query }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      {/* Empty Icon */}
      <div className="w-20 h-20 flex items-center justify-center">
        <svg
          role="img"
          aria-hidden="true"
          className="w-full h-full text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        {query ? (
          <>
            <h3 className="font-mono-brutal text-lg">
              No results found for "{query}"
            </h3>
            <p className="text-muted text-sm">
              Try different keywords or check your spelling
            </p>
          </>
        ) : (
          <>
            <h3 className="font-mono-brutal text-lg">
              No results found
            </h3>
            <p className="text-muted text-sm">
              Start typing to search your memories
            </p>
          </>
        )}
      </div>

      {/* Suggestions */}
      <div className="max-w-md space-y-2">
        <p className="font-mono-brutal text-xs text-muted uppercase">
          Suggestions:
        </p>
        <ul className="text-sm text-muted space-y-1 list-disc list-inside">
          <li>Check your spelling</li>
          <li>Try more general terms</li>
          <li>Try different keywords</li>
          <li>Use fewer keywords</li>
        </ul>
      </div>
    </div>
  );
}
