// convex/textSearch.test.ts
// TDD Tests for Text Search Functions (BM25-style via Convex searchIndex)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockItem = (overrides: Partial<Doc<'items'>> = {}): Doc<'items'> => ({
  _id: 'item123' as Id<'items'>,
  _creationTime: Date.now(),
  content: 'Test content',
  category: 'test',
  resourceId: 'res123' as Id<'resources'>,
  embedding: new Array(1024).fill(0.1),
  createdAt: Date.now(),
  accessedAt: Date.now(),
  accessCount: 0,
  ...overrides,
});

const createMockNode = (overrides: Partial<Doc<'graphNodes'>> = {}): Doc<'graphNodes'> => ({
  _id: 'node123' as Id<'graphNodes'>,
  _creationTime: Date.now(),
  name: 'Test Node',
  type: 'project',
  properties: {},
  embedding: new Array(1024).fill(0.1),
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

// Mock Convex query context type
type MockQueryCtx = {
  db: {
    query: ReturnType<typeof vi.fn>;
  };
};

// ============================================================================
// TEXT SEARCH ITEMS TESTS
// ============================================================================

describe('textSearchItems', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: vi.fn(),
      },
    };
  });

  it('should search items by content using searchIndex', async () => {
    const mockItems = [
      createMockItem({ _id: 'i1' as Id<'items'>, content: 'voyage-4 embedding model' }),
      createMockItem({ _id: 'i2' as Id<'items'>, content: 'voyage-4 API documentation' }),
    ];

    const mockTake = vi.fn().mockResolvedValue(mockItems);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    const result = await textSearchItemsHandler(mockCtx as any, {
      query: 'voyage-4',
      limit: 20,
    });

    expect(result).toHaveLength(2);
    expect(mockCtx.db.query).toHaveBeenCalledWith('items');
    expect(mockWithSearchIndex).toHaveBeenCalledWith('by_content', expect.any(Function));
    expect(mockTake).toHaveBeenCalledWith(20);
  });

  it('should filter by category when provided', async () => {
    const mockItems = [
      createMockItem({ _id: 'i1' as Id<'items'>, content: 'Test', category: 'tech_preferences' }),
    ];

    const mockTake = vi.fn().mockResolvedValue(mockItems);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    const result = await textSearchItemsHandler(mockCtx as any, {
      query: 'test',
      category: 'tech_preferences',
      limit: 20,
    });

    expect(result).toHaveLength(1);
    // Verify the search index callback receives category filter
    const searchCallback = mockWithSearchIndex.mock.calls[0][1];
    const mockSearchBuilder = {
      search: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    searchCallback(mockSearchBuilder);
    expect(mockSearchBuilder.eq).toHaveBeenCalledWith('category', 'tech_preferences');
  });

  it('should use default limit of 20 when not specified', async () => {
    const mockTake = vi.fn().mockResolvedValue([]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    await textSearchItemsHandler(mockCtx as any, {
      query: 'test',
    });

    expect(mockTake).toHaveBeenCalledWith(20);
  });

  it('should return empty array when no matches found', async () => {
    const mockTake = vi.fn().mockResolvedValue([]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    const result = await textSearchItemsHandler(mockCtx as any, {
      query: 'nonexistent',
      limit: 10,
    });

    expect(result).toEqual([]);
  });

  it('should preserve all item fields in results', async () => {
    const mockItem = createMockItem({
      _id: 'i1' as Id<'items'>,
      content: 'Important content',
      category: 'projects',
      accessCount: 42,
    });

    const mockTake = vi.fn().mockResolvedValue([mockItem]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    const result = await textSearchItemsHandler(mockCtx as any, {
      query: 'important',
      limit: 10,
    });

    expect(result[0].content).toBe('Important content');
    expect(result[0].category).toBe('projects');
    expect(result[0].accessCount).toBe(42);
  });
});

// ============================================================================
// TEXT SEARCH NODES TESTS
// ============================================================================

describe('textSearchNodes', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: vi.fn(),
      },
    };
  });

  it('should search nodes by name using searchIndex', async () => {
    const mockNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'voyage-4' }),
      createMockNode({ _id: 'n2' as Id<'graphNodes'>, name: 'voyage-ai-sdk' }),
    ];

    const mockTake = vi.fn().mockResolvedValue(mockNodes);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchNodesHandler } = await import('./textSearch');

    const result = await textSearchNodesHandler(mockCtx as any, {
      query: 'voyage',
      limit: 10,
    });

    expect(result).toHaveLength(2);
    expect(mockCtx.db.query).toHaveBeenCalledWith('graphNodes');
    expect(mockWithSearchIndex).toHaveBeenCalledWith('by_name', expect.any(Function));
    expect(mockTake).toHaveBeenCalledWith(10);
  });

  it('should filter by type when provided', async () => {
    const mockNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, name: 'TypeScript', type: 'tool' }),
    ];

    const mockTake = vi.fn().mockResolvedValue(mockNodes);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchNodesHandler } = await import('./textSearch');

    const result = await textSearchNodesHandler(mockCtx as any, {
      query: 'TypeScript',
      type: 'tool',
      limit: 10,
    });

    expect(result).toHaveLength(1);
    // Verify the search index callback receives type filter
    const searchCallback = mockWithSearchIndex.mock.calls[0][1];
    const mockSearchBuilder = {
      search: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    searchCallback(mockSearchBuilder);
    expect(mockSearchBuilder.eq).toHaveBeenCalledWith('type', 'tool');
  });

  it('should always filter for active status', async () => {
    const mockNodes = [
      createMockNode({ _id: 'n1' as Id<'graphNodes'>, status: 'active' }),
    ];

    const mockTake = vi.fn().mockResolvedValue(mockNodes);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchNodesHandler } = await import('./textSearch');

    await textSearchNodesHandler(mockCtx as any, {
      query: 'test',
      limit: 10,
    });

    // Verify the search index callback includes status filter
    const searchCallback = mockWithSearchIndex.mock.calls[0][1];
    const mockSearchBuilder = {
      search: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    searchCallback(mockSearchBuilder);
    expect(mockSearchBuilder.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('should use default limit of 10 when not specified', async () => {
    const mockTake = vi.fn().mockResolvedValue([]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchNodesHandler } = await import('./textSearch');

    await textSearchNodesHandler(mockCtx as any, {
      query: 'test',
    });

    expect(mockTake).toHaveBeenCalledWith(10);
  });

  it('should return empty array when no matches found', async () => {
    const mockTake = vi.fn().mockResolvedValue([]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchNodesHandler } = await import('./textSearch');

    const result = await textSearchNodesHandler(mockCtx as any, {
      query: 'nonexistent',
      limit: 10,
    });

    expect(result).toEqual([]);
  });

  it('should preserve all node fields in results', async () => {
    const mockNode = createMockNode({
      _id: 'n1' as Id<'graphNodes'>,
      name: 'mem-sona',
      type: 'project',
      properties: { description: 'Memory system', status: 'active' },
    });

    const mockTake = vi.fn().mockResolvedValue([mockNode]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchNodesHandler } = await import('./textSearch');

    const result = await textSearchNodesHandler(mockCtx as any, {
      query: 'mem-sona',
      limit: 10,
    });

    expect(result[0].name).toBe('mem-sona');
    expect(result[0].type).toBe('project');
    expect(result[0].properties.description).toBe('Memory system');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('text search edge cases', () => {
  let mockCtx: MockQueryCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        query: vi.fn(),
      },
    };
  });

  it('should handle queries with special characters', async () => {
    const mockTake = vi.fn().mockResolvedValue([]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    // Should not throw
    await expect(
      textSearchItemsHandler(mockCtx as any, {
        query: 'C++ "hello world" test@example.com',
        limit: 10,
      })
    ).resolves.toBeDefined();
  });

  it('should handle very long queries by truncating', async () => {
    const mockTake = vi.fn().mockResolvedValue([]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    // Convex limits to 16 terms - our function should handle this gracefully
    const longQuery = Array(50).fill('word').join(' ');

    await expect(
      textSearchItemsHandler(mockCtx as any, {
        query: longQuery,
        limit: 10,
      })
    ).resolves.toBeDefined();
  });

  it('should handle empty query string', async () => {
    const mockTake = vi.fn().mockResolvedValue([]);
    const mockWithSearchIndex = vi.fn().mockReturnValue({ take: mockTake });
    mockCtx.db.query = vi.fn().mockReturnValue({ withSearchIndex: mockWithSearchIndex });

    const { textSearchItemsHandler } = await import('./textSearch');

    const result = await textSearchItemsHandler(mockCtx as any, {
      query: '',
      limit: 10,
    });

    // Empty query should return empty results
    expect(result).toEqual([]);
  });

  it('should handle whitespace-only query', async () => {
    const { textSearchItemsHandler } = await import('./textSearch');

    const result = await textSearchItemsHandler(mockCtx as any, {
      query: '   ',
      limit: 10,
    });

    expect(result).toEqual([]);
  });
});
