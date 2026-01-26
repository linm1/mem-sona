import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CloseIcon } from './CloseIcon';

describe('CloseIcon', () => {
  it('renders svg element', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has correct viewBox dimensions', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('accepts className prop', () => {
    const { container } = render(<CloseIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('applies custom className without overriding default classes', () => {
    const { container } = render(<CloseIcon className="text-blue-500" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-blue-500');
  });

  it('has aria-label for accessibility', () => {
    const { container } = render(<CloseIcon aria-label="Close dialog" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Close dialog');
  });

  it('uses aria-hidden when no aria-label provided', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders with stroke currentColor', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('has strokeWidth of 2', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  it('renders one path element', () => {
    const { container } = render(<CloseIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('accepts custom size props', () => {
    const { container } = render(<CloseIcon width={24} height={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('uses default size when not specified', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('has round linecap for smoother appearance', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
  });

  it('has round linejoin for smoother appearance', () => {
    const { container } = render(<CloseIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
  });
});
