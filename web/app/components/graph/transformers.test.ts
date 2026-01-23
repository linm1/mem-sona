import { describe, it, expect } from 'vitest';
import {
  transformNodeToCytoscape,
  transformEdgeToCytoscape,
  transformGraphData,
} from './transformers';
import type { GraphNode, GraphEdge } from './types';

describe('transformers', () => {
  describe('transformNodeToCytoscape', () => {
    const mockNode: GraphNode = {
      _id: 'node-1',
      name: 'TypeScript',
      type: 'tool',
      properties: { description: 'A typed superset of JavaScript' },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('transforms node with correct id', () => {
      const result = transformNodeToCytoscape(mockNode);
      expect(result.data.id).toBe('node-1');
    });

    it('transforms node with correct label from name', () => {
      const result = transformNodeToCytoscape(mockNode);
      expect(result.data.label).toBe('TypeScript');
    });

    it('transforms node with correct type', () => {
      const result = transformNodeToCytoscape(mockNode);
      expect(result.data.type).toBe('tool');
    });

    it('includes description when present', () => {
      const result = transformNodeToCytoscape(mockNode);
      expect(result.data.description).toBe('A typed superset of JavaScript');
    });

    it('handles missing description gracefully', () => {
      const nodeWithoutDesc: GraphNode = {
        ...mockNode,
        properties: {},
      };
      const result = transformNodeToCytoscape(nodeWithoutDesc);
      expect(result.data.description).toBeUndefined();
    });

    it('preserves all node types correctly', () => {
      const types = ['project', 'tool', 'skill', 'concept'] as const;
      types.forEach((type) => {
        const node: GraphNode = { ...mockNode, type };
        const result = transformNodeToCytoscape(node);
        expect(result.data.type).toBe(type);
      });
    });
  });

  describe('transformEdgeToCytoscape', () => {
    const mockEdge: GraphEdge = {
      _id: 'edge-1',
      fromNode: 'node-1',
      toNode: 'node-2',
      relationship: 'uses_tool',
      weight: 0.8,
      properties: { context: 'For type safety' },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('transforms edge with correct id', () => {
      const result = transformEdgeToCytoscape(mockEdge);
      expect(result.data.id).toBe('edge-1');
    });

    it('transforms source from fromNode', () => {
      const result = transformEdgeToCytoscape(mockEdge);
      expect(result.data.source).toBe('node-1');
    });

    it('transforms target from toNode', () => {
      const result = transformEdgeToCytoscape(mockEdge);
      expect(result.data.target).toBe('node-2');
    });

    it('includes relationship type', () => {
      const result = transformEdgeToCytoscape(mockEdge);
      expect(result.data.relationship).toBe('uses_tool');
    });

    it('includes weight', () => {
      const result = transformEdgeToCytoscape(mockEdge);
      expect(result.data.weight).toBe(0.8);
    });

    it('includes status for styling', () => {
      const result = transformEdgeToCytoscape(mockEdge);
      expect(result.data.status).toBe('active');
    });

    it('handles archived status', () => {
      const archivedEdge: GraphEdge = { ...mockEdge, status: 'archived' };
      const result = transformEdgeToCytoscape(archivedEdge);
      expect(result.data.status).toBe('archived');
    });

    it('handles superseded status', () => {
      const supersededEdge: GraphEdge = { ...mockEdge, status: 'superseded' };
      const result = transformEdgeToCytoscape(supersededEdge);
      expect(result.data.status).toBe('superseded');
    });
  });

  describe('transformGraphData', () => {
    const mockNodes: GraphNode[] = [
      {
        _id: 'n1',
        name: 'Project Alpha',
        type: 'project',
        properties: { description: 'Main project' },
        status: 'active',
        createdAt: 0,
        updatedAt: 0,
      },
      {
        _id: 'n2',
        name: 'React',
        type: 'tool',
        properties: {},
        status: 'active',
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    const mockEdges: GraphEdge[] = [
      {
        _id: 'e1',
        fromNode: 'n1',
        toNode: 'n2',
        relationship: 'uses_tool',
        weight: 0.9,
        properties: {},
        status: 'active',
        createdAt: 0,
        updatedAt: 0,
      },
    ];

    it('returns empty array for empty inputs', () => {
      const result = transformGraphData([], []);
      expect(result).toEqual([]);
    });

    it('transforms nodes only when no edges', () => {
      const result = transformGraphData(mockNodes, []);
      expect(result).toHaveLength(2);
      expect(result[0].data.id).toBe('n1');
      expect(result[1].data.id).toBe('n2');
    });

    it('transforms edges only when no nodes', () => {
      const result = transformGraphData([], mockEdges);
      expect(result).toHaveLength(1);
      expect(result[0].data.id).toBe('e1');
    });

    it('combines nodes and edges correctly', () => {
      const result = transformGraphData(mockNodes, mockEdges);
      expect(result).toHaveLength(3);
    });

    it('places nodes before edges in result array', () => {
      const result = transformGraphData(mockNodes, mockEdges);
      // First two should be nodes
      expect(result[0].data.id).toBe('n1');
      expect(result[1].data.id).toBe('n2');
      // Last should be edge (has source property)
      expect('source' in result[2].data).toBe(true);
    });

    it('preserves node data integrity', () => {
      const result = transformGraphData(mockNodes, mockEdges);
      const firstNode = result[0] as { data: { label: string; type: string; description: string } };
      expect(firstNode.data.label).toBe('Project Alpha');
      expect(firstNode.data.type).toBe('project');
      expect(firstNode.data.description).toBe('Main project');
    });

    it('preserves edge data integrity', () => {
      const result = transformGraphData(mockNodes, mockEdges);
      const edge = result[2] as { data: { source: string; target: string; relationship: string } };
      expect(edge.data.source).toBe('n1');
      expect(edge.data.target).toBe('n2');
      expect(edge.data.relationship).toBe('uses_tool');
    });

    it('handles large datasets', () => {
      const manyNodes: GraphNode[] = Array.from({ length: 100 }, (_, i) => ({
        _id: `node-${i}`,
        name: `Node ${i}`,
        type: 'concept' as const,
        properties: {},
        status: 'active',
        createdAt: 0,
        updatedAt: 0,
      }));

      const manyEdges: GraphEdge[] = Array.from({ length: 50 }, (_, i) => ({
        _id: `edge-${i}`,
        fromNode: `node-${i}`,
        toNode: `node-${i + 1}`,
        relationship: 'related_to',
        weight: 0.5,
        properties: {},
        status: 'active' as const,
        createdAt: 0,
        updatedAt: 0,
      }));

      const result = transformGraphData(manyNodes, manyEdges);
      expect(result).toHaveLength(150);
    });
  });
});
