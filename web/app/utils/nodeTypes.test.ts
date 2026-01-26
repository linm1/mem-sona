import { describe, it, expect } from 'vitest';
import { NODE_TYPE_COLORS, getNodeTypeBadgeClass } from './nodeTypes';

describe('NODE_TYPE_COLORS', () => {
  it('has correct color mapping for project type', () => {
    expect(NODE_TYPE_COLORS.project).toBe('bg-highlight text-paper');
  });

  it('has correct color mapping for tool type', () => {
    expect(NODE_TYPE_COLORS.tool).toBe('bg-muted text-paper');
  });

  it('has correct color mapping for skill type', () => {
    expect(NODE_TYPE_COLORS.skill).toBe('bg-accent text-paper');
  });

  it('has correct color mapping for concept type', () => {
    expect(NODE_TYPE_COLORS.concept).toBe('bg-ink text-paper');
  });

  it('contains all four required node types', () => {
    const types = Object.keys(NODE_TYPE_COLORS);
    expect(types).toContain('project');
    expect(types).toContain('tool');
    expect(types).toContain('skill');
    expect(types).toContain('concept');
    expect(types).toHaveLength(4);
  });
});

describe('getNodeTypeBadgeClass', () => {
  it('returns "badge-project" for project type', () => {
    expect(getNodeTypeBadgeClass('project')).toBe('badge-project');
  });

  it('returns "badge-tool" for tool type', () => {
    expect(getNodeTypeBadgeClass('tool')).toBe('badge-tool');
  });

  it('returns "badge-skill" for skill type', () => {
    expect(getNodeTypeBadgeClass('skill')).toBe('badge-skill');
  });

  it('returns "badge-concept" for concept type', () => {
    expect(getNodeTypeBadgeClass('concept')).toBe('badge-concept');
  });

  it('defaults to "badge-concept" for unknown type', () => {
    expect(getNodeTypeBadgeClass('unknown')).toBe('badge-concept');
  });

  it('defaults to "badge-concept" for empty string', () => {
    expect(getNodeTypeBadgeClass('')).toBe('badge-concept');
  });

  it('handles case sensitivity by treating uppercase as unknown', () => {
    expect(getNodeTypeBadgeClass('PROJECT')).toBe('badge-concept');
  });

  it('is a pure function with no side effects', () => {
    const result1 = getNodeTypeBadgeClass('tool');
    const result2 = getNodeTypeBadgeClass('tool');
    expect(result1).toBe(result2);
    expect(result1).toBe('badge-tool');
  });
});
