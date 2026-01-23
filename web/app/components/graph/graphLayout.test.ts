import { describe, it, expect } from 'vitest';
import { getCoseLayoutOptions, getLayoutForNodeCount } from './graphLayout';

describe('graphLayout', () => {
  describe('getCoseLayoutOptions', () => {
    it('returns layout with name "cose"', () => {
      const options = getCoseLayoutOptions();
      expect(options.name).toBe('cose');
    });

    it('has animate set to true by default', () => {
      const options = getCoseLayoutOptions();
      expect(options.animate).toBe(true);
    });

    it('has nodeRepulsion configured', () => {
      const options = getCoseLayoutOptions();
      expect(options.nodeRepulsion).toBeGreaterThan(0);
    });

    it('has idealEdgeLength configured', () => {
      const options = getCoseLayoutOptions();
      expect(options.idealEdgeLength).toBeGreaterThan(0);
    });

    it('has gravity configured', () => {
      const options = getCoseLayoutOptions();
      expect(options.gravity).toBeDefined();
      expect(typeof options.gravity).toBe('number');
    });

    it('has animationDuration configured', () => {
      const options = getCoseLayoutOptions();
      expect(options.animationDuration).toBeGreaterThan(0);
    });

    it('respects custom padding option', () => {
      const options = getCoseLayoutOptions({ padding: 100 });
      expect(options.padding).toBe(100);
    });

    it('respects custom animate option', () => {
      const options = getCoseLayoutOptions({ animate: false });
      expect(options.animate).toBe(false);
    });

    it('uses default padding when not specified', () => {
      const options = getCoseLayoutOptions();
      expect(options.padding).toBe(50);
    });

    it('has componentSpacing for disconnected components', () => {
      const options = getCoseLayoutOptions();
      expect(options.componentSpacing).toBeGreaterThan(0);
    });

    it('has randomize set to false for deterministic layout', () => {
      const options = getCoseLayoutOptions();
      expect(options.randomize).toBe(false);
    });
  });

  describe('getLayoutForNodeCount', () => {
    it('returns cose layout for any node count', () => {
      expect(getLayoutForNodeCount(10).name).toBe('cose');
      expect(getLayoutForNodeCount(50).name).toBe('cose');
      expect(getLayoutForNodeCount(100).name).toBe('cose');
    });

    it('uses default options for small graphs (< 50 nodes)', () => {
      const options = getLayoutForNodeCount(30);
      expect(options.nodeRepulsion).toBe(8000);
      expect(options.animate).toBe(true);
    });

    it('reduces nodeRepulsion for medium graphs (50-100 nodes)', () => {
      const smallOptions = getLayoutForNodeCount(30);
      const mediumOptions = getLayoutForNodeCount(75);
      expect(mediumOptions.nodeRepulsion).toBeLessThan(
        smallOptions.nodeRepulsion as number
      );
    });

    it('increases gravity for medium graphs', () => {
      const smallOptions = getLayoutForNodeCount(30);
      const mediumOptions = getLayoutForNodeCount(75);
      expect(mediumOptions.gravity).toBeGreaterThan(
        smallOptions.gravity as number
      );
    });

    it('reduces animation duration for medium graphs', () => {
      const smallOptions = getLayoutForNodeCount(30);
      const mediumOptions = getLayoutForNodeCount(75);
      expect(mediumOptions.animationDuration).toBeLessThan(
        smallOptions.animationDuration as number
      );
    });

    it('disables animation for large graphs (> 100 nodes)', () => {
      const largeOptions = getLayoutForNodeCount(150);
      expect(largeOptions.animate).toBe(false);
    });

    it('further reduces nodeRepulsion for large graphs', () => {
      const mediumOptions = getLayoutForNodeCount(75);
      const largeOptions = getLayoutForNodeCount(150);
      expect(largeOptions.nodeRepulsion).toBeLessThan(
        mediumOptions.nodeRepulsion as number
      );
    });

    it('respects custom config options', () => {
      const options = getLayoutForNodeCount(30, { padding: 100 });
      expect(options.padding).toBe(100);
    });

    it('handles zero nodes gracefully', () => {
      const options = getLayoutForNodeCount(0);
      expect(options.name).toBe('cose');
    });

    it('handles edge case of exactly 50 nodes', () => {
      const options = getLayoutForNodeCount(50);
      // At exactly 50, should use medium graph settings
      expect(options.nodeRepulsion).toBeLessThan(8000);
    });

    it('handles edge case of exactly 100 nodes', () => {
      const options = getLayoutForNodeCount(100);
      // At exactly 100, should use large graph settings
      expect(options.animate).toBe(false);
    });
  });
});
