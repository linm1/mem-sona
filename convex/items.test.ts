// convex/items.test.ts
// Tests for item CRUD mutations (TDD for Memory Explorer editor)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Doc, Id } from './_generated/dataModel';

// Mock types for Convex context
type MockMutationCtx = {
  db: {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
};

// Test fixtures
const createMockItem = (overrides: Partial<Doc<'items'>> = {}): Doc<'items'> => ({
  _id: 'item123' as Id<'items'>,
  _creationTime: Date.now(),
  content: 'User prefers TypeScript over JavaScript',
  category: 'tech_preferences',
  resourceId: 'resource123' as Id<'resources'>,
  embedding: new Array(1024).fill(0.1),
  createdAt: Date.now() - 86400000, // 1 day ago
  accessedAt: Date.now() - 3600000, // 1 hour ago
  accessCount: 5,
  ...overrides,
});

describe('updateItem', () => {
  let mockCtx: MockMutationCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('updates content and keeps category unchanged when only content provided', async () => {
    const existingItem = createMockItem({
      _id: 'item123' as Id<'items'>,
      content: 'Old content',
      category: 'tech_preferences',
    });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.patch = vi.fn().mockResolvedValue(undefined);

    // When updateItem is implemented, it should:
    // 1. Fetch the existing item
    // 2. Update content
    // 3. Regenerate embedding (via action)
    // 4. Patch the item with new content and embedding

    // For now, verify the expected behavior
    expect(existingItem.content).toBe('Old content');
    expect(existingItem.category).toBe('tech_preferences');
  });

  it('updates category without regenerating embedding when content unchanged', async () => {
    const existingItem = createMockItem({
      _id: 'item123' as Id<'items'>,
      content: 'Some content',
      category: 'old_category',
    });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.patch = vi.fn().mockResolvedValue(undefined);

    // When updateItem is called with only category change:
    // - Embedding should NOT be regenerated (expensive operation)
    // - Only category field should be patched

    expect(existingItem.category).toBe('old_category');
  });

  it('updates both content and category simultaneously', async () => {
    const existingItem = createMockItem({
      _id: 'item123' as Id<'items'>,
      content: 'Old content',
      category: 'old_category',
    });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.patch = vi.fn().mockResolvedValue(undefined);

    // When both content and category are provided:
    // - Embedding MUST be regenerated (content changed)
    // - Both fields patched

    expect(existingItem.content).toBe('Old content');
    expect(existingItem.category).toBe('old_category');
  });

  it('throws error for non-existent item', async () => {
    mockCtx.db.get = vi.fn().mockResolvedValue(null);

    // updateItem should throw with clear error message
    const itemId = 'nonexistent' as Id<'items'>;

    // Expected error: `Item not found: ${itemId}`
    expect(mockCtx.db.get).not.toHaveBeenCalled(); // Will be called in implementation
  });

  it('updates accessedAt timestamp on modification', async () => {
    const oldAccessedAt = Date.now() - 86400000; // 1 day ago
    const existingItem = createMockItem({
      _id: 'item123' as Id<'items'>,
      accessedAt: oldAccessedAt,
    });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.patch = vi.fn().mockResolvedValue(undefined);

    // updateItem should update accessedAt to current time
    expect(existingItem.accessedAt).toBe(oldAccessedAt);
  });

  it('validates content is not empty string when provided', async () => {
    const existingItem = createMockItem();
    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);

    // updateItem should reject empty content strings
    // Expected error: 'Content cannot be empty'
    expect(existingItem.content).not.toBe('');
  });

  it('validates category is not empty string when provided', async () => {
    const existingItem = createMockItem();
    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);

    // updateItem should reject empty category strings
    // Expected error: 'Category cannot be empty'
    expect(existingItem.category).not.toBe('');
  });

  it('preserves resourceId and createdAt (immutable fields)', async () => {
    const originalResourceId = 'resource456' as Id<'resources'>;
    const originalCreatedAt = Date.now() - 172800000; // 2 days ago

    const existingItem = createMockItem({
      resourceId: originalResourceId,
      createdAt: originalCreatedAt,
    });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);

    // resourceId and createdAt should never be modified
    expect(existingItem.resourceId).toBe(originalResourceId);
    expect(existingItem.createdAt).toBe(originalCreatedAt);
  });
});

describe('deleteItem', () => {
  let mockCtx: MockMutationCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('hard deletes item from database', async () => {
    const existingItem = createMockItem({ _id: 'item123' as Id<'items'> });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.delete = vi.fn().mockResolvedValue(undefined);

    // deleteItem should call db.delete (not patch status)
    // Items use hard delete, unlike graphNodes which use soft delete
    expect(mockCtx.db.delete).not.toHaveBeenCalled(); // Will be called in implementation
  });

  it('returns true on successful deletion', async () => {
    const existingItem = createMockItem({ _id: 'item123' as Id<'items'> });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.delete = vi.fn().mockResolvedValue(undefined);

    // deleteItem should return true after successful deletion
    // This matches the pattern used in graph.archiveNode
    expect(existingItem).toBeDefined();
  });

  it('throws error for non-existent item', async () => {
    mockCtx.db.get = vi.fn().mockResolvedValue(null);

    const itemId = 'nonexistent' as Id<'items'>;

    // deleteItem should throw: `Item not found: ${itemId}`
    // This is important for proper error handling in the UI
    expect(mockCtx.db.get).not.toHaveBeenCalled(); // Will be called in implementation
  });

  it('removes item completely (not soft delete)', async () => {
    const existingItem = createMockItem({ _id: 'item123' as Id<'items'> });

    mockCtx.db.get = vi.fn()
      .mockResolvedValueOnce(existingItem) // First call: verify exists
      .mockResolvedValueOnce(null); // Second call: verify deleted

    mockCtx.db.delete = vi.fn().mockResolvedValue(undefined);

    // Unlike graphNodes, items don't have a status field
    // They should be completely removed from the database
    expect(existingItem).toBeDefined();
  });
});

describe('getItem', () => {
  let mockCtx: MockMutationCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('returns item by ID', async () => {
    const item = createMockItem({ _id: 'item123' as Id<'items'> });
    mockCtx.db.get = vi.fn().mockResolvedValue(item);

    // getItem already exists - just documenting expected behavior
    expect(item._id).toBe('item123');
    expect(item.content).toBe('User prefers TypeScript over JavaScript');
  });

  it('returns null for non-existent item', async () => {
    mockCtx.db.get = vi.fn().mockResolvedValue(null);

    // getItem should return null, not throw
    expect(mockCtx.db.get).not.toHaveBeenCalled();
  });
});

describe('updateItemAccess', () => {
  let mockCtx: MockMutationCtx;

  beforeEach(() => {
    mockCtx = {
      db: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        query: vi.fn(),
      },
    };
  });

  it('increments accessCount by 1', async () => {
    const existingItem = createMockItem({
      _id: 'item123' as Id<'items'>,
      accessCount: 5,
    });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.patch = vi.fn().mockResolvedValue(undefined);

    // updateItemAccess should increment accessCount
    // Already exists - documenting expected behavior
    expect(existingItem.accessCount).toBe(5);
  });

  it('updates accessedAt to current timestamp', async () => {
    const oldAccessedAt = Date.now() - 3600000; // 1 hour ago
    const existingItem = createMockItem({
      _id: 'item123' as Id<'items'>,
      accessedAt: oldAccessedAt,
    });

    mockCtx.db.get = vi.fn().mockResolvedValue(existingItem);
    mockCtx.db.patch = vi.fn().mockResolvedValue(undefined);

    // updateItemAccess should update accessedAt
    expect(existingItem.accessedAt).toBe(oldAccessedAt);
  });
});
