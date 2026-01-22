import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypeBadge, SourceBadge } from './index';

describe('TypeBadge', () => {
  it('renders "item" text with badge-node and badge-project classes', () => {
    const { container } = render(<TypeBadge type="item" />);

    const badge = container.querySelector('.badge-node');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-project');
    expect(badge).toHaveTextContent('item');
  });

  it('renders "node" text with badge-node and badge-tool classes', () => {
    const { container } = render(<TypeBadge type="node" />);

    const badge = container.querySelector('.badge-node');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-tool');
    expect(badge).toHaveTextContent('node');
  });

  it('has correct structure for accessibility', () => {
    render(<TypeBadge type="item" />);

    const badge = screen.getByText('item');
    expect(badge.tagName).toBe('SPAN');
  });
});

describe('SourceBadge', () => {
  it('renders "vector" with badge-node and badge-skill classes', () => {
    const { container } = render(<SourceBadge source="vector" />);

    const badge = container.querySelector('.badge-node');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-skill');
    expect(badge).toHaveTextContent('vector');
  });

  it('renders "graph" with badge-node and badge-tool classes', () => {
    const { container } = render(<SourceBadge source="graph" />);

    const badge = container.querySelector('.badge-node');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-tool');
    expect(badge).toHaveTextContent('graph');
  });

  it('renders "hybrid" with badge-node and badge-concept classes', () => {
    const { container } = render(<SourceBadge source="hybrid" />);

    const badge = container.querySelector('.badge-node');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-concept');
    expect(badge).toHaveTextContent('hybrid');
  });

  it('has correct structure for accessibility', () => {
    render(<SourceBadge source="vector" />);

    const badge = screen.getByText('vector');
    expect(badge.tagName).toBe('SPAN');
  });
});
