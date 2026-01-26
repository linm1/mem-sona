import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EdgeItem, type Edge } from './EdgeItem';

const mockEdge: Edge = {
  relationship: 'uses',
  targetName: 'Convex',
  targetNodeType: 'tool',
  weight: 0.8,
};

describe('EdgeItem', () => {
  describe('rendering', () => {
    it('renders relationship label', () => {
      render(<EdgeItem edge={mockEdge} />);
      expect(screen.getByText('uses')).toBeInTheDocument();
    });

    it('renders target name', () => {
      render(<EdgeItem edge={mockEdge} />);
      expect(screen.getByText('Convex')).toBeInTheDocument();
    });

    it('renders directional arrows', () => {
      render(<EdgeItem edge={mockEdge} />);
      const arrows = screen.getAllByText('→');
      expect(arrows.length).toBe(2);
    });

    it('applies accent color to relationship', () => {
      render(<EdgeItem edge={mockEdge} />);
      const relationship = screen.getByText('uses');
      expect(relationship).toHaveClass('text-accent');
    });
  });

  describe('type-based styling', () => {
    it('applies highlight background for project type', () => {
      const projectEdge: Edge = {
        relationship: 'completed',
        targetName: 'SPRINT-002',
        targetNodeType: 'project',
        weight: 0.85,
      };
      render(<EdgeItem edge={projectEdge} />);
      const badge = screen.getByText('SPRINT-002');
      expect(badge).toHaveClass('bg-highlight', 'text-paper');
    });

    it('applies accent background for skill type', () => {
      const skillEdge: Edge = {
        relationship: 'requires',
        targetName: 'TypeScript',
        targetNodeType: 'skill',
        weight: 0.7,
      };
      render(<EdgeItem edge={skillEdge} />);
      const badge = screen.getByText('TypeScript');
      expect(badge).toHaveClass('bg-accent', 'text-paper');
    });

    it('applies muted background for tool type', () => {
      render(<EdgeItem edge={mockEdge} />);
      const badge = screen.getByText('Convex');
      expect(badge).toHaveClass('bg-muted', 'text-paper');
    });

    it('applies ink background for concept type', () => {
      const conceptEdge: Edge = {
        relationship: 'follows',
        targetName: 'CONVEX-DEVELOPMENT-BEST-PRACTICES',
        targetNodeType: 'concept',
        weight: 0.9,
      };
      render(<EdgeItem edge={conceptEdge} />);
      const badge = screen.getByText('CONVEX-DEVELOPMENT-BEST-PRACTICES');
      expect(badge).toHaveClass('bg-ink', 'text-paper');
    });

    it('defaults to concept styling for unknown types', () => {
      const unknownEdge: Edge = {
        relationship: 'relates_to',
        targetName: 'Unknown',
        targetNodeType: 'unknown',
        weight: 0.5,
      };
      render(<EdgeItem edge={unknownEdge} />);
      const badge = screen.getByText('Unknown');
      expect(badge).toHaveClass('bg-ink', 'text-paper');
    });
  });

  describe('badge styling', () => {
    it('renders badge with border', () => {
      render(<EdgeItem edge={mockEdge} />);
      const badge = screen.getByText('Convex');
      expect(badge).toHaveClass('border', 'border-ink');
    });

    it('renders badge with uppercase font-mono', () => {
      render(<EdgeItem edge={mockEdge} />);
      const badge = screen.getByText('Convex');
      expect(badge).toHaveClass('font-mono', 'uppercase');
    });

    it('renders badge with correct padding', () => {
      render(<EdgeItem edge={mockEdge} />);
      const badge = screen.getByText('Convex');
      expect(badge).toHaveClass('px-1.5', 'py-0.5');
    });
  });

  describe('layout variations', () => {
    it('supports compact variant without min-width', () => {
      render(<EdgeItem edge={mockEdge} variant="compact" />);
      const relationship = screen.getByText('uses');
      expect(relationship).not.toHaveClass('min-w-[80px]');
    });

    it('supports default variant with min-width on relationship', () => {
      render(<EdgeItem edge={mockEdge} variant="default" />);
      const relationship = screen.getByText('uses');
      expect(relationship).toHaveClass('min-w-[80px]');
    });

    it('uses default variant when no variant specified', () => {
      render(<EdgeItem edge={mockEdge} />);
      const relationship = screen.getByText('uses');
      expect(relationship).toHaveClass('min-w-[80px]');
    });
  });

  describe('accessibility', () => {
    it('has semantic structure', () => {
      const { container } = render(<EdgeItem edge={mockEdge} />);
      const edgeContainer = container.firstChild;
      expect(edgeContainer).toBeInTheDocument();
    });

    it('renders text content for screen readers', () => {
      render(<EdgeItem edge={mockEdge} />);
      expect(screen.getByText('uses')).toBeInTheDocument();
      expect(screen.getByText('Convex')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles long target names', () => {
      const longNameEdge: Edge = {
        relationship: 'follows',
        targetName: 'VERY-LONG-CONCEPT-NAME-WITH-MANY-WORDS',
        targetNodeType: 'concept',
        weight: 0.9,
      };
      render(<EdgeItem edge={longNameEdge} />);
      expect(screen.getByText('VERY-LONG-CONCEPT-NAME-WITH-MANY-WORDS')).toBeInTheDocument();
    });

    it('handles long relationship names', () => {
      const longRelEdge: Edge = {
        relationship: 'is_dependent_on',
        targetName: 'Target',
        targetNodeType: 'tool',
        weight: 0.7,
      };
      render(<EdgeItem edge={longRelEdge} />);
      expect(screen.getByText('is_dependent_on')).toBeInTheDocument();
    });

    it('handles zero weight', () => {
      const zeroWeightEdge: Edge = {
        relationship: 'uses',
        targetName: 'Test',
        targetNodeType: 'tool',
        weight: 0,
      };
      render(<EdgeItem edge={zeroWeightEdge} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});
