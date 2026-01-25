import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypeBadge, SourceBadge, RelationshipBadge } from './index';

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

describe('RelationshipBadge', () => {
  const defaultProps = {
    relationship: 'uses',
    targetName: 'Convex',
    targetNodeType: 'tool',
    weight: 0.8,
  };

  it('renders relationship and target name', () => {
    render(<RelationshipBadge {...defaultProps} />);

    expect(screen.getByText('uses: Convex')).toBeInTheDocument();
  });

  it('applies badge-tool class for tool targetNodeType', () => {
    const { container } = render(
      <RelationshipBadge {...defaultProps} targetNodeType="tool" />
    );

    const badge = container.querySelector('.badge-relationship');
    expect(badge).toHaveClass('badge-tool');
  });

  it('applies badge-skill class for skill targetNodeType', () => {
    const { container } = render(
      <RelationshipBadge {...defaultProps} targetNodeType="skill" />
    );

    const badge = container.querySelector('.badge-relationship');
    expect(badge).toHaveClass('badge-skill');
  });

  it('applies badge-project class for project targetNodeType', () => {
    const { container } = render(
      <RelationshipBadge {...defaultProps} targetNodeType="project" />
    );

    const badge = container.querySelector('.badge-relationship');
    expect(badge).toHaveClass('badge-project');
  });

  it('applies badge-concept class for concept targetNodeType', () => {
    const { container } = render(
      <RelationshipBadge {...defaultProps} targetNodeType="concept" />
    );

    const badge = container.querySelector('.badge-relationship');
    expect(badge).toHaveClass('badge-concept');
  });

  it('defaults to badge-concept for unknown targetNodeType', () => {
    const { container } = render(
      <RelationshipBadge {...defaultProps} targetNodeType="unknown" />
    );

    const badge = container.querySelector('.badge-relationship');
    expect(badge).toHaveClass('badge-concept');
  });

  it('includes title with weight percentage', () => {
    render(<RelationshipBadge {...defaultProps} weight={0.75} />);

    const badge = screen.getByTitle('uses (75% strength)');
    expect(badge).toBeInTheDocument();
  });

  it('adjusts opacity based on weight', () => {
    const { container } = render(
      <RelationshipBadge {...defaultProps} weight={1.0} />
    );

    const badge = container.querySelector('.badge-relationship');
    expect(badge).toHaveStyle({ opacity: '1' });
  });

  it('has correct structure for accessibility', () => {
    render(<RelationshipBadge {...defaultProps} />);

    const badge = screen.getByText('uses: Convex');
    expect(badge.tagName).toBe('SPAN');
  });
});
