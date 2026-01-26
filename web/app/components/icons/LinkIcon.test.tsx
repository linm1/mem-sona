import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LinkIcon } from './LinkIcon';

describe('LinkIcon', () => {
  it('renders svg element', () => {
    const { container } = render(<LinkIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has correct viewBox dimensions', () => {
    const { container } = render(<LinkIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('accepts className prop', () => {
    const { container } = render(<LinkIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('applies custom className without overriding default classes', () => {
    const { container } = render(<LinkIcon className="text-red-500" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-red-500');
  });

  it('has aria-label for accessibility', () => {
    const { container } = render(<LinkIcon aria-label="Connection link" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Connection link');
  });

  it('uses aria-hidden when no aria-label provided', () => {
    const { container } = render(<LinkIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders with stroke currentColor', () => {
    const { container } = render(<LinkIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('has strokeWidth of 2', () => {
    const { container } = render(<LinkIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  it('renders two path elements', () => {
    const { container } = render(<LinkIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('accepts custom size props', () => {
    const { container } = render(<LinkIcon width={20} height={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
  });

  it('uses default size when not specified', () => {
    const { container } = render(<LinkIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '14');
    expect(svg).toHaveAttribute('height', '14');
  });
});
