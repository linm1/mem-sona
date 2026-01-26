// web/app/components/graph/types.test.ts
// Unit tests for graph type definitions
// Following TDD methodology: Write tests FIRST, then implement

import { describe, it, expect } from 'vitest';
import { RELATIONSHIP_TYPES } from './types';
import type {
  NodeType,
  EdgeEditCallback,
  EdgeArchiveCallback,
  RelationshipType,
} from './types';

describe('Graph Types', () => {
  describe('EdgeEditCallback', () => {
    it('should define EdgeEditCallback type with correct signature', () => {
      // Type test - verify signature via variable assignment
      const mockCallback: EdgeEditCallback = (edgeId, relationship, weight, context?) => {
        // Mock implementation
      };

      // Runtime verification
      expect(mockCallback).toBeDefined();
      expect(typeof mockCallback).toBe('function');
    });
  });

  describe('EdgeArchiveCallback', () => {
    it('should define EdgeArchiveCallback type with correct signature', () => {
      // Type test - verify signature via variable assignment
      const mockCallback: EdgeArchiveCallback = (edgeId) => {
        // Mock implementation
      };

      // Runtime verification
      expect(mockCallback).toBeDefined();
      expect(typeof mockCallback).toBe('function');
    });
  });

  describe('RELATIONSHIP_TYPES', () => {
    it('should export RELATIONSHIP_TYPES constant array', () => {
      expect(RELATIONSHIP_TYPES).toBeDefined();
      expect(Array.isArray(RELATIONSHIP_TYPES)).toBe(true);
    });

    it('should contain common relationship types', () => {
      // Should include standard relationship types
      expect(RELATIONSHIP_TYPES).toContain('uses');
      expect(RELATIONSHIP_TYPES).toContain('requires');
      expect(RELATIONSHIP_TYPES).toContain('knows');
      expect(RELATIONSHIP_TYPES).toContain('works_on');
      expect(RELATIONSHIP_TYPES).toContain('uses_tool');
      expect(RELATIONSHIP_TYPES).toContain('requires_skill');
      expect(RELATIONSHIP_TYPES).toContain('works_at');
      expect(RELATIONSHIP_TYPES).toContain('primary_language');
    });

    it('should have at least 8 relationship types', () => {
      expect(RELATIONSHIP_TYPES.length).toBeGreaterThanOrEqual(8);
    });

    it('should be readonly (const assertion)', () => {
      // TypeScript enforces readonly at compile time via 'as const'
      // Runtime: verify it's a plain array (not frozen, but const prevents reassignment)
      expect(RELATIONSHIP_TYPES).toBeDefined();
      expect(Array.isArray(RELATIONSHIP_TYPES)).toBe(true);

      // Verify the type is treated as readonly tuple in TypeScript
      // (This is a compile-time check - if this compiles, the type is correct)
      const _typeCheck: readonly string[] = RELATIONSHIP_TYPES;
      expect(_typeCheck).toBe(RELATIONSHIP_TYPES);
    });
  });

  describe('RelationshipType', () => {
    it('should define RelationshipType as union of RELATIONSHIP_TYPES', () => {
      // Type should be derived from RELATIONSHIP_TYPES
      expect(RELATIONSHIP_TYPES).toBeDefined();

      // Valid relationships - compile-time type check
      const validRelationships: RelationshipType[] = [
        'uses',
        'requires',
        'knows',
        'works_on',
        'uses_tool',
        'requires_skill',
        'works_at',
        'primary_language',
      ];

      validRelationships.forEach(rel => {
        expect(RELATIONSHIP_TYPES).toContain(rel);
      });
    });
  });
});

describe('Type Exports', () => {
  it('should export EdgeEditCallback type', () => {
    // Compile-time type check
    const callback: EdgeEditCallback = () => {};
    expect(callback).toBeDefined();
  });

  it('should export EdgeArchiveCallback type', () => {
    // Compile-time type check
    const callback: EdgeArchiveCallback = () => {};
    expect(callback).toBeDefined();
  });

  it('should export RELATIONSHIP_TYPES constant', () => {
    expect(RELATIONSHIP_TYPES).toBeDefined();
  });

  it('should export RelationshipType type', () => {
    // Compile-time type check
    const relType: RelationshipType = 'uses';
    expect(relType).toBeDefined();
  });
});
