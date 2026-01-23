import { describe, it, expect } from 'vitest';
import {
  getNodeTypeColor,
  getNodeTypeSize,
  getEdgeStyle,
  generateCytoscapeStylesheet,
  COLORS,
} from './graphStyles';
import type { NodeType, EdgeStatus } from './types';

describe('graphStyles', () => {
  describe('COLORS', () => {
    it('exports color constants', () => {
      expect(COLORS.paper).toBeDefined();
      expect(COLORS.ink).toBeDefined();
      expect(COLORS.muted).toBeDefined();
      expect(COLORS.accent).toBeDefined();
      expect(COLORS.highlight).toBeDefined();
    });

    it('matches design system colors', () => {
      expect(COLORS.paper).toBe('#fefefe');
      expect(COLORS.ink).toBe('#323232');
      expect(COLORS.muted).toBe('#595456');
      expect(COLORS.accent).toBe('#03b57b');
      expect(COLORS.highlight).toBe('#ea940c');
    });
  });

  describe('getNodeTypeColor', () => {
    it('returns highlight color for project', () => {
      expect(getNodeTypeColor('project')).toBe('#ea940c');
    });

    it('returns muted color for tool', () => {
      expect(getNodeTypeColor('tool')).toBe('#595456');
    });

    it('returns accent color for skill', () => {
      expect(getNodeTypeColor('skill')).toBe('#03b57b');
    });

    it('returns ink color for concept', () => {
      expect(getNodeTypeColor('concept')).toBe('#323232');
    });

    it('returns default ink color for unknown type', () => {
      expect(getNodeTypeColor('unknown' as NodeType)).toBe('#323232');
    });

    it('handles all valid node types', () => {
      const types: NodeType[] = ['project', 'tool', 'skill', 'concept'];
      types.forEach((type) => {
        const color = getNodeTypeColor(type);
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('getNodeTypeSize', () => {
    it('returns largest size for project', () => {
      expect(getNodeTypeSize('project')).toBe(50);
    });

    it('returns medium size for tool', () => {
      expect(getNodeTypeSize('tool')).toBe(40);
    });

    it('returns medium size for skill', () => {
      expect(getNodeTypeSize('skill')).toBe(40);
    });

    it('returns smallest size for concept', () => {
      expect(getNodeTypeSize('concept')).toBe(35);
    });

    it('returns default size for unknown type', () => {
      expect(getNodeTypeSize('unknown' as NodeType)).toBe(35);
    });

    it('projects are larger than tools', () => {
      expect(getNodeTypeSize('project')).toBeGreaterThan(
        getNodeTypeSize('tool')
      );
    });

    it('tools and skills are same size', () => {
      expect(getNodeTypeSize('tool')).toBe(getNodeTypeSize('skill'));
    });
  });

  describe('getEdgeStyle', () => {
    it('returns solid line for active edges', () => {
      const style = getEdgeStyle('active', 0.8);
      expect(style.lineStyle).toBe('solid');
    });

    it('returns dashed line for archived edges', () => {
      const style = getEdgeStyle('archived', 0.5);
      expect(style.lineStyle).toBe('dashed');
    });

    it('returns dashed line for superseded edges', () => {
      const style = getEdgeStyle('superseded', 0.3);
      expect(style.lineStyle).toBe('dashed');
    });

    it('calculates width based on weight - low weight', () => {
      const style = getEdgeStyle('active', 0.2);
      expect(style.width).toBeGreaterThanOrEqual(1);
      expect(style.width).toBeLessThan(2);
    });

    it('calculates width based on weight - high weight', () => {
      const style = getEdgeStyle('active', 1.0);
      expect(style.width).toBe(4);
    });

    it('higher weight results in wider line', () => {
      const lowWeight = getEdgeStyle('active', 0.2);
      const highWeight = getEdgeStyle('active', 0.9);
      expect(highWeight.width).toBeGreaterThan(lowWeight.width);
    });

    it('returns muted color for active edges', () => {
      const style = getEdgeStyle('active', 0.5);
      expect(style.color).toBe('#595456');
    });

    it('returns archived color for archived edges', () => {
      const style = getEdgeStyle('archived', 0.5);
      expect(style.color).toBe('#999999');
    });

    it('returns archived color for superseded edges', () => {
      const style = getEdgeStyle('superseded', 0.5);
      expect(style.color).toBe('#999999');
    });

    it('returns higher opacity for active edges', () => {
      const style = getEdgeStyle('active', 0.5);
      expect(style.opacity).toBe(0.8);
    });

    it('returns lower opacity for archived edges', () => {
      const style = getEdgeStyle('archived', 0.5);
      expect(style.opacity).toBe(0.5);
    });

    it('returns lowest opacity for superseded edges', () => {
      const style = getEdgeStyle('superseded', 0.5);
      expect(style.opacity).toBe(0.4);
    });

    it('handles zero weight', () => {
      const style = getEdgeStyle('active', 0);
      expect(style.width).toBe(1);
    });

    it('handles weight exceeding 1', () => {
      const style = getEdgeStyle('active', 1.5);
      expect(style.width).toBeGreaterThan(4);
    });
  });

  describe('generateCytoscapeStylesheet', () => {
    it('returns an array of style definitions', () => {
      const stylesheet = generateCytoscapeStylesheet();
      expect(Array.isArray(stylesheet)).toBe(true);
      expect(stylesheet.length).toBeGreaterThan(0);
    });

    it('includes base node style', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const nodeStyle = stylesheet.find((s) => s.selector === 'node');
      expect(nodeStyle).toBeDefined();
      expect(nodeStyle?.style).toBeDefined();
    });

    it('includes base edge style', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const edgeStyle = stylesheet.find((s) => s.selector === 'edge');
      expect(edgeStyle).toBeDefined();
    });

    it('includes project node type selector', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const projectStyle = stylesheet.find(
        (s) => s.selector === 'node[type="project"]'
      );
      expect(projectStyle).toBeDefined();
    });

    it('includes tool node type selector', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const toolStyle = stylesheet.find(
        (s) => s.selector === 'node[type="tool"]'
      );
      expect(toolStyle).toBeDefined();
    });

    it('includes skill node type selector', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const skillStyle = stylesheet.find(
        (s) => s.selector === 'node[type="skill"]'
      );
      expect(skillStyle).toBeDefined();
    });

    it('includes concept node type selector', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const conceptStyle = stylesheet.find(
        (s) => s.selector === 'node[type="concept"]'
      );
      expect(conceptStyle).toBeDefined();
    });

    it('includes selected node style', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const selectedStyle = stylesheet.find(
        (s) => s.selector === 'node:selected'
      );
      expect(selectedStyle).toBeDefined();
    });

    it('includes active node hover style', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const activeStyle = stylesheet.find(
        (s) => s.selector === 'node:active'
      );
      expect(activeStyle).toBeDefined();
    });

    it('includes active edge selector', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const activeEdgeStyle = stylesheet.find(
        (s) => s.selector === 'edge[status="active"]'
      );
      expect(activeEdgeStyle).toBeDefined();
    });

    it('includes archived edge selector', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const archivedStyle = stylesheet.find(
        (s) => s.selector === 'edge[status="archived"]'
      );
      expect(archivedStyle).toBeDefined();
    });

    it('includes superseded edge selector', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const supersededStyle = stylesheet.find(
        (s) => s.selector === 'edge[status="superseded"]'
      );
      expect(supersededStyle).toBeDefined();
    });

    it('includes selected edge style', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const selectedEdgeStyle = stylesheet.find(
        (s) => s.selector === 'edge:selected'
      );
      expect(selectedEdgeStyle).toBeDefined();
    });

    it('node styles have label set to data(label)', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const nodeStyle = stylesheet.find((s) => s.selector === 'node');
      expect(nodeStyle?.style?.label).toBe('data(label)');
    });

    it('project nodes have highlight background color', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const projectStyle = stylesheet.find(
        (s) => s.selector === 'node[type="project"]'
      );
      expect(projectStyle?.style?.['background-color']).toBe(COLORS.highlight);
    });

    it('edges have arrow shape configured', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const edgeStyle = stylesheet.find((s) => s.selector === 'edge');
      expect(edgeStyle?.style?.['target-arrow-shape']).toBe('triangle');
    });

    it('archived edges have dashed line style', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const archivedStyle = stylesheet.find(
        (s) => s.selector === 'edge[status="archived"]'
      );
      expect(archivedStyle?.style?.['line-style']).toBe('dashed');
    });
  });

  describe('node label styling', () => {
    it('has dark ink color for readability', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const nodeStyle = stylesheet.find((s) => s.selector === 'node');
      expect(nodeStyle?.style?.color).toBe(COLORS.ink);
    });

    it('positions label below the node', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const nodeStyle = stylesheet.find((s) => s.selector === 'node');
      expect(nodeStyle?.style?.['text-valign']).toBe('bottom');
    });

    it('has vertical margin between node and label', () => {
      const stylesheet = generateCytoscapeStylesheet();
      const nodeStyle = stylesheet.find((s) => s.selector === 'node');
      expect(nodeStyle?.style?.['text-margin-y']).toBeGreaterThan(0);
    });
  });
});
