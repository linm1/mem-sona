import type { Core } from 'cytoscape';

/**
 * Result of search filtering.
 */
export interface SearchFilterResult {
  /** Node IDs to show */
  visibleNodeIds: Set<string>;
  /** Edge IDs to show (edges between visible nodes) */
  visibleEdgeIds: Set<string>;
  /** Total nodes in graph */
  totalNodes: number;
  /** Number of nodes in filter */
  filteredNodes: number;
}

/**
 * Get nodes and edges to show based on filter node IDs.
 * Only shows edges where BOTH endpoints are in the filter.
 *
 * @param cy - Cytoscape instance
 * @param filterNodeIds - Array of node IDs to show
 * @returns Sets of visible node and edge IDs
 */
export function getFilteredElements(
  cy: Core,
  filterNodeIds: string[]
): SearchFilterResult {
  const visibleNodeIds = new Set<string>(filterNodeIds);
  const visibleEdgeIds = new Set<string>();

  if (filterNodeIds.length === 0) {
    return {
      visibleNodeIds,
      visibleEdgeIds,
      totalNodes: cy.nodes().length,
      filteredNodes: 0,
    };
  }

  // Find edges where both endpoints are in the filter
  cy.edges().forEach((edge) => {
    const sourceId = edge.data('source');
    const targetId = edge.data('target');

    if (visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId)) {
      visibleEdgeIds.add(edge.id());
    }
  });

  return {
    visibleNodeIds,
    visibleEdgeIds,
    totalNodes: cy.nodes().length,
    filteredNodes: visibleNodeIds.size,
  };
}

/**
 * Apply search filter to show only specified nodes and their connecting edges.
 * Uses CSS display property for hiding/showing elements.
 *
 * @param cy - Cytoscape instance
 * @param filterNodeIds - Node IDs to show (null/empty shows all)
 */
export function applySearchFilter(
  cy: Core,
  filterNodeIds: string[] | null
): void {
  // Show all if no filter
  if (!filterNodeIds || filterNodeIds.length === 0) {
    cy.elements().removeClass('search-hidden');
    cy.elements().style('display', 'element');
    return;
  }

  const result = getFilteredElements(cy, filterNodeIds);

  cy.batch(() => {
    // Hide all first
    cy.elements().addClass('search-hidden');
    cy.elements().style('display', 'none');

    // Show visible nodes
    result.visibleNodeIds.forEach((nodeId) => {
      const node = cy.getElementById(nodeId);
      if (node.length) {
        node.removeClass('search-hidden');
        node.style('display', 'element');
      }
    });

    // Show visible edges
    result.visibleEdgeIds.forEach((edgeId) => {
      const edge = cy.getElementById(edgeId);
      if (edge.length) {
        edge.removeClass('search-hidden');
        edge.style('display', 'element');
      }
    });
  });
}

/**
 * Clear search filter and show all elements.
 *
 * @param cy - Cytoscape instance
 */
export function clearSearchFilter(cy: Core): void {
  cy.batch(() => {
    cy.elements().removeClass('search-hidden');
    cy.elements().style('display', 'element');
  });
}
