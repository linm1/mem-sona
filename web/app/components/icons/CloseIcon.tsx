import { type SVGProps } from 'react';

export interface CloseIconProps extends SVGProps<SVGSVGElement> {
  /**
   * Custom CSS class for styling
   */
  className?: string;
  /**
   * Width of the icon in pixels
   * @default 16
   */
  width?: number;
  /**
   * Height of the icon in pixels
   * @default 16
   */
  height?: number;
  /**
   * Accessible label for screen readers
   * If not provided, aria-hidden will be set to true
   */
  'aria-label'?: string;
}

/**
 * Close/X icon component
 * Typically used for dismissing dialogs, drawers, or modals
 */
export function CloseIcon({
  className = '',
  width = 16,
  height = 16,
  'aria-label': ariaLabel,
  ...props
}: CloseIconProps) {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
