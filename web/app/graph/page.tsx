'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { DashboardLayout } from '../components/layout';
import { GraphViewer } from '../components/graph';

/**
 * Knowledge Graph Visualization Page.
 * Displays interactive graph of user's knowledge network.
 * Route: /graph
 *
 * Supports URL parameter filtering:
 * - /graph?filter=node1,node2,node3 - Shows only specified nodes and their edges
 */
export default function GraphPage() {
  const searchParams = useSearchParams();

  // Parse filtered nodes from URL: /graph?filter=node1,node2,node3
  const filteredNodeIds = useMemo(() => {
    const filter = searchParams.get('filter');
    return filter ? filter.split(',').filter(Boolean) : undefined;
  }, [searchParams]);

  /**
   * Handle node click - can be extended to show node details panel.
   */
  const handleNodeClick = (_nodeId: string) => {
    // Future enhancement: Open node details panel or navigate to node page
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="p-4 bg-paper border-2 border-ink">
          <h1 className="font-mono text-lg font-bold uppercase tracking-wide mb-2">
            Knowledge Graph
          </h1>
          <p className="text-sm text-muted">
            {filteredNodeIds?.length
              ? `Showing ${filteredNodeIds.length} nodes from search results.`
              : 'Explore relationships between your projects, tools, skills, and concepts. Pan, zoom, and click nodes to interact with the graph.'}
          </p>
          {filteredNodeIds?.length ? (
            <a
              href="/graph"
              className="text-sm text-accent hover:underline mt-2 inline-block"
            >
              Clear filter and show all nodes
            </a>
          ) : null}
        </div>

        {/* Graph Viewer */}
        <div className="bg-paper border-2 border-ink">
          <GraphViewer
            className="h-[600px]"
            onNodeClick={handleNodeClick}
            filteredNodeIds={filteredNodeIds}
          />
        </div>

        {/* Legend */}
        <div className="p-4 bg-paper border-2 border-ink">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wide mb-3">
            Legend
          </h2>
          <div className="flex flex-wrap gap-4">
            {/* Node types */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-highlight border border-ink" />
              <span className="text-xs">Project</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted border border-ink" />
              <span className="text-xs">Tool</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-accent border border-ink" />
              <span className="text-xs">Skill</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-ink border border-ink" />
              <span className="text-xs">Concept</span>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-muted mx-2" />

            {/* Edge types */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-muted" />
              <span className="text-xs">Active Edge</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 bg-muted"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #595456, #595456 4px, transparent 4px, transparent 8px)',
                  backgroundColor: 'transparent',
                }}
              />
              <span className="text-xs">Archived Edge</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
