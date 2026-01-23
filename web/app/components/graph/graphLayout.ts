/**
 * Extended COSE layout options with all configurable parameters.
 */
export interface CoseLayoutOptions {
  name: 'cose';
  animate: boolean;
  animationDuration: number;
  nodeRepulsion: number;
  idealEdgeLength: number;
  gravity: number;
  padding: number;
  randomize: boolean;
  componentSpacing: number;
  nodeOverlap: number;
  nestingFactor: number;
  edgeElasticity: number;
}

/**
 * Configuration options for layout generation.
 */
export interface LayoutConfigOptions {
  padding?: number;
  animate?: boolean;
}

/**
 * Get COSE (Compound Spring Embedder) layout options.
 * Force-directed algorithm that produces natural-looking graphs.
 *
 * The COSE algorithm simulates physical forces:
 * - Nodes repel each other (like charged particles)
 * - Edges act as springs pulling connected nodes together
 * - Gravity pulls nodes toward the center
 */
export function getCoseLayoutOptions(
  config: LayoutConfigOptions = {}
): CoseLayoutOptions {
  return {
    name: 'cose',
    animate: config.animate ?? true,
    animationDuration: 500,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    gravity: 0.25,
    padding: config.padding ?? 50,
    randomize: false,
    componentSpacing: 100,
    nodeOverlap: 20,
    nestingFactor: 1.2,
    edgeElasticity: 100,
  };
}

/**
 * Get layout options adjusted for graph size.
 * Larger graphs need different parameters for performance and readability.
 *
 * Thresholds:
 * - < 50 nodes: Default settings (best quality)
 * - 50-99 nodes: Reduced repulsion, increased gravity, faster animation
 * - >= 100 nodes: Minimal repulsion, no animation (performance mode)
 */
export function getLayoutForNodeCount(
  nodeCount: number,
  config: LayoutConfigOptions = {}
): CoseLayoutOptions {
  const baseOptions = getCoseLayoutOptions(config);

  // Large graphs (100+ nodes): Performance mode
  if (nodeCount >= 100) {
    return {
      ...baseOptions,
      nodeRepulsion: 3000,
      gravity: 0.5,
      animate: false,
    };
  }

  // Medium graphs (50-99 nodes): Balanced mode
  if (nodeCount >= 50) {
    return {
      ...baseOptions,
      nodeRepulsion: 5000,
      gravity: 0.4,
      animationDuration: 300,
    };
  }

  // Small graphs (< 50 nodes): Quality mode
  return baseOptions;
}
