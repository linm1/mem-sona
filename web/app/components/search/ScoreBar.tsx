import { getScoreIntensity } from '../../utils/formatters';

/**
 * Props for ScoreBar component
 */
interface ScoreBarProps {
  /** Normalized score value (0-1) */
  score: number;
  /** Whether to show the score label */
  showLabel?: boolean;
}

/**
 * ScoreBar component - visual representation of a score value
 *
 * Displays a horizontal progress bar with color intensity based on score value:
 * - High (>= 0.7): Green gradient
 * - Medium (0.4 - 0.7): Medium green gradient
 * - Low (< 0.4): Light green gradient
 *
 * @example
 * ```tsx
 * <ScoreBar score={0.85} />
 * <ScoreBar score={0.5} showLabel={true} />
 * ```
 */
export function ScoreBar({ score, showLabel = false }: ScoreBarProps) {
  const percentage = Math.round(score * 100);
  const intensityClass = getScoreIntensity(score);

  return (
    <div
      className="w-full h-1 bg-gray-200 overflow-hidden"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full transition-all ${intensityClass}`}
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="sr-only">
          {score.toFixed(2)}
        </span>
      )}
    </div>
  );
}
