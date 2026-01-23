// convex/categories.test.ts
// Tests for categories query functions (US-031)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';

// Mock types for Convex context
type MockQueryCtx = {
  db: {
    get: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
};

// Test fixtures
const createMockCategory = (overrides: Partial<Doc<'categories'>> = {}): Doc<'categories'> => ({
  _id: 'cat123' as Id<'categories'>,
  _creationTime: Date.now(),
  name: 'tech_preferences',
  summary: 'Test summary content',
  updatedAt: Date.now(),
  ...overrides,
});

const createMockItem = (overrides: Partial<Doc<'items'>> = {}): Doc<'items'> => ({
  _id: 'item123' as Id<'items'>,
  _creationTime: Date.now(),
  content: 'Test fact',
  category: 'tech_preferences',
  resourceId: 'res123' as Id<'resources'>,
  embedding: new Array(1024).fill(0.1),
  createdAt: Date.now(),
  accessedAt: Date.now(),
  accessCount: 0,
  ...overrides,
});

describe('list', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('returns all categories with item counts', async () => {
    const mockCategories = [
      createMockCategory({ _id: 'c1' as Id<'categories'>, name: 'tech_preferences', summary: 'Tech prefs' }),
      createMockCategory({ _id: 'c2' as Id<'categories'>, name: 'projects', summary: 'My projects' }),
      createMockCategory({ _id: 'c3' as Id<'categories'>, name: 'work_context', summary: 'Work info' }),
    ];

    const mockItems = [
      createMockItem({ category: 'tech_preferences' }),
      createMockItem({ category: 'tech_preferences' }),
      createMockItem({ category: 'projects' }),
      createMockItem({ category: 'projects' }),
      createMockItem({ category: 'projects' }),
    ];

    const mockCollect = vi.fn()
      .mockResolvedValueOnce(mockCategories) // First call for categories
      .mockResolvedValueOnce(mockItems); // Second call for items

    mockCtx.db.query = vi.fn().mockReturnValue({ collect: mockCollect });

    const { list } = await import('./categories');

    const result = await (list as any)(mockCtx as any, {});

    expect(result).toHaveLength(3);

    // Check tech_preferences
    const techPrefs = result.find((c: any) => c.name === 'tech_preferences');
    expect(techPrefs).toBeDefined();
    expect(techPrefs?.itemCount).toBe(2);
    expect(techPrefs?.summary).toBe('Tech prefs');

    // Check projects
    const projects = result.find((c: any) => c.name === 'projects');
    expect(projects).toBeDefined();
    expect(projects?.itemCount).toBe(3);

    // Check work_context (no items)
    const workContext = result.find((c: any) => c.name === 'work_context');
    expect(workContext).toBeDefined();
    expect(workContext?.itemCount).toBe(0);
  });

  it('returns empty array when no categories exist', async () => {
    const mockCollect = vi.fn()
      .mockResolvedValueOnce([]) // No categories
      .mockResolvedValueOnce([]); // No items

    mockCtx.db.query = vi.fn().mockReturnValue({ collect: mockCollect });

    const { list } = await import('./categories');

    const result = await (list as any)(mockCtx as any, {});

    expect(result).toEqual([]);
  });

  it('handles categories with no items', async () => {
    const mockCategories = [
      createMockCategory({ _id: 'c1' as Id<'categories'>, name: 'empty_category' }),
    ];

    const mockCollect = vi.fn()
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce([]); // No items

    mockCtx.db.query = vi.fn().mockReturnValue({ collect: mockCollect });

    const { list } = await import('./categories');

    const result = await (list as any)(mockCtx as any, {});

    expect(result).toHaveLength(1);
    expect(result[0].itemCount).toBe(0);
  });

  it('includes all category fields in response', async () => {
    const mockCategories = [
      createMockCategory({
        _id: 'c1' as Id<'categories'>,
        name: 'test_category',
        summary: 'Test summary',
        updatedAt: 1234567890,
      }),
    ];

    const mockCollect = vi.fn()
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce([]);

    mockCtx.db.query = vi.fn().mockReturnValue({ collect: mockCollect });

    const { list } = await import('./categories');

    const result = await (list as any)(mockCtx as any, {});

    expect(result[0]).toHaveProperty('_id');
    expect(result[0]).toHaveProperty('name', 'test_category');
    expect(result[0]).toHaveProperty('summary', 'Test summary');
    expect(result[0]).toHaveProperty('updatedAt', 1234567890);
    expect(result[0]).toHaveProperty('itemCount', 0);
  });

  it('correctly counts items across multiple categories', async () => {
    const mockCategories = [
      createMockCategory({ name: 'cat1' }),
      createMockCategory({ name: 'cat2' }),
      createMockCategory({ name: 'cat3' }),
    ];

    const mockItems = [
      createMockItem({ category: 'cat1' }),
      createMockItem({ category: 'cat1' }),
      createMockItem({ category: 'cat1' }),
      createMockItem({ category: 'cat2' }),
      createMockItem({ category: 'cat3' }),
      createMockItem({ category: 'cat3' }),
      createMockItem({ category: 'cat3' }),
      createMockItem({ category: 'cat3' }),
    ];

    const mockCollect = vi.fn()
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockItems);

    mockCtx.db.query = vi.fn().mockReturnValue({ collect: mockCollect });

    const { list } = await import('./categories');

    const result = await (list as any)(mockCtx as any, {});

    const cat1 = result.find((c: any) => c.name === 'cat1');
    const cat2 = result.find((c: any) => c.name === 'cat2');
    const cat3 = result.find((c: any) => c.name === 'cat3');

    expect(cat1?.itemCount).toBe(3);
    expect(cat2?.itemCount).toBe(1);
    expect(cat3?.itemCount).toBe(4);
  });

  it('handles items in categories that no longer exist in categories table', async () => {
    const mockCategories = [
      createMockCategory({ name: 'existing_category' }),
    ];

    const mockItems = [
      createMockItem({ category: 'existing_category' }),
      createMockItem({ category: 'orphan_category' }), // Category doesn't exist
    ];

    const mockCollect = vi.fn()
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockItems);

    mockCtx.db.query = vi.fn().mockReturnValue({ collect: mockCollect });

    const { list } = await import('./categories');

    const result = await (list as any)(mockCtx as any, {});

    // Should only return existing categories
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('existing_category');
    expect(result[0].itemCount).toBe(1);
  });
});
