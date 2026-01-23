import { describe, it, expect, vi } from 'vitest';
import {
  applySearchFilter,
  clearSearchFilter,
  getFilteredElements,
} from './searchFilter';

/**
 * Creates a mock Cytoscape instance for testing.
 */
const createMockCy = (
  nodes: string[],
  edges: { id: string; source: string; target: string }[]
) => {
  const nodeMap = new Map(
    nodes.map((id) => [
      id,
      {
        id: () => id,
        isNode: () => true,
        length: 1,
        removeClass: vi.fn(),
        addClass: vi.fn(),
        style: vi.fn(),
      },
    ])
  );

  const edgeMap = new Map(
    edges.map((e) => [
      e.id,
      {
        id: () => e.id,
        isEdge: () => true,
        length: 1,
        data: (key: string) => (key === 'source' ? e.source : e.target),
        removeClass: vi.fn(),
        addClass: vi.fn(),
        style: vi.fn(),
      },
    ])
  );

  const elementsReturnValue = {
    removeClass: vi.fn(),
    addClass: vi.fn(),
    style: vi.fn(),
  };

  return {
    getElementById: vi.fn(
      (id) => nodeMap.get(id) || edgeMap.get(id) || { length: 0 }
    ),
    nodes: vi.fn(() => ({
      forEach: (fn: (node: unknown) => void) =>
        nodes.forEach((id) => fn(nodeMap.get(id))),
      length: nodes.length,
      removeClass: vi.fn(),
      style: vi.fn(),
    })),
    edges: vi.fn(() => ({
      forEach: (fn: (edge: unknown) => void) =>
        edges.forEach((e) => fn(edgeMap.get(e.id))),
      length: edges.length,
      removeClass: vi.fn(),
      style: vi.fn(),
    })),
    elements: vi.fn(() => elementsReturnValue),
    batch: vi.fn((fn: () => void) => fn()),
  };
};

describe('searchFilter', () => {
  describe('getFilteredElements', () => {
    it('returns empty sets when filterNodeIds is empty', () => {
      const cy = createMockCy(
        ['n1', 'n2'],
        [{ id: 'e1', source: 'n1', target: 'n2' }]
      );
      const result = getFilteredElements(cy as unknown as cytoscape.Core, []);

      expect(result.visibleNodeIds.size).toBe(0);
      expect(result.visibleEdgeIds.size).toBe(0);
    });

    it('returns only specified nodes', () => {
      const cy = createMockCy(['n1', 'n2', 'n3'], []);
      const result = getFilteredElements(cy as unknown as cytoscape.Core, [
        'n1',
        'n2',
      ]);

      expect(result.visibleNodeIds.has('n1')).toBe(true);
      expect(result.visibleNodeIds.has('n2')).toBe(true);
      expect(result.visibleNodeIds.has('n3')).toBe(false);
    });

    it('includes edges between filtered nodes', () => {
      const cy = createMockCy(
        ['n1', 'n2', 'n3'],
        [
          { id: 'e1', source: 'n1', target: 'n2' },
          { id: 'e2', source: 'n2', target: 'n3' },
        ]
      );
      const result = getFilteredElements(cy as unknown as cytoscape.Core, [
        'n1',
        'n2',
      ]);

      expect(result.visibleEdgeIds.has('e1')).toBe(true); // Both endpoints in filter
      expect(result.visibleEdgeIds.has('e2')).toBe(false); // n3 not in filter
    });

    it('excludes edges where only one endpoint is filtered', () => {
      const cy = createMockCy(
        ['n1', 'n2'],
        [{ id: 'e1', source: 'n1', target: 'n2' }]
      );
      const result = getFilteredElements(cy as unknown as cytoscape.Core, [
        'n1',
      ]);

      expect(result.visibleEdgeIds.has('e1')).toBe(false);
    });

    it('returns correct totalNodes count', () => {
      const cy = createMockCy(['n1', 'n2', 'n3', 'n4'], []);
      const result = getFilteredElements(cy as unknown as cytoscape.Core, [
        'n1',
      ]);

      expect(result.totalNodes).toBe(4);
      expect(result.filteredNodes).toBe(1);
    });
  });

  describe('applySearchFilter', () => {
    it('shows all elements when filterNodeIds is null', () => {
      const cy = createMockCy(['n1', 'n2'], []);
      applySearchFilter(cy as unknown as cytoscape.Core, null);

      expect(cy.elements().removeClass).toHaveBeenCalledWith('search-hidden');
      expect(cy.elements().style).toHaveBeenCalledWith('display', 'element');
    });

    it('shows all elements when filterNodeIds is empty array', () => {
      const cy = createMockCy(['n1', 'n2'], []);
      applySearchFilter(cy as unknown as cytoscape.Core, []);

      expect(cy.elements().removeClass).toHaveBeenCalledWith('search-hidden');
      expect(cy.elements().style).toHaveBeenCalledWith('display', 'element');
    });

    it('uses batch for performance when filtering', () => {
      const cy = createMockCy(['n1', 'n2', 'n3'], []);
      applySearchFilter(cy as unknown as cytoscape.Core, ['n1']);

      expect(cy.batch).toHaveBeenCalled();
    });

    it('hides all elements before showing filtered ones', () => {
      const cy = createMockCy(['n1', 'n2'], []);
      applySearchFilter(cy as unknown as cytoscape.Core, ['n1']);

      expect(cy.elements().addClass).toHaveBeenCalledWith('search-hidden');
      expect(cy.elements().style).toHaveBeenCalledWith('display', 'none');
    });
  });

  describe('clearSearchFilter', () => {
    it('removes search-hidden class and shows all elements', () => {
      const cy = createMockCy(['n1', 'n2'], []);
      clearSearchFilter(cy as unknown as cytoscape.Core);

      expect(cy.batch).toHaveBeenCalled();
      expect(cy.elements().removeClass).toHaveBeenCalledWith('search-hidden');
      expect(cy.elements().style).toHaveBeenCalledWith('display', 'element');
    });
  });
});
