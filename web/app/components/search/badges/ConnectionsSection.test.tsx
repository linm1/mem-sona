import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConnectionsSection, type Edge } from './ConnectionsSection';

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

describe('ConnectionsSection', () => {
  describe('rendering', () => {
    it('returns null when edges array is empty', () => {
      const { container } = render(<ConnectionsSection edges={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders a details element for collapsible behavior', () => {
      render(<ConnectionsSection edges={mockEdges} />);
      const details = screen.getByRole('group');
      expect(details.tagName).toBe('DETAILS');
    });

    it('renders connection count in summary', () => {
      render(<ConnectionsSection edges={mockEdges} />);
      expect(screen.getByText(/5 connections/i)).toBeInTheDocument();
    });

    it('uses singular "connection" for single edge', () => {
      render(<ConnectionsSection edges={[mockEdges[0]]} />);
      expect(screen.getByText(/1 connection$/i)).toBeInTheDocument();
    });
  });

  describe('type counts summary', () => {
    it('displays counts by node type', () => {
      render(<ConnectionsSection edges={mockEdges} />);
      // Should show: "1 concept 1 project 2 tools 1 skill"
      expect(screen.getByText(/1 concept/i)).toBeInTheDocument();
      expect(screen.getByText(/1 project/i)).toBeInTheDocument();
      expect(screen.getByText(/2 tools/i)).toBeInTheDocument();
      expect(screen.getByText(/1 skill/i)).toBeInTheDocument();
    });

    it('pluralizes type counts correctly', () => {
      const twoProjects: Edge[] = [
        { relationship: 'uses', targetName: 'A', targetNodeType: 'project', weight: 0.5 },
        { relationship: 'uses', targetName: 'B', targetNodeType: 'project', weight: 0.5 },
      ];
      render(<ConnectionsSection edges={twoProjects} />);
      expect(screen.getByText(/2 projects/i)).toBeInTheDocument();
    });
  });

  describe('edge list display', () => {
    it('renders relationship labels in accent color', () => {
      render(<ConnectionsSection edges={mockEdges} defaultOpen />);
      const followsLabel = screen.getByText('follows');
      expect(followsLabel).toHaveClass('text-accent');
    });

    it('renders directional arrows', () => {
      render(<ConnectionsSection edges={mockEdges} defaultOpen />);
      const arrows = screen.getAllByText('→');
      // Each edge has 2 arrows (before and after relationship)
      expect(arrows.length).toBeGreaterThanOrEqual(mockEdges.length);
    });

    it('renders target name badges with correct type classes', () => {
      render(<ConnectionsSection edges={mockEdges} defaultOpen />);

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
  });

  describe('defaultOpen behavior', () => {
    it('is collapsed by default when defaultOpen is false', () => {
      render(<ConnectionsSection edges={mockEdges} defaultOpen={false} />);
      const details = screen.getByRole('group');
      expect(details).not.toHaveAttribute('open');
    });

    it('is expanded when defaultOpen is true', () => {
      render(<ConnectionsSection edges={mockEdges} defaultOpen />);
      const details = screen.getByRole('group');
      expect(details).toHaveAttribute('open');
    });
  });

  describe('accessibility', () => {
    it('has accessible summary text', () => {
      render(<ConnectionsSection edges={mockEdges} />);
      const summary = screen.getByText(/connections/i).closest('summary');
      expect(summary).toBeInTheDocument();
    });

    it('renders edge list with semantic structure', () => {
      render(<ConnectionsSection edges={mockEdges} defaultOpen />);
      // Each edge should be in its own container
      const edgeItems = screen.getAllByText('→')[0].closest('div');
      expect(edgeItems).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies border-top for visual separation', () => {
      const { container } = render(<ConnectionsSection edges={mockEdges} />);
      const section = container.firstChild;
      expect(section).toHaveClass('border-t');
    });

    it('has scrollable container for edge list', () => {
      render(<ConnectionsSection edges={mockEdges} defaultOpen />);
      const details = screen.getByRole('group');
      const edgeContainer = details.querySelector('.overflow-y-auto');
      expect(edgeContainer).toBeInTheDocument();
    });
  });
});
