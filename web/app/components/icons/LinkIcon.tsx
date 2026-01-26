import { type SVGProps } from 'react';

export interface LinkIconProps extends SVGProps<SVGSVGElement> {
  /**
   * Custom CSS class for styling
   */
  className?: string;
  /**
   * Width of the icon in pixels
   * @default 14
   */
  width?: number;
  /**
   * Height of the icon in pixels
   * @default 14
   */
  height?: number;
  /**
   * Accessible label for screen readers
   * If not provided, aria-hidden will be set to true
   */
  'aria-label'?: string;
}

/**
 * Link/connection icon component
 * Represents relationships between nodes in the knowledge graph
 */
export function LinkIcon({
  className = '',
  width = 14,
  height = 14,
  'aria-label': ariaLabel,
  ...props
}: LinkIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      {...props}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
