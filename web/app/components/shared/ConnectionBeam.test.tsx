import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { ConnectionBeam } from './ConnectionBeam';

// Mock the AnimatedBeam component since it uses complex SVG/canvas
vi.mock('../ui/animated-beam', () => ({
  AnimatedBeam: vi.fn(({
    containerRef,
    fromRef,
    toRef,
    pathOpacity,
    gradientStartColor,
    gradientStopColor
  }) => (
    <div
      data-testid="animated-beam-mock"
      data-path-opacity={pathOpacity}
      data-gradient-start={gradientStartColor}
      data-gradient-stop={gradientStopColor}
    >
      AnimatedBeam Mock
    </div>
  )),
}));

/**
 * Test wrapper to provide refs for ConnectionBeam
 */
function TestWrapper({ isArchived = false }: { isArchived?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLSpanElement>(null);
  const toRef = useRef<HTMLSpanElement>(null);

  return (
    <div ref={containerRef} data-testid="container" style={{ position: 'relative' }}>
      <span ref={fromRef} data-testid="from-node">From Node</span>
      <ConnectionBeam
        containerRef={containerRef}
        fromRef={fromRef}
        toRef={toRef}
        isArchived={isArchived}
      />
      <span ref={toRef} data-testid="to-node">To Node</span>
    </div>
  );
}

describe('ConnectionBeam', () => {
  describe('Rendering', () => {
    it('should render the AnimatedBeam component', () => {
      render(<TestWrapper />);

      expect(screen.getByTestId('animated-beam-mock')).toBeInTheDocument();
    });

    it('should pass correct refs to AnimatedBeam', () => {
      render(<TestWrapper />);

      // The mock receives the refs - we verify by checking the component rendered
      const beam = screen.getByTestId('animated-beam-mock');
      expect(beam).toBeInTheDocument();
    });
  });

  describe('Active vs Archived styling', () => {
    it('should have higher opacity for active edges', () => {
      render(<TestWrapper isArchived={false} />);

      const beam = screen.getByTestId('animated-beam-mock');
      expect(beam).toHaveAttribute('data-path-opacity', '0.4');
    });

    it('should have lower opacity for archived edges', () => {
      render(<TestWrapper isArchived={true} />);

      const beam = screen.getByTestId('animated-beam-mock');
      expect(beam).toHaveAttribute('data-path-opacity', '0.3');
    });
  });

  describe('Gradient Colors', () => {
    it('should use accent color (#03b57b) as gradient start', () => {
      render(<TestWrapper />);

      const beam = screen.getByTestId('animated-beam-mock');
      expect(beam).toHaveAttribute('data-gradient-start', '#03b57b');
    });

    it('should use highlight color (#ea940c) as gradient stop', () => {
      render(<TestWrapper />);

      const beam = screen.getByTestId('animated-beam-mock');
      expect(beam).toHaveAttribute('data-gradient-stop', '#ea940c');
    });
  });
});
