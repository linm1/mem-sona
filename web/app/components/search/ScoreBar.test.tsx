import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBar } from './ScoreBar';

describe('ScoreBar', () => {
  it('renders with correct width percentage', () => {
    const { container } = render(<ScoreBar score={0.75} />);

    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('applies score-high class for score >= 0.7', () => {
    const { container } = render(<ScoreBar score={0.9} />);

    const progressBar = container.querySelector('.score-high');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies score-medium class for 0.4 <= score < 0.7', () => {
    const { container } = render(<ScoreBar score={0.5} />);

    const progressBar = container.querySelector('.score-medium');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies score-low class for score < 0.4', () => {
    const { container } = render(<ScoreBar score={0.2} />);

    const progressBar = container.querySelector('.score-low');
    expect(progressBar).toBeInTheDocument();
  });

  it('has accessible role="progressbar"', () => {
    render(<ScoreBar score={0.8} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('has correct aria-valuenow attribute', () => {
    render(<ScoreBar score={0.65} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '65');
  });

  it('has aria-valuemin and aria-valuemax attributes', () => {
    render(<ScoreBar score={0.5} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows score text when showLabel prop is true', () => {
    render(<ScoreBar score={0.85} showLabel={true} />);

    expect(screen.getByText(/0\.85|85%/)).toBeInTheDocument();
  });

  it('hides score text when showLabel prop is false', () => {
    render(<ScoreBar score={0.85} showLabel={false} />);

    expect(screen.queryByText(/0\.85|85%/)).not.toBeInTheDocument();
  });

  it('hides score text by default (when showLabel is not provided)', () => {
    render(<ScoreBar score={0.85} />);

    expect(screen.queryByText(/0\.85|85%/)).not.toBeInTheDocument();
  });

  it('handles score of 0', () => {
    const { container } = render(<ScoreBar score={0} />);

    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '0%' });
    expect(progressBar).toHaveClass('score-low');
  });

  it('handles score of 1', () => {
    const { container } = render(<ScoreBar score={1} />);

    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '100%' });
    expect(progressBar).toHaveClass('score-high');
  });

  it('handles boundary score of 0.4 (should be medium)', () => {
    const { container } = render(<ScoreBar score={0.4} />);

    const progressBar = container.querySelector('.score-medium');
    expect(progressBar).toBeInTheDocument();
  });

  it('handles boundary score of 0.7 (should be high)', () => {
    const { container } = render(<ScoreBar score={0.7} />);

    const progressBar = container.querySelector('.score-high');
    expect(progressBar).toBeInTheDocument();
  });

  it('has proper structure with container and bar', () => {
    const { container } = render(<ScoreBar score={0.6} />);

    // Container should have gray background
    const wrapper = container.querySelector('.bg-gray-200');
    expect(wrapper).toBeInTheDocument();

    // Progress bar should be inside
    const progressBar = container.querySelector('[style*="width"]') as HTMLElement;
    expect(wrapper).toContainElement(progressBar);
  });

  it('applies transition class for smooth animations', () => {
    const { container } = render(<ScoreBar score={0.6} />);

    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).toHaveClass('transition-all');
  });
});
