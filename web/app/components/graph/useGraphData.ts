'use client';

import { useQuery } from 'convex/react';
import { useMemo, useRef } from 'react';
import { api } from '../../../../convex/_generated/api';
import { transformGraphData } from './transformers';
import type {
  UseGraphDataResult,
  UseGraphDataOptions,
  CytoscapeElement,
  GraphNode,
  GraphEdge,
} from './types';

/**
 * Deep comparison for element arrays.
 * Compares element IDs and key properties to detect actual changes.
 */
function areElementsEqual(
  prev: CytoscapeElement[],
  next: CytoscapeElement[]
): boolean {
  if (prev.length !== next.length) return false;

  // Create a map of prev elements by ID for O(1) lookup
  const prevMap = new Map(prev.map((el) => [el.data.id, el]));

  for (const nextEl of next) {
    const prevEl = prevMap.get(nextEl.data.id);
    if (!prevEl) return false;

    // Compare key properties (shallow comparison is sufficient for our use case)
    if (JSON.stringify(prevEl.data) !== JSON.stringify(nextEl.data)) {
      return false;
    }
  }

  return true;
}

/**
 * Custom hook for fetching and transforming graph data for Cytoscape.
 * Uses Convex reactive queries for real-time updates.
 * Memoizes elements with stable reference to prevent unnecessary re-renders.
 *
 * @param options - Optional filters for node type and relationship
 * @returns Graph data including elements, loading state, and counts
 */
export function useGraphData(
  options: UseGraphDataOptions = {}
): UseGraphDataResult {
  const { nodeType, relationship } = options;

  // Fetch nodes (reactive query)
  const nodes = useQuery(api.graph.listActiveNodes, { type: nodeType });

  // Fetch edges (reactive query)
  const edges = useQuery(api.graph.listActiveEdgesPublic, { relationship });

  // Loading state - either query still loading
  const isLoading = nodes === undefined || edges === undefined;

  // Ref to store previous elements for comparison
  const prevElementsRef = useRef<CytoscapeElement[]>([]);

  // Transform data when available with stable memoization
  const elements = useMemo(() => {
    if (isLoading) return [];

    const newElements = transformGraphData(
      nodes as GraphNode[],
      edges as GraphEdge[]
    );

    // Return previous reference if elements haven't actually changed
    // This prevents unnecessary Cytoscape updates
    if (areElementsEqual(prevElementsRef.current, newElements)) {
      return prevElementsRef.current;
    }

    prevElementsRef.current = newElements;
    return newElements;
  }, [nodes, edges, isLoading]);

  // Empty state - no nodes in graph
  const isEmpty = !isLoading && (nodes as GraphNode[]).length === 0;

  // Counts
  const nodeCount = (nodes as GraphNode[] | undefined)?.length ?? 0;
  const edgeCount = (edges as GraphEdge[] | undefined)?.length ?? 0;

  return {
    elements,
    isLoading,
    isEmpty,
    nodeCount,
    edgeCount,
    error: null,
  };
}
