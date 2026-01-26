'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { useGraphData } from './useGraphData';
import { generateCytoscapeStylesheet } from './graphStyles';
import { getLayoutForNodeCount } from './graphLayout';
import { GraphControls, type DepthLevel } from './GraphControls';
import { NodeTooltip } from './NodeTooltip';
import { NodeInfoPanel } from './NodeInfoPanel';
import { GraphLoadingState, GraphEmptyState, GraphErrorState } from './GraphStates';
import { applyDepthFilter, clearDepthFilter } from './depthFilter';
import { applySearchFilter } from './searchFilter';
import type {
  GraphViewerProps,
  TooltipNodeData,
  NodeType,
  SelectedNodeData,
  ConnectedEdge,
  EdgeStatus,
} from './types';

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
 * - Stable graph: no re-layout on data updates
 */
export function GraphViewer({
  className = '',
  onNodeClick,
  nodeTypeFilter,
  relationshipFilter,
  filteredNodeIds,
}: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const isInitializedRef = useRef(false);

  // Fetch graph data with optional filters
  const { elements, isLoading, isEmpty, nodeCount, edgeCount, error } =
    useGraphData({
      nodeType: nodeTypeFilter,
      relationship: relationshipFilter,
    });

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<TooltipNodeData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Selected node state for info panel
  const [selectedNode, setSelectedNode] = useState<SelectedNodeData | null>(
    null
  );

  // Depth filter state
  const [depthLevel, setDepthLevel] = useState<DepthLevel>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store callbacks in refs to avoid re-creating event handlers
  const onNodeClickRef = useRef(onNodeClick);
  const handleNodeSelectRef = useRef<((nodeId: string) => void) | null>(null);
  const handleCloseInfoPanelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  /**
   * Get connected edges for a node from Cytoscape.
   */
  const getConnectedEdges = useCallback(
    (nodeId: string): ConnectedEdge[] => {
      if (!cyRef.current) return [];

      const cy = cyRef.current;
      const node = cy.getElementById(nodeId);
      if (!node.length) return [];

      const connectedEdges: ConnectedEdge[] = [];

      // Get all edges connected to this node
      node.connectedEdges().forEach((edge) => {
        const sourceId = edge.data('source');
        const targetId = edge.data('target');
        const isOutgoing = sourceId === nodeId;
        const otherId = isOutgoing ? targetId : sourceId;
        const otherNode = cy.getElementById(otherId);

        if (otherNode.length) {
          connectedEdges.push({
            id: edge.id(),
            relationship: edge.data('relationship'),
            targetId: otherId,
            targetLabel: otherNode.data('label'),
            targetType: otherNode.data('type') as NodeType,
            weight: edge.data('weight'),
            status: edge.data('status') as EdgeStatus,
            direction: isOutgoing ? 'outgoing' : 'incoming',
          });
        }
      });

      return connectedEdges;
    },
    []
  );

  /**
   * Handle node selection - show info panel.
   */
  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      if (!cyRef.current) return;

      const node = cyRef.current.getElementById(nodeId);
      if (!node.length) return;

      const edges = getConnectedEdges(nodeId);

      setSelectedNode({
        id: nodeId,
        label: node.data('label'),
        type: node.data('type') as NodeType,
        description: node.data('description'),
        edges,
      });

      // Also trigger external callback if provided
      onNodeClickRef.current?.(nodeId);
    },
    [getConnectedEdges]
  );

  /**
   * Close the node info panel and clear depth filter.
   */
  const handleCloseInfoPanel = useCallback(() => {
    setSelectedNode(null);
    setDepthLevel(null);
    if (cyRef.current) {
      clearDepthFilter(cyRef.current);
    }
  }, []);

  /**
   * Handle depth level change.
   */
  const handleDepthChange = useCallback(
    (depth: DepthLevel) => {
      setDepthLevel(depth);

      if (!cyRef.current) return;

      if (depth && selectedNode) {
        applyDepthFilter(cyRef.current, selectedNode.id, depth);
      } else {
        clearDepthFilter(cyRef.current);
      }
    },
    [selectedNode]
  );

  /**
   * Toggle fullscreen mode.
   */
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Resize Cytoscape when fullscreen changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const frameId = requestAnimationFrame(() => {
      cy.resize();
      cy.fit(undefined, 50);
    });

    return () => cancelAnimationFrame(frameId);
  }, [isFullscreen]);

  // Update refs when handlers change
  useEffect(() => {
    handleNodeSelectRef.current = handleNodeSelect;
    handleCloseInfoPanelRef.current = handleCloseInfoPanel;
  }, [handleNodeSelect, handleCloseInfoPanel]);

  // Initialize Cytoscape ONCE when container is ready and we have data
  useEffect(() => {
    if (!containerRef.current || isLoading || isEmpty || error) return;
    if (isInitializedRef.current && cyRef.current) return; // Already initialized

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
    isInitializedRef.current = true;

    // Force resize after a brief delay to ensure container has dimensions
    // This fixes the zero-height issue when Cytoscape initializes before CSS is applied
    requestAnimationFrame(() => {
      cy.resize();
      cy.fit(undefined, 50);
    });

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

    // Node click - show info panel using ref to avoid stale closure
    cy.on('tap', 'node', (event) => {
      const nodeId = event.target.id();
      handleNodeSelectRef.current?.(nodeId);
    });

    // Click on background - close info panel
    cy.on('tap', (event) => {
      if (event.target === cy) {
        handleCloseInfoPanelRef.current?.();
      }
    });

    // Cleanup on unmount
    return () => {
      cy.destroy();
      cyRef.current = null;
      isInitializedRef.current = false;
    };
  }, [isLoading, isEmpty, error]); // Removed elements, nodeCount, onNodeClick from deps

  // Update elements in-place WITHOUT re-layout when data changes
  useEffect(() => {
    if (!cyRef.current || !isInitializedRef.current || !elements.length) return;

    const cy = cyRef.current;
    const currentElementIds = new Set(cy.elements().map((el) => el.id()));
    const newElementIds = new Set(elements.map((el) => el.data.id));

    // Only update if there are actual changes
    const hasChanges =
      currentElementIds.size !== newElementIds.size ||
      [...currentElementIds].some((id) => !newElementIds.has(id)) ||
      [...newElementIds].some((id) => !currentElementIds.has(id));

    if (!hasChanges) return;

    // Batch update to prevent multiple re-renders
    cy.batch(() => {
      // Remove elements that no longer exist
      cy.elements().forEach((el) => {
        if (!newElementIds.has(el.id())) {
          el.remove();
        }
      });

      // Add new elements (without running layout)
      elements.forEach((el) => {
        if (!currentElementIds.has(el.data.id)) {
          cy.add(el);
        }
      });
    });

    // Note: We do NOT run layout here to preserve node positions
  }, [elements]);

  // Apply search filter when filteredNodeIds changes
  useEffect(() => {
    if (!cyRef.current || !isInitializedRef.current) return;

    applySearchFilter(cyRef.current, filteredNodeIds ?? null);
  }, [filteredNodeIds]);

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

  // Fullscreen container classes
  const fullscreenClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-paper'
    : `relative h-full min-h-[500px] ${className}`;

  return (
    <div data-testid="graph-viewer" className={fullscreenClasses}>
      {/* Stats bar */}
      <div className="absolute top-4 left-4 z-10 flex gap-3">
        <span className="px-2 py-1 text-xs font-mono uppercase bg-highlight text-paper border border-ink">
          {nodeCount} {nodeLabel}
        </span>
        <span className="px-2 py-1 text-xs font-mono uppercase bg-muted text-paper border border-ink">
          {edgeCount} {edgeLabel}
        </span>
        {depthLevel && selectedNode && (
          <span className="px-2 py-1 text-xs font-mono uppercase bg-accent text-paper border border-ink">
            {depthLevel}-HOP FROM {selectedNode.label.toUpperCase()}
          </span>
        )}
        {filteredNodeIds && filteredNodeIds.length > 0 && (
          <span className="px-2 py-1 text-xs font-mono uppercase bg-accent text-paper border border-ink">
            {filteredNodeIds.length} FILTERED
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10">
        <GraphControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          onReset={handleReset}
          depthLevel={depthLevel}
          onDepthChange={handleDepthChange}
          depthEnabled={!!selectedNode}
          isFullscreen={isFullscreen}
          onFullscreenToggle={handleFullscreenToggle}
        />
      </div>

      {/* Graph container - Cytoscape renders here */}
      <div
        data-testid="graph-container"
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Node tooltip */}
      <NodeTooltip node={hoveredNode} position={tooltipPosition} />

      {/* Node info panel (shown on click) */}
      {selectedNode && (
        <NodeInfoPanel
          id={selectedNode.id}
          label={selectedNode.label}
          type={selectedNode.type}
          description={selectedNode.description}
          edges={selectedNode.edges}
          onClose={handleCloseInfoPanel}
        />
      )}

      {/* Fullscreen exit hint */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <span className="px-3 py-1.5 text-xs font-mono-brutal bg-ink text-paper border border-ink">
            Press ESC to exit fullscreen
          </span>
        </div>
      )}
    </div>
  );
}
