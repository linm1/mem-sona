/**
 * Props for GraphControls component.
 */
interface GraphControlsProps {
  /** Callback for zoom in action */
  onZoomIn: () => void;
  /** Callback for zoom out action */
  onZoomOut: () => void;
  /** Callback for fit-to-view action */
  onFit: () => void;
  /** Callback for reset view action */
  onReset: () => void;
}

/**
 * Control buttons for graph manipulation.
 * Neo-brutalist styled zoom, fit, and reset controls.
 */
export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: GraphControlsProps) {
  return (
    <div
      data-testid="graph-controls"
      className="flex flex-col gap-1 p-2 bg-paper border border-ink"
    >
      <button
        type="button"
        onClick={onZoomIn}
        className="btn-brutal p-2"
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomInIcon />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        className="btn-brutal p-2"
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOutIcon />
      </button>
      <button
        type="button"
        onClick={onFit}
        className="btn-brutal p-2"
        aria-label="Fit to view"
        title="Fit to view"
      >
        <FitIcon />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="btn-brutal p-2"
        aria-label="Reset view"
        title="Reset view"
      >
        <ResetIcon />
      </button>
    </div>
  );
}

/**
 * Zoom in icon (magnifying glass with plus).
 */
function ZoomInIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  );
}

/**
 * Zoom out icon (magnifying glass with minus).
 */
function ZoomOutIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35M8 11h6" />
    </svg>
  );
}

/**
 * Fit to view icon (expand corners).
 */
function FitIcon() {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

/**
 * Reset view icon (circular arrow).
 */
function ResetIcon() {
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
