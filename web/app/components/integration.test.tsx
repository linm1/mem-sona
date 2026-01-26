/**
 * Integration Tests for Refactored Utilities
 *
 * Tests that refactored code (text utils, node type utils, EdgeItem component)
 * integrates properly across all components that use them.
 *
 * Ensures:
 * - Same edge data renders identically across components
 * - Type colors are consistent everywhere
 * - Pluralization is consistent everywhere
 * - Shared utilities work correctly when composed together
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConnectionsDrawer, ConnectionsIndicator } from './explorer/ConnectionsDrawer';
import { ConnectionsSection } from './search/badges/ConnectionsSection';
import { MemoryGridCard } from './explorer/MemoryGridCard';
import { EdgeItem, type Edge } from './shared/EdgeItem';
import { RelationshipBadge } from './search/badges/RelationshipBadge';
import { MergedResult } from './search/types';

/**
 * Shared mock edge data used across all components
 * This ensures we test the same data structure everywhere
 */
const sharedMockEdges: Edge[] = [
  {
    relationship: 'uses',
    targetName: 'Convex',
    targetNodeType: 'tool',
    weight: 0.8,
  },
  {
    relationship: 'uses',
    targetName: 'React',
    targetNodeType: 'tool',
    weight: 0.75,
  },
  {
    relationship: 'requires',
    targetName: 'TypeScript',
    targetNodeType: 'skill',
    weight: 0.9,
  },
  {
    relationship: 'completed',
    targetName: 'SPRINT-002',
    targetNodeType: 'project',
    weight: 0.85,
  },
  {
    relationship: 'follows',
    targetName: 'CONVEX-DEVELOPMENT-BEST-PRACTICES',
    targetNodeType: 'concept',
    weight: 0.9,
  },
];

describe('Integration: Refactored Utilities Across Components', () => {
  describe('Edge Rendering Consistency', () => {
    it('renders same edge identically in ConnectionsDrawer and ConnectionsSection', () => {
      const singleEdge = [sharedMockEdges[0]];

      // Render in ConnectionsDrawer
      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test Node"
          edges={singleEdge}
        />
      );

      // Render in ConnectionsSection
      const { container: sectionContainer } = render(
        <ConnectionsSection edges={singleEdge} defaultOpen />
      );

      // Both should display relationship and target name
      const drawerRelationship = drawerContainer.querySelector('.text-accent');
      const sectionRelationship = sectionContainer.querySelector('.text-accent');

      expect(drawerRelationship?.textContent).toBe('uses');
      expect(sectionRelationship?.textContent).toBe('uses');

      // Both should display target name with same color class
      const drawerBadge = drawerContainer.querySelector('.bg-muted.text-paper');
      const sectionBadge = sectionContainer.querySelector('.bg-muted.text-paper');

      // Text content is "Convex", but CSS uppercase class makes it display as CONVEX
      expect(drawerBadge?.textContent).toBe('Convex');
      expect(sectionBadge?.textContent).toBe('Convex');
    });

    it('applies consistent type colors across all components', () => {
      // Test each node type in different components
      const components = [
        {
          name: 'ConnectionsDrawer',
          render: () => render(
            <ConnectionsDrawer
              isOpen={true}
              onClose={vi.fn()}
              nodeName="Test"
              edges={sharedMockEdges}
            />
          ),
        },
        {
          name: 'ConnectionsSection',
          render: () => render(
            <ConnectionsSection edges={sharedMockEdges} defaultOpen />
          ),
        },
      ];

      components.forEach(({ name, render: renderComponent }) => {
        const { container } = renderComponent();

        // Tool should have bg-muted
        expect(
          container.querySelector('.bg-muted.text-paper')
        ).toBeInTheDocument();

        // Skill should have bg-accent
        expect(
          container.querySelector('.bg-accent.text-paper')
        ).toBeInTheDocument();

        // Project should have bg-highlight
        expect(
          container.querySelector('.bg-highlight.text-paper')
        ).toBeInTheDocument();

        // Concept should have bg-ink
        expect(
          container.querySelector('.bg-ink.text-paper')
        ).toBeInTheDocument();
      });
    });

    it('renders all edge arrows consistently', () => {
      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={sharedMockEdges}
        />
      );

      const { container: sectionContainer } = render(
        <ConnectionsSection edges={sharedMockEdges} defaultOpen />
      );

      // Each edge should have 2 arrows (→ relationship →)
      const drawerArrows = drawerContainer.querySelectorAll('.text-muted');
      const sectionArrows = sectionContainer.querySelectorAll('.text-muted');

      // Should have arrows for each edge (2 per edge)
      expect(drawerArrows.length).toBeGreaterThanOrEqual(sharedMockEdges.length * 2);
      expect(sectionArrows.length).toBeGreaterThanOrEqual(sharedMockEdges.length * 2);
    });
  });

  describe('Type Count Pluralization Consistency', () => {
    it('uses same pluralization in drawer and section headers', () => {
      // Test with 2 tools, 1 skill, 1 project, 1 concept
      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={sharedMockEdges}
        />
      );

      const { container: sectionContainer } = render(
        <ConnectionsSection edges={sharedMockEdges} defaultOpen />
      );

      // Both should show "2 tools" (plural)
      expect(drawerContainer.textContent).toContain('2 tools');
      expect(sectionContainer.textContent).toContain('2 tools');

      // Both should show "1 skill" (singular)
      expect(drawerContainer.textContent).toContain('1 skill');
      expect(sectionContainer.textContent).toContain('1 skill');

      // Both should show "1 project" (singular)
      expect(drawerContainer.textContent).toContain('1 project');
      expect(sectionContainer.textContent).toContain('1 project');

      // Both should show "1 concept" (singular)
      expect(drawerContainer.textContent).toContain('1 concept');
      expect(sectionContainer.textContent).toContain('1 concept');
    });

    it('pluralizes correctly when count changes', () => {
      const singleSkill = [sharedMockEdges[2]]; // 1 skill
      const multipleSkills = [
        sharedMockEdges[2],
        { ...sharedMockEdges[2], targetName: 'JavaScript' },
        { ...sharedMockEdges[2], targetName: 'Python' },
      ]; // 3 skills

      // Render with singular
      const { rerender: drawerRerender, container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={singleSkill}
        />
      );

      expect(drawerContainer.textContent).toContain('1 skill');
      expect(drawerContainer.textContent).not.toContain('1 skills');

      // Update to plural
      drawerRerender(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={multipleSkills}
        />
      );

      expect(drawerContainer.textContent).toContain('3 skills');
      // Note: Can't check for absence of "3 skill" since "3 skills" contains it as substring
    });

    it('handles zero counts consistently', () => {
      // Empty edges should not render counts
      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={[]}
        />
      );

      const { container: sectionContainer } = render(
        <ConnectionsSection edges={[]} defaultOpen />
      );

      // Drawer should render (but with no type counts)
      expect(drawerContainer.querySelector('[data-testid="connections-drawer"]')).toBeInTheDocument();

      // Section should return null for empty edges
      expect(sectionContainer.firstChild).toBeNull();
    });
  });

  describe('MemoryGridCard Integration', () => {
    it('displays connections indicator with correct count', () => {
      const result: MergedResult = {
        type: 'node',
        content: 'TypeScript programming language',
        score: 0.78,
        finalScore: 0.78,
        timestamp: Date.now(),
        source: 'graph',
        nodeId: 'node456',
        name: 'TypeScript',
        nodeType: 'skill',
        description: 'A strongly typed programming language',
        status: 'active',
        edges: sharedMockEdges,
      };

      render(<MemoryGridCard result={result} onClick={vi.fn()} />);

      // Should show indicator with correct count
      const indicator = screen.getByRole('button', { name: /View 5 connections/i });
      expect(indicator).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('opens drawer with same edge data when indicator clicked', () => {
      const result: MergedResult = {
        type: 'node',
        content: 'TypeScript programming language',
        score: 0.78,
        finalScore: 0.78,
        timestamp: Date.now(),
        source: 'graph',
        nodeId: 'node456',
        name: 'TypeScript',
        nodeType: 'skill',
        edges: sharedMockEdges,
      };

      render(<MemoryGridCard result={result} onClick={vi.fn()} />);

      // Click indicator
      const indicator = screen.getByRole('button', { name: /View 5 connections/i });
      fireEvent.click(indicator);

      // Drawer should be open
      expect(screen.getByTestId('connections-drawer')).toBeInTheDocument();

      // Should show same type counts
      expect(screen.getByText('2 tools')).toBeInTheDocument();
      expect(screen.getByText('1 skill')).toBeInTheDocument();
      expect(screen.getByText('1 project')).toBeInTheDocument();
      expect(screen.getByText('1 concept')).toBeInTheDocument();

      // Should show all edges
      expect(screen.getAllByText('uses').length).toBe(2);
      expect(screen.getByText('requires')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('follows')).toBeInTheDocument();
    });

    it('does not show connections for items without edges', () => {
      const itemResult: MergedResult = {
        type: 'item',
        content: 'User prefers TypeScript',
        score: 0.85,
        finalScore: 0.85,
        timestamp: Date.now(),
        source: 'vector',
        itemId: 'item123',
        category: 'tech_preferences',
      };

      render(<MemoryGridCard result={itemResult} onClick={vi.fn()} />);

      // Should not have connections indicator
      expect(screen.queryByRole('button', { name: /View.*connections/i })).not.toBeInTheDocument();
    });
  });

  describe('Cross-Component Type Color Consistency', () => {
    it('uses identical badge classes for project type across components', () => {
      const projectEdge = sharedMockEdges[3]; // SPRINT-002

      // EdgeItem component
      const { container: edgeItemContainer } = render(
        <EdgeItem edge={projectEdge} />
      );

      // ConnectionsDrawer
      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={[projectEdge]}
        />
      );

      // Both should have bg-highlight class
      expect(
        edgeItemContainer.querySelector('.bg-highlight.text-paper')
      ).toBeInTheDocument();
      expect(
        drawerContainer.querySelector('.bg-highlight.text-paper')
      ).toBeInTheDocument();
    });

    it('uses identical badge classes for skill type across components', () => {
      const skillEdge = sharedMockEdges[2]; // TypeScript

      const { container: edgeItemContainer } = render(
        <EdgeItem edge={skillEdge} />
      );

      const { container: sectionContainer } = render(
        <ConnectionsSection edges={[skillEdge]} defaultOpen />
      );

      // Both should have bg-accent class
      expect(
        edgeItemContainer.querySelector('.bg-accent.text-paper')
      ).toBeInTheDocument();
      expect(
        sectionContainer.querySelector('.bg-accent.text-paper')
      ).toBeInTheDocument();
    });

    it('uses identical badge classes for tool type across components', () => {
      const toolEdge = sharedMockEdges[0]; // Convex

      const { container: edgeItemContainer } = render(
        <EdgeItem edge={toolEdge} />
      );

      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={[toolEdge]}
        />
      );

      // Both should have bg-muted class
      expect(
        edgeItemContainer.querySelector('.bg-muted.text-paper')
      ).toBeInTheDocument();
      expect(
        drawerContainer.querySelector('.bg-muted.text-paper')
      ).toBeInTheDocument();
    });

    it('uses identical badge classes for concept type across components', () => {
      const conceptEdge = sharedMockEdges[4]; // CONVEX-DEVELOPMENT-BEST-PRACTICES

      const { container: edgeItemContainer } = render(
        <EdgeItem edge={conceptEdge} />
      );

      const { container: sectionContainer } = render(
        <ConnectionsSection edges={[conceptEdge]} defaultOpen />
      );

      // Both should have bg-ink class
      expect(
        edgeItemContainer.querySelector('.bg-ink.text-paper')
      ).toBeInTheDocument();
      expect(
        sectionContainer.querySelector('.bg-ink.text-paper')
      ).toBeInTheDocument();
    });
  });

  describe('RelationshipBadge Integration', () => {
    it('uses shared getNodeTypeBadgeClass utility', () => {
      const { container } = render(
        <RelationshipBadge
          relationship="uses"
          targetName="Convex"
          targetNodeType="tool"
          weight={0.8}
        />
      );

      const badge = container.querySelector('.badge-relationship');
      expect(badge).toHaveClass('badge-tool');
    });

    it('displays consistent badge classes for all node types', () => {
      const nodeTypes = [
        { type: 'project', expectedClass: 'badge-project' },
        { type: 'tool', expectedClass: 'badge-tool' },
        { type: 'skill', expectedClass: 'badge-skill' },
        { type: 'concept', expectedClass: 'badge-concept' },
      ];

      nodeTypes.forEach(({ type, expectedClass }) => {
        const { container } = render(
          <RelationshipBadge
            relationship="related"
            targetName="Test"
            targetNodeType={type}
            weight={0.5}
          />
        );

        const badge = container.querySelector('.badge-relationship');
        expect(badge).toHaveClass(expectedClass);
      });
    });

    it('includes relationship and target name in display', () => {
      render(
        <RelationshipBadge
          relationship="uses"
          targetName="Convex"
          targetNodeType="tool"
          weight={0.8}
        />
      );

      expect(screen.getByText(/uses: Convex/i)).toBeInTheDocument();
    });

    it('includes weight in tooltip', () => {
      const { container } = render(
        <RelationshipBadge
          relationship="uses"
          targetName="Convex"
          targetNodeType="tool"
          weight={0.85}
        />
      );

      const badge = container.querySelector('.badge-relationship');
      expect(badge).toHaveAttribute('title', 'uses (85% strength)');
    });
  });

  describe('EdgeItem Variant Consistency', () => {
    it('uses default variant in ConnectionsDrawer', () => {
      render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={[sharedMockEdges[0]]}
        />
      );

      // Default variant has min-w-[80px] on relationship
      const relationship = screen.getByText('uses');
      expect(relationship).toHaveClass('min-w-[80px]');
    });

    it('compact variant does not include min-width', () => {
      render(<EdgeItem edge={sharedMockEdges[0]} variant="compact" />);

      const relationship = screen.getByText('uses');
      expect(relationship).not.toHaveClass('min-w-[80px]');
    });
  });

  describe('User Interaction Flows', () => {
    it('complete flow: card click indicator -> drawer opens -> drawer closes', () => {
      const result: MergedResult = {
        type: 'node',
        content: 'Test node',
        score: 0.9,
        finalScore: 0.9,
        timestamp: Date.now(),
        source: 'graph',
        nodeId: 'test',
        name: 'Test',
        nodeType: 'project',
        edges: sharedMockEdges,
      };

      const handleCardClick = vi.fn();
      render(<MemoryGridCard result={result} onClick={handleCardClick} />);

      // 1. Initial state: drawer closed
      expect(screen.queryByTestId('connections-drawer')).not.toBeInTheDocument();

      // 2. Click connections indicator
      const indicator = screen.getByRole('button', { name: /View 5 connections/i });
      fireEvent.click(indicator);

      // 3. Drawer opens
      expect(screen.getByTestId('connections-drawer')).toBeInTheDocument();

      // 4. Card onClick should NOT have been called
      expect(handleCardClick).not.toHaveBeenCalled();

      // 5. Close drawer via close button
      const closeButton = screen.getByLabelText('Close drawer');
      fireEvent.click(closeButton);

      // 6. Drawer closes
      expect(screen.queryByTestId('connections-drawer')).not.toBeInTheDocument();
    });

    it('drawer can be closed via Escape key', () => {
      const result: MergedResult = {
        type: 'node',
        content: 'Test',
        score: 0.9,
        finalScore: 0.9,
        timestamp: Date.now(),
        source: 'graph',
        nodeId: 'test',
        name: 'Test',
        nodeType: 'tool',
        edges: sharedMockEdges,
      };

      render(<MemoryGridCard result={result} onClick={vi.fn()} />);

      // Open drawer
      const indicator = screen.getByRole('button', { name: /View 5 connections/i });
      fireEvent.click(indicator);

      // Drawer is open
      const drawer = screen.getByTestId('connections-drawer');
      expect(drawer).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(drawer, { key: 'Escape' });

      // Drawer closes
      expect(screen.queryByTestId('connections-drawer')).not.toBeInTheDocument();
    });

    it('drawer can be closed via backdrop click', () => {
      const result: MergedResult = {
        type: 'node',
        content: 'Test',
        score: 0.9,
        finalScore: 0.9,
        timestamp: Date.now(),
        source: 'graph',
        nodeId: 'test',
        name: 'Test',
        nodeType: 'concept',
        edges: sharedMockEdges,
      };

      render(<MemoryGridCard result={result} onClick={vi.fn()} />);

      // Open drawer
      fireEvent.click(screen.getByRole('button', { name: /View 5 connections/i }));
      expect(screen.getByTestId('connections-drawer')).toBeInTheDocument();

      // Click backdrop
      const backdrop = screen.getByTestId('drawer-backdrop');
      fireEvent.click(backdrop);

      // Drawer closes
      expect(screen.queryByTestId('connections-drawer')).not.toBeInTheDocument();
    });
  });

  describe('Empty State Consistency', () => {
    it('handles empty edges consistently across components', () => {
      // ConnectionsDrawer with empty edges
      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={[]}
        />
      );

      // Should render drawer but with no type counts
      expect(drawerContainer.querySelector('[data-testid="connections-drawer"]')).toBeInTheDocument();
      expect(drawerContainer.textContent).not.toContain('tools');
      expect(drawerContainer.textContent).not.toContain('skills');

      // ConnectionsSection with empty edges
      const { container: sectionContainer } = render(
        <ConnectionsSection edges={[]} />
      );

      // Should return null (not render)
      expect(sectionContainer.firstChild).toBeNull();

      // MemoryGridCard with node but no edges
      const result: MergedResult = {
        type: 'node',
        content: 'Test',
        score: 0.9,
        finalScore: 0.9,
        timestamp: Date.now(),
        source: 'graph',
        nodeId: 'test',
        name: 'Test',
        nodeType: 'tool',
        edges: [],
      };

      render(<MemoryGridCard result={result} onClick={vi.fn()} />);

      // Should not show connections indicator
      expect(screen.queryByRole('button', { name: /View.*connections/i })).not.toBeInTheDocument();
    });
  });

  describe('Large Data Set Consistency', () => {
    it('handles many edges consistently', () => {
      // Create 50 edges of various types
      const manyEdges: Edge[] = Array.from({ length: 50 }, (_, i) => ({
        relationship: i % 2 === 0 ? 'uses' : 'requires',
        targetName: `Target-${i}`,
        targetNodeType: ['tool', 'skill', 'project', 'concept'][i % 4],
        weight: 0.5 + (i % 10) / 20,
      }));

      // Render in drawer
      const { container: drawerContainer } = render(
        <ConnectionsDrawer
          isOpen={true}
          onClose={vi.fn()}
          nodeName="Test"
          edges={manyEdges}
        />
      );

      // Render in section
      const { container: sectionContainer } = render(
        <ConnectionsSection edges={manyEdges} defaultOpen />
      );

      // Both should have scrollable containers
      expect(drawerContainer.querySelector('.overflow-y-auto')).toBeInTheDocument();
      expect(sectionContainer.querySelector('.overflow-y-auto')).toBeInTheDocument();

      // Type counts should be consistent
      // i % 4 for 50 items:
      // i=0,4,8,12,16,20,24,28,32,36,40,44,48 -> tool (13 items)
      // i=1,5,9,13,17,21,25,29,33,37,41,45,49 -> skill (13 items)
      // i=2,6,10,14,18,22,26,30,34,38,42,46 -> project (12 items)
      // i=3,7,11,15,19,23,27,31,35,39,43,47 -> concept (12 items)
      const expectedCounts = {
        tool: 13,
        skill: 13,
        project: 12,
        concept: 12,
      };

      Object.entries(expectedCounts).forEach(([type, count]) => {
        // Use proper pluralization
        const pluralForm = count === 1 ? type : `${type}s`;
        expect(drawerContainer.textContent).toContain(`${count} ${pluralForm}`);
        expect(sectionContainer.textContent).toContain(`${count} ${pluralForm}`);
      });
    });
  });
});
