import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  ConnectionsIndicator,
  ConnectionsDrawer,
  type Edge,
} from './ConnectionsDrawer';

const mockEdges: Edge[] = [
  {
    relationship: 'follows',
    targetName: 'CONVEX-DEVELOPMENT-BEST-PRACTICES',
    targetNodeType: 'concept',
    weight: 0.9,
  },
  {
    relationship: 'completed',
    targetName: 'SPRINT-002',
    targetNodeType: 'project',
    weight: 0.85,
  },
  {
    relationship: 'uses',
    targetName: 'Convex',
    targetNodeType: 'tool',
    weight: 0.8,
  },
  {
    relationship: 'uses',
    targetName: 'voyage-4',
    targetNodeType: 'tool',
    weight: 0.75,
  },
  {
    relationship: 'requires',
    targetName: 'TypeScript',
    targetNodeType: 'skill',
    weight: 0.7,
  },
];

describe('ConnectionsIndicator', () => {
  it('renders link icon and count', () => {
    const handleClick = vi.fn();
    render(<ConnectionsIndicator count={11} onClick={handleClick} />);

    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ConnectionsIndicator count={5} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('stops event propagation when clicked', () => {
    const handleClick = vi.fn((e) => e.stopPropagation());
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <ConnectionsIndicator count={5} onClick={handleClick} />
      </div>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('has accessible label', () => {
    const handleClick = vi.fn();
    render(<ConnectionsIndicator count={11} onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'View 11 connections');
  });

  it('renders with font-mono styling', () => {
    const handleClick = vi.fn();
    render(<ConnectionsIndicator count={11} onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('font-mono');
  });
});

describe('ConnectionsDrawer', () => {
  describe('visibility', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(
        <ConnectionsDrawer
          isOpen={false}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders when isOpen is true', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      expect(screen.getByTestId('connections-drawer')).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('displays node name in header', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      expect(screen.getByText('MEM-SONA')).toBeInTheDocument();
    });

    it('has close button that calls onClose', () => {
      const handleClose = vi.fn();
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={handleClose}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const closeButton = screen.getByLabelText('Close drawer');
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('type counts with colors', () => {
    it('displays type counts in drawer header', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      // 1 concept, 1 project, 2 tools, 1 skill
      expect(screen.getByText(/1 concept/i)).toBeInTheDocument();
      expect(screen.getByText(/1 project/i)).toBeInTheDocument();
      expect(screen.getByText(/2 tools/i)).toBeInTheDocument();
      expect(screen.getByText(/1 skill/i)).toBeInTheDocument();
    });

    it('applies highlight color to project count', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const projectCount = screen.getByText(/1 project/i);
      expect(projectCount).toHaveClass('text-highlight');
    });

    it('applies accent color to skill count', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const skillCount = screen.getByText(/1 skill/i);
      expect(skillCount).toHaveClass('text-accent');
    });

    it('applies muted color to tool and concept counts', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const toolCount = screen.getByText(/2 tools/i);
      const conceptCount = screen.getByText(/1 concept/i);
      expect(toolCount).toHaveClass('text-muted');
      expect(conceptCount).toHaveClass('text-muted');
    });
  });

  describe('edge list', () => {
    it('renders all edges', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      expect(screen.getByText('follows')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getAllByText('uses').length).toBe(2);
      expect(screen.getByText('requires')).toBeInTheDocument();
    });

    it('renders target names with correct type colors', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      // Project should have highlight background
      const projectBadge = screen.getByText('SPRINT-002');
      expect(projectBadge).toHaveClass('bg-highlight');

      // Skill should have accent background
      const skillBadge = screen.getByText('TypeScript');
      expect(skillBadge).toHaveClass('bg-accent');

      // Tool should have muted background
      const toolBadge = screen.getByText('Convex');
      expect(toolBadge).toHaveClass('bg-muted');

      // Concept should have ink background
      const conceptBadge = screen.getByText('CONVEX-DEVELOPMENT-BEST-PRACTICES');
      expect(conceptBadge).toHaveClass('bg-ink');
    });

    it('renders directional arrows', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const arrows = screen.getAllByText('→');
      expect(arrows.length).toBeGreaterThanOrEqual(mockEdges.length);
    });
  });

  describe('styling', () => {
    it('has fixed positioning at bottom', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const drawer = screen.getByTestId('connections-drawer');
      expect(drawer).toHaveClass('fixed', 'bottom-0');
    });

    it('has shadow-brutal styling', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const drawer = screen.getByTestId('connections-drawer');
      expect(drawer).toHaveClass('shadow-brutal');
    });

    it('has scrollable edge list', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const drawer = screen.getByTestId('connections-drawer');
      const scrollableArea = drawer.querySelector('.overflow-y-auto');
      expect(scrollableArea).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('focuses close button when opened', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      const closeButton = screen.getByLabelText('Close drawer');
      expect(closeButton).toHaveFocus();
    });

    it('closes on Escape key', () => {
      const handleClose = vi.fn();
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={handleClose}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      fireEvent.keyDown(screen.getByTestId('connections-drawer'), {
        key: 'Escape',
      });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('backdrop', () => {
    it('renders backdrop overlay', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      expect(screen.getByTestId('drawer-backdrop')).toBeInTheDocument();
    });

    it('closes drawer when backdrop is clicked', () => {
      const handleClose = vi.fn();
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={handleClose}
          nodeName="MEM-SONA"
          edges={mockEdges}
        />
      );

      fireEvent.click(screen.getByTestId('drawer-backdrop'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
