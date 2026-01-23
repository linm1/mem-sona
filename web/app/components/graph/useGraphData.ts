'use client';

import { useQuery } from 'convex/react';
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
 * Custom hook for fetching and transforming graph data for Cytoscape.
 * Uses Convex reactive queries for real-time updates.
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

  // Transform data when available
  const elements: CytoscapeElement[] = !isLoading
    ? transformGraphData(nodes as GraphNode[], edges as GraphEdge[])
    : [];

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
