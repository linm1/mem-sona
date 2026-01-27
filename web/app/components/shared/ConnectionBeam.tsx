'use client';

import { RefObject } from 'react';
import { AnimatedBeam } from '../ui/animated-beam';

/**
 * Props for ConnectionBeam component
 */
export interface ConnectionBeamProps {
  /** Reference to the container element */
  containerRef: RefObject<HTMLElement | null>;
  /** Reference to the source (from) node element */
  fromRef: RefObject<HTMLElement | null>;
  /** Reference to the target (to) node element */
  toRef: RefObject<HTMLElement | null>;
  /** Whether the connection is archived (affects opacity) */
  isArchived?: boolean;
}

/**
 * ConnectionBeam - Animated connection line between two elements
 *
 * Wraps AnimatedBeam with mem-sona design system colors.
 * Shows gradient beam flowing from source to target node.
 *
 * - Active edges: Higher opacity (0.4)
 * - Archived edges: Lower opacity (0.3)
 *
 * Uses accent (#03b57b) and highlight (#ea940c) colors from design system.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const fromRef = useRef<HTMLSpanElement>(null);
 * const toRef = useRef<HTMLSpanElement>(null);
 *
 * <div ref={containerRef} style={{ position: 'relative' }}>
 *   <span ref={fromRef}>Source</span>
 *   <ConnectionBeam
 *     containerRef={containerRef}
 *     fromRef={fromRef}
 *     toRef={toRef}
 *     isArchived={false}
 *   />
 *   <span ref={toRef}>Target</span>
 * </div>
 * ```
 */
export function ConnectionBeam({
  containerRef,
  fromRef,
  toRef,
  isArchived = false,
}: ConnectionBeamProps) {
  return (
    <AnimatedBeam
      containerRef={containerRef}
      fromRef={fromRef}
      toRef={toRef}
      pathColor="var(--ink)"
      pathWidth={2}
      pathOpacity={isArchived ? 0.3 : 0.4}
      gradientStartColor="#03b57b" // accent color from design system
      gradientStopColor="#ea940c" // highlight color from design system
      curvature={0}
      duration={3}
    />
  );
}
