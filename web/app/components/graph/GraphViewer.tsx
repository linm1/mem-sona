'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { useGraphData } from './useGraphData';
import { generateCytoscapeStylesheet } from './graphStyles';
import { getLayoutForNodeCount } from './graphLayout';
import { GraphControls } from './GraphControls';
import { NodeTooltip } from './NodeTooltip';
import { GraphLoadingState, GraphEmptyState, GraphErrorState } from './GraphStates';
import type { GraphViewerProps, TooltipNodeData, NodeType } from './types';

/**
 * Interactive knowledge graph visualization component.
 * Uses Cytoscape.js with force-directed (COSE) layout.
 *
 * Features:
 * - Force-directed layout for natural node positioning
 * - Node styling by type (project, tool, skill, concept)
 * - Edge styling by status (active, archived, superseded)
 * - Pan, zoom, and click interactions
 * - Hover tooltips with node details
 */
export function GraphViewer({
  className = '',
  onNodeClick,
  nodeTypeFilter,
  relationshipFilter,
}: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Fetch graph data with optional filters
  const { elements, isLoading, isEmpty, nodeCount, edgeCount, error } =
    useGraphData({
      nodeType: nodeTypeFilter,
      relationship: relationshipFilter,
    });

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<TooltipNodeData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Initialize Cytoscape when data is ready
  useEffect(() => {
    if (!containerRef.current || isLoading || isEmpty || error) return;

    // Create Cytoscape instance
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: generateCytoscapeStylesheet(),
      layout: getLayoutForNodeCount(nodeCount),
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    // Node hover - show tooltip
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      const position = node.renderedPosition();
      setHoveredNode({
        id: node.id(),
        label: node.data('label'),
        type: node.data('type') as NodeType,
        description: node.data('description'),
      });
      setTooltipPosition({ x: position.x, y: position.y });
    });

    // Node mouseout - hide tooltip
    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
    });

    // Node click - trigger callback
    cy.on('tap', 'node', (event) => {
      const nodeId = event.target.id();
      onNodeClick?.(nodeId);
    });

    // Cleanup on unmount
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, isLoading, isEmpty, error, nodeCount, onNodeClick]);

  // Control handlers
  const handleZoomIn = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom * 1.2);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (cyRef.current) {
      const currentZoom = cyRef.current.zoom();
      cyRef.current.zoom(currentZoom / 1.2);
    }
  }, []);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 50);
  }, []);

  const handleReset = useCallback(() => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
      cyRef.current.center();
    }
  }, []);

  // Render error state
  if (error) {
    return <GraphErrorState message={error.message} />;
  }

  // Render loading state
  if (isLoading) {
    return <GraphLoadingState />;
  }

  // Render empty state
  if (isEmpty) {
    return <GraphEmptyState />;
  }

  // Format counts with proper pluralization
  const nodeLabel = nodeCount === 1 ? 'node' : 'nodes';
  const edgeLabel = edgeCount === 1 ? 'edge' : 'edges';

  return (
    <div
      data-testid="graph-viewer"
      className={`relative h-full min-h-[500px] ${className}`}
    >
      {/* Stats bar */}
      <div className="absolute top-4 left-4 z-10 flex gap-3">
        <span className="px-2 py-1 text-xs font-mono uppercase bg-highlight text-paper border border-ink">
          {nodeCount} {nodeLabel}
        </span>
        <span className="px-2 py-1 text-xs font-mono uppercase bg-muted text-paper border border-ink">
          {edgeCount} {edgeLabel}
        </span>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10">
        <GraphControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onReset={handleReset}
        />
      </div>

      {/* Graph container - Cytoscape renders here */}
      <div
        data-testid="graph-container"
        ref={containerRef}
        className="w-full h-full"
      />

      {/* Node tooltip */}
      <NodeTooltip node={hoveredNode} position={tooltipPosition} />
    </div>
  );
}
