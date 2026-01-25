/**
 * Unit tests for MCP Tool Handlers
 * Tests the hybridOnly filtering feature for memory_search
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolHandlers } from './handlers.js';

/**
 * Helper to extract text from CallToolResult content
 */
function getResultText(result: { content: Array<{ type: string; text?: string }> }): string {
  const textContent = result.content[0];
  if (textContent.type === 'text' && textContent.text) {
    return textContent.text;
  }
  return '';
}

// Create shared mock functions
const mockAction = vi.fn();
const mockMutation = vi.fn();
const mockQuery = vi.fn();

// Mock the ConvexHttpClient as a class
vi.mock('convex/browser', () => {
  return {
    ConvexHttpClient: class MockConvexHttpClient {
      action = mockAction;
      mutation = mockMutation;
      query = mockQuery;
      constructor(_url: string) {}
    },
  };
});

describe('ToolHandlers', () => {
  let handlers: ToolHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = new ToolHandlers('https://test.convex.cloud');
  });

  describe('handleMemorySearch', () => {
    describe('hybridOnly filtering', () => {
      it('filters to only hybrid source results when hybridOnly is true', async () => {
        const mockResults = {
          query: 'test query',
          results: [
            {
              type: 'item',
              content: 'Vector result',
              score: 0.9,
              finalScore: 0.85,
              timestamp: Date.now(),
              source: 'vector',
            },
            {
              type: 'item',
              content: 'Hybrid result',
              score: 0.8,
              finalScore: 0.75,
              timestamp: Date.now(),
              source: 'hybrid',
            },
            {
              type: 'node',
              content: 'Graph result',
              score: 0.7,
              finalScore: 0.65,
              timestamp: Date.now(),
              source: 'graph',
            },
          ],
          context: '# Memory Search Results\n\n- Vector result\n- Hybrid result\n- Graph result',
          executionTime: 150,
        };

        mockAction.mockResolvedValue(mockResults);

        const result = await handlers.handleMemorySearch({
          query: 'test query',
          hybridOnly: true,
        });

        expect(result.isError).toBeFalsy();
        const text = getResultText(result);
        expect(text).toContain('Hybrid result');
        expect(text).not.toContain('Vector result');
        expect(text).not.toContain('Graph result');
      });

      it('returns all results when hybridOnly is false', async () => {
        const mockResults = {
          query: 'test query',
          results: [
            {
              type: 'item',
              content: 'Vector result',
              score: 0.9,
              finalScore: 0.85,
              timestamp: Date.now(),
              source: 'vector',
            },
            {
              type: 'item',
              content: 'Hybrid result',
              score: 0.8,
              finalScore: 0.75,
              timestamp: Date.now(),
              source: 'hybrid',
            },
          ],
          context: '# Memory Search Results\n\n- Vector result\n- Hybrid result',
          executionTime: 150,
        };

        mockAction.mockResolvedValue(mockResults);

        const result = await handlers.handleMemorySearch({
          query: 'test query',
          hybridOnly: false,
        });

        expect(result.isError).toBeFalsy();
        // Should contain both results when hybridOnly is false
        const text = getResultText(result);
        expect(text).toContain('Vector result');
        expect(text).toContain('Hybrid result');
      });

      it('filters to hybrid-only when hybridOnly is not provided (default: true)', async () => {
        const mockResults = {
          query: 'test query',
          results: [
            {
              type: 'item',
              content: 'Vector result',
              score: 0.9,
              finalScore: 0.85,
              timestamp: Date.now(),
              source: 'vector',
            },
            {
              type: 'item',
              content: 'Hybrid result',
              score: 0.8,
              finalScore: 0.75,
              timestamp: Date.now(),
              source: 'hybrid',
            },
          ],
          context: '# Memory Search Results\n\n- Vector result\n- Hybrid result',
          executionTime: 150,
        };

        mockAction.mockResolvedValue(mockResults);

        const result = await handlers.handleMemorySearch({
          query: 'test query',
        });

        expect(result.isError).toBeFalsy();
        // Should only contain hybrid results by default (hybridOnly: true)
        const text = getResultText(result);
        expect(text).toContain('Hybrid result');
        expect(text).not.toContain('Vector result');
      });

      it('returns empty message when hybridOnly is true and no hybrid results exist', async () => {
        const mockResults = {
          query: 'test query',
          results: [
            {
              type: 'item',
              content: 'Vector result',
              score: 0.9,
              finalScore: 0.85,
              timestamp: Date.now(),
              source: 'vector',
            },
            {
              type: 'node',
              content: 'Graph result',
              score: 0.7,
              finalScore: 0.65,
              timestamp: Date.now(),
              source: 'graph',
            },
          ],
          context: '# Memory Search Results\n\n- Vector result\n- Graph result',
          executionTime: 150,
        };

        mockAction.mockResolvedValue(mockResults);

        const result = await handlers.handleMemorySearch({
          query: 'test query',
          hybridOnly: true,
        });

        expect(result.isError).toBeFalsy();
        expect(getResultText(result)).toBe('No relevant memories found.');
      });

      it('preserves multiple hybrid results when hybridOnly is true', async () => {
        const mockResults = {
          query: 'test query',
          results: [
            {
              type: 'item',
              content: 'Hybrid result 1',
              score: 0.9,
              finalScore: 0.85,
              timestamp: Date.now(),
              source: 'hybrid',
            },
            {
              type: 'item',
              content: 'Vector result',
              score: 0.8,
              finalScore: 0.75,
              timestamp: Date.now(),
              source: 'vector',
            },
            {
              type: 'node',
              content: 'Hybrid result 2',
              score: 0.7,
              finalScore: 0.65,
              timestamp: Date.now(),
              source: 'hybrid',
            },
          ],
          context: '# Memory Search Results\n\n- Hybrid result 1\n- Vector result\n- Hybrid result 2',
          executionTime: 150,
        };

        mockAction.mockResolvedValue(mockResults);

        const result = await handlers.handleMemorySearch({
          query: 'test query',
          hybridOnly: true,
        });

        expect(result.isError).toBeFalsy();
        const text = getResultText(result);
        expect(text).toContain('Hybrid result 1');
        expect(text).toContain('Hybrid result 2');
        expect(text).not.toContain('Vector result');
      });
    });
  });
});
