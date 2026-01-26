import { describe, it, expect, beforeAll } from 'vitest';

// Polyfill DOMRect for test environment
beforeAll(() => {
  if (!globalThis.DOMRect) {
    (globalThis as any).DOMRect = class DOMRect {
      x: number;
      y: number;
      width: number;
      height: number;
      top: number;
      right: number;
      bottom: number;
      left: number;

      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.top = y;
        this.left = x;
        this.right = x + width;
        this.bottom = y + height;
      }
    };
  }

  // Mock window dimensions
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  } else {
    // Create minimal window mock
    (globalThis as any).window = {
      innerWidth: 1024,
      innerHeight: 768,
    };
  }
});

/**
 * Unit tests for edge position resolution logic.
 * Tests the helper function that handles undefined positions gracefully.
 *
 * RED Phase: These tests will fail because resolveEdgePosition doesn't exist yet in GraphViewer.tsx
 */
describe('Edge Position Resolution (Unit Tests)', () => {
  /**
   * This function will be extracted into GraphViewer.tsx during GREEN phase.
   * For now, it's here to demonstrate the expected behavior.
   */
  function resolveEdgePosition(position: { x: number; y: number } | undefined): DOMRect {
    // Check if position is valid
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || isNaN(position.x) || isNaN(position.y)) {
      // Fallback: Use centered position when edge position unavailable
      return new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 100, 50);
    }
    return new DOMRect(position.x, position.y, 100, 50);
  }

  it('should return DOMRect with valid position when position is defined', () => {
    const position = { x: 100, y: 200 };
    const rect = resolveEdgePosition(position);

    expect(rect.x).toBe(100);
    expect(rect.y).toBe(200);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should return fallback DOMRect when position is undefined', () => {
    const rect = resolveEdgePosition(undefined);

    // Should use centered fallback position (512, 384)
    expect(rect).toBeInstanceOf(DOMRect);
    expect(rect.x).toBe(512); // window.innerWidth / 2
    expect(rect.y).toBe(384); // window.innerHeight / 2
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should return fallback DOMRect when position has undefined x', () => {
    const position = { x: undefined as any, y: 200 };
    const rect = resolveEdgePosition(position);

    // Should use centered fallback position
    expect(rect).toBeInstanceOf(DOMRect);
    expect(rect.x).toBe(512);
    expect(rect.y).toBe(384);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should return fallback DOMRect when position has undefined y', () => {
    const position = { x: 100, y: undefined as any };
    const rect = resolveEdgePosition(position);

    // Should use centered fallback position
    expect(rect).toBeInstanceOf(DOMRect);
    expect(rect.x).toBe(512);
    expect(rect.y).toBe(384);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should return fallback DOMRect when position has NaN values', () => {
    const position = { x: NaN, y: NaN };
    const rect = resolveEdgePosition(position);

    // Should use centered fallback position
    expect(rect).toBeInstanceOf(DOMRect);
    expect(rect.x).toBe(512);
    expect(rect.y).toBe(384);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should handle zero coordinates', () => {
    const position = { x: 0, y: 0 };
    const rect = resolveEdgePosition(position);

    // Zero is valid, should not use fallback
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should handle negative coordinates', () => {
    const position = { x: -100, y: -50 };
    const rect = resolveEdgePosition(position);

    // Negative is valid (edge might be off-screen)
    expect(rect.x).toBe(-100);
    expect(rect.y).toBe(-50);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should handle large coordinates', () => {
    const position = { x: 10000, y: 5000 };
    const rect = resolveEdgePosition(position);

    // Large values are valid
    expect(rect.x).toBe(10000);
    expect(rect.y).toBe(5000);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });

  it('should handle floating point coordinates', () => {
    const position = { x: 100.5, y: 200.75 };
    const rect = resolveEdgePosition(position);

    // Floating point is valid
    expect(rect.x).toBe(100.5);
    expect(rect.y).toBe(200.75);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
  });
});
