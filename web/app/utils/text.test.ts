import { describe, it, expect } from 'vitest';
import { pluralize, getTypeCounts } from './text';

describe('pluralize', () => {
  describe('count = 1', () => {
    it('returns singular for skill', () => {
      expect(pluralize('skill', 1)).toBe('skill');
    });

    it('returns singular for tool', () => {
      expect(pluralize('tool', 1)).toBe('tool');
    });

    it('returns singular for project', () => {
      expect(pluralize('project', 1)).toBe('project');
    });

    it('returns singular for concept', () => {
      expect(pluralize('concept', 1)).toBe('concept');
    });

    it('returns singular for unknown word', () => {
      expect(pluralize('item', 1)).toBe('item');
    });
  });

  describe('count = 0', () => {
    it('returns plural for skill when count is 0', () => {
      expect(pluralize('skill', 0)).toBe('skills');
    });

    it('returns plural for tool when count is 0', () => {
      expect(pluralize('tool', 0)).toBe('tools');
    });

    it('returns plural for project when count is 0', () => {
      expect(pluralize('project', 0)).toBe('projects');
    });

    it('returns plural for concept when count is 0', () => {
      expect(pluralize('concept', 0)).toBe('concepts');
    });

    it('returns generic plural for unknown word when count is 0', () => {
      expect(pluralize('item', 0)).toBe('items');
    });
  });

  describe('count > 1', () => {
    it('returns skills for multiple', () => {
      expect(pluralize('skill', 2)).toBe('skills');
      expect(pluralize('skill', 5)).toBe('skills');
      expect(pluralize('skill', 100)).toBe('skills');
    });

    it('returns tools for multiple', () => {
      expect(pluralize('tool', 2)).toBe('tools');
      expect(pluralize('tool', 5)).toBe('tools');
      expect(pluralize('tool', 100)).toBe('tools');
    });

    it('returns projects for multiple', () => {
      expect(pluralize('project', 2)).toBe('projects');
      expect(pluralize('project', 5)).toBe('projects');
      expect(pluralize('project', 100)).toBe('projects');
    });

    it('returns concepts for multiple', () => {
      expect(pluralize('concept', 2)).toBe('concepts');
      expect(pluralize('concept', 5)).toBe('concepts');
      expect(pluralize('concept', 100)).toBe('concepts');
    });

    it('returns generic plural for unknown words', () => {
      expect(pluralize('item', 2)).toBe('items');
      expect(pluralize('item', 10)).toBe('items');
    });
  });

  describe('edge cases', () => {
    it('handles negative counts by returning plural', () => {
      expect(pluralize('skill', -1)).toBe('skills');
      expect(pluralize('tool', -5)).toBe('tools');
    });

    it('handles empty string word', () => {
      expect(pluralize('', 1)).toBe('');
      expect(pluralize('', 2)).toBe('s');
    });

    it('handles large counts', () => {
      expect(pluralize('skill', 999999)).toBe('skills');
      expect(pluralize('tool', Number.MAX_SAFE_INTEGER)).toBe('tools');
    });

    it('handles decimal counts by treating as plural', () => {
      expect(pluralize('skill', 1.5)).toBe('skills');
      expect(pluralize('tool', 0.5)).toBe('tools');
    });
  });
});

describe('getTypeCounts', () => {
  describe('empty input', () => {
    it('returns empty object for empty array', () => {
      const result = getTypeCounts([]);
      expect(result).toEqual({});
    });
  });

  describe('single type', () => {
    it('counts single edge of one type', () => {
      const edges = [
        { relationship: 'uses', targetName: 'React', targetNodeType: 'tool', weight: 0.9 },
      ];
      const result = getTypeCounts(edges);
      expect(result).toEqual({ tool: 1 });
    });

    it('counts multiple edges of same type', () => {
      const edges = [
        { relationship: 'uses', targetName: 'React', targetNodeType: 'tool', weight: 0.9 },
        { relationship: 'uses', targetName: 'Vue', targetNodeType: 'tool', weight: 0.8 },
        { relationship: 'uses', targetName: 'Svelte', targetNodeType: 'tool', weight: 0.7 },
      ];
      const result = getTypeCounts(edges);
      expect(result).toEqual({ tool: 3 });
    });
  });

  describe('multiple types', () => {
    it('counts edges of different types', () => {
      const edges = [
        { relationship: 'uses', targetName: 'React', targetNodeType: 'tool', weight: 0.9 },
        { relationship: 'requires', targetName: 'JavaScript', targetNodeType: 'skill', weight: 0.8 },
        { relationship: 'completed', targetName: 'SPRINT-001', targetNodeType: 'project', weight: 0.85 },
        { relationship: 'follows', targetName: 'SOLID', targetNodeType: 'concept', weight: 0.7 },
      ];
      const result = getTypeCounts(edges);
      expect(result).toEqual({
        tool: 1,
        skill: 1,
        project: 1,
        concept: 1,
      });
    });

    it('counts complex mixed types', () => {
      const edges = [
        { relationship: 'uses', targetName: 'React', targetNodeType: 'tool', weight: 0.9 },
        { relationship: 'uses', targetName: 'Vue', targetNodeType: 'tool', weight: 0.8 },
        { relationship: 'requires', targetName: 'JavaScript', targetNodeType: 'skill', weight: 0.8 },
        { relationship: 'requires', targetName: 'TypeScript', targetNodeType: 'skill', weight: 0.85 },
        { relationship: 'requires', targetName: 'CSS', targetNodeType: 'skill', weight: 0.7 },
        { relationship: 'completed', targetName: 'SPRINT-001', targetNodeType: 'project', weight: 0.85 },
        { relationship: 'follows', targetName: 'SOLID', targetNodeType: 'concept', weight: 0.7 },
        { relationship: 'follows', targetName: 'DRY', targetNodeType: 'concept', weight: 0.65 },
      ];
      const result = getTypeCounts(edges);
      expect(result).toEqual({
        tool: 2,
        skill: 3,
        project: 1,
        concept: 2,
      });
    });
  });

  describe('edge cases', () => {
    it('handles unknown node types', () => {
      const edges = [
        { relationship: 'related', targetName: 'Unknown', targetNodeType: 'unknown', weight: 0.5 },
        { relationship: 'related', targetName: 'Other', targetNodeType: 'other', weight: 0.6 },
      ];
      const result = getTypeCounts(edges);
      expect(result).toEqual({
        unknown: 1,
        other: 1,
      });
    });

    it('handles empty string node types', () => {
      const edges = [
        { relationship: 'related', targetName: 'Test', targetNodeType: '', weight: 0.5 },
        { relationship: 'related', targetName: 'Test2', targetNodeType: '', weight: 0.6 },
      ];
      const result = getTypeCounts(edges);
      expect(result).toEqual({ '': 2 });
    });

    it('handles case-sensitive node types', () => {
      const edges = [
        { relationship: 'uses', targetName: 'React', targetNodeType: 'tool', weight: 0.9 },
        { relationship: 'uses', targetName: 'Vue', targetNodeType: 'Tool', weight: 0.8 },
        { relationship: 'uses', targetName: 'Svelte', targetNodeType: 'TOOL', weight: 0.7 },
      ];
      const result = getTypeCounts(edges);
      expect(result).toEqual({
        tool: 1,
        Tool: 1,
        TOOL: 1,
      });
    });

    it('maintains immutability - does not mutate input array', () => {
      const edges = [
        { relationship: 'uses', targetName: 'React', targetNodeType: 'tool', weight: 0.9 },
      ];
      const originalEdges = [...edges];
      getTypeCounts(edges);
      expect(edges).toEqual(originalEdges);
    });

    it('handles very large arrays efficiently', () => {
      const edges = Array.from({ length: 1000 }, (_, i) => ({
        relationship: 'uses',
        targetName: `Tool${i}`,
        targetNodeType: i % 2 === 0 ? 'tool' : 'skill',
        weight: 0.5,
      }));
      const result = getTypeCounts(edges);
      expect(result).toEqual({
        tool: 500,
        skill: 500,
      });
    });
  });

  describe('type safety', () => {
    it('works with Edge interface from real components', () => {
      interface Edge {
        relationship: string;
        targetName: string;
        targetNodeType: string;
        weight: number;
      }

      const edges: Edge[] = [
        { relationship: 'uses', targetName: 'React', targetNodeType: 'tool', weight: 0.9 },
        { relationship: 'requires', targetName: 'JavaScript', targetNodeType: 'skill', weight: 0.8 },
      ];

      const result = getTypeCounts(edges);
      expect(result).toEqual({
        tool: 1,
        skill: 1,
      });
    });
  });
});
