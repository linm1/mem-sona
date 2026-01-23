import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NodeTooltip } from './NodeTooltip';
import type { TooltipNodeData } from './types';

describe('NodeTooltip', () => {
  const mockNode: TooltipNodeData = {
    id: 'node-1',
    label: 'TypeScript',
    type: 'tool',
    description: 'A typed superset of JavaScript',
  };

  it('displays node label', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('displays node type', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText('tool')).toBeInTheDocument();
  });

  it('displays description when present', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 100, y: 100 }} />);
    expect(
      screen.getByText('A typed superset of JavaScript')
    ).toBeInTheDocument();
  });

  it('shows placeholder when description is missing', () => {
    const nodeWithoutDesc: TooltipNodeData = {
      ...mockNode,
      description: undefined,
    };
    render(<NodeTooltip node={nodeWithoutDesc} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('shows placeholder for empty description', () => {
    const nodeWithEmptyDesc: TooltipNodeData = {
      ...mockNode,
      description: '',
    };
    render(<NodeTooltip node={nodeWithEmptyDesc} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('returns null when node is null', () => {
    const { container } = render(
      <NodeTooltip node={null} position={{ x: 100, y: 100 }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('has node-tooltip test id', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 100, y: 100 }} />);
    expect(screen.getByTestId('node-tooltip')).toBeInTheDocument();
  });

  it('positions tooltip at specified x coordinate', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 200, y: 150 }} />);
    const tooltip = screen.getByTestId('node-tooltip');
    expect(tooltip.style.left).toBe('200px');
  });

  it('positions tooltip at specified y coordinate', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 200, y: 150 }} />);
    const tooltip = screen.getByTestId('node-tooltip');
    expect(tooltip.style.top).toBe('150px');
  });

  it('displays project type correctly', () => {
    const projectNode: TooltipNodeData = {
      ...mockNode,
      type: 'project',
    };
    render(<NodeTooltip node={projectNode} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('displays skill type correctly', () => {
    const skillNode: TooltipNodeData = {
      ...mockNode,
      type: 'skill',
    };
    render(<NodeTooltip node={skillNode} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText('skill')).toBeInTheDocument();
  });

  it('displays concept type correctly', () => {
    const conceptNode: TooltipNodeData = {
      ...mockNode,
      type: 'concept',
    };
    render(<NodeTooltip node={conceptNode} position={{ x: 100, y: 100 }} />);
    expect(screen.getByText('concept')).toBeInTheDocument();
  });

  it('has pointer-events-none class to not block interactions', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 100, y: 100 }} />);
    const tooltip = screen.getByTestId('node-tooltip');
    expect(tooltip).toHaveClass('pointer-events-none');
  });

  it('has absolute positioning', () => {
    render(<NodeTooltip node={mockNode} position={{ x: 100, y: 100 }} />);
    const tooltip = screen.getByTestId('node-tooltip');
    expect(tooltip).toHaveClass('absolute');
  });
});
