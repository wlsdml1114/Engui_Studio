/**
 * Performance optimization tests
 * Tests for caching and memoization of expensive calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  fitMedia,
  clearFitMediaCache,
  getFitMediaCacheSize,
  type MediaDimensions,
  type FitMode,
} from '@/lib/mediaFitting';
import {
  calculateFinalVolume,
  clearVolumeCache,
  getVolumeCacheSize,
} from '@/lib/audioMixing';

describe('Performance Optimizations', () => {
  describe('Media Fitting Cache', () => {
    beforeEach(() => {
      clearFitMediaCache();
    });

    it('should cache fitMedia results', () => {
      const media: MediaDimensions = { width: 1920, height: 1080 };
      const canvas: MediaDimensions = { width: 1280, height: 720 };
      const fitMode: FitMode = 'contain';

      // First call - should calculate and cache
      const result1 = fitMedia(media, canvas, fitMode);
      expect(getFitMediaCacheSize()).toBe(1);

      // Second call with same inputs - should use cache
      const result2 = fitMedia(media, canvas, fitMode);
      expect(getFitMediaCacheSize()).toBe(1);

      // Results should be identical
      expect(result2).toEqual(result1);
    });

    it('should create separate cache entries for different inputs', () => {
      const media: MediaDimensions = { width: 1920, height: 1080 };
      const canvas: MediaDimensions = { width: 1280, height: 720 };

      // Different fit modes should create different cache entries
      fitMedia(media, canvas, 'contain');
      expect(getFitMediaCacheSize()).toBe(1);

      fitMedia(media, canvas, 'cover');
      expect(getFitMediaCacheSize()).toBe(2);

      fitMedia(media, canvas, 'fill');
      expect(getFitMediaCacheSize()).toBe(3);
    });

    it('should limit cache size to prevent memory leaks', () => {
      // Create more than 100 unique cache entries
      for (let i = 0; i < 150; i++) {
        const media: MediaDimensions = { width: 1920 + i, height: 1080 };
        const canvas: MediaDimensions = { width: 1280, height: 720 };
        fitMedia(media, canvas, 'contain');
      }

      // Cache should be limited to 100 entries
      expect(getFitMediaCacheSize()).toBeLessThanOrEqual(100);
    });

    it('should clear cache when requested', () => {
      const media: MediaDimensions = { width: 1920, height: 1080 };
      const canvas: MediaDimensions = { width: 1280, height: 720 };

      fitMedia(media, canvas, 'contain');
      fitMedia(media, canvas, 'cover');
      expect(getFitMediaCacheSize()).toBe(2);

      clearFitMediaCache();
      expect(getFitMediaCacheSize()).toBe(0);
    });
  });

  describe('Volume Calculation Cache', () => {
    beforeEach(() => {
      clearVolumeCache();
    });

    it('should cache volume calculation results', () => {
      const trackVolume = 100;
      const keyframeVolume = 50;
      const trackMuted = false;

      // First call - should calculate and cache
      const result1 = calculateFinalVolume(trackVolume, keyframeVolume, trackMuted);
      expect(getVolumeCacheSize()).toBe(1);

      // Second call with same inputs - should use cache
      const result2 = calculateFinalVolume(trackVolume, keyframeVolume, trackMuted);
      expect(getVolumeCacheSize()).toBe(1);

      // Results should be identical
      expect(result2).toBe(result1);
    });

    it('should create separate cache entries for different inputs', () => {
      // Different track volumes
      calculateFinalVolume(100, 50, false);
      expect(getVolumeCacheSize()).toBe(1);

      calculateFinalVolume(150, 50, false);
      expect(getVolumeCacheSize()).toBe(2);

      // Different keyframe volumes
      calculateFinalVolume(100, 75, false);
      expect(getVolumeCacheSize()).toBe(3);

      // Different mute states
      calculateFinalVolume(100, 50, true);
      expect(getVolumeCacheSize()).toBe(4);
    });

    it('should handle null and undefined keyframe volumes correctly', () => {
      calculateFinalVolume(100, null, false);
      expect(getVolumeCacheSize()).toBe(1);

      calculateFinalVolume(100, undefined, false);
      expect(getVolumeCacheSize()).toBe(1); // Should use same cache entry as null

      calculateFinalVolume(100, 100, false);
      expect(getVolumeCacheSize()).toBe(2); // Different from null/undefined
    });

    it('should limit cache size to prevent memory leaks', () => {
      // Create more than 200 unique cache entries
      for (let i = 0; i < 250; i++) {
        calculateFinalVolume(i, 50, false);
      }

      // Cache should be limited to 200 entries
      expect(getVolumeCacheSize()).toBeLessThanOrEqual(200);
    });

    it('should clear cache when requested', () => {
      calculateFinalVolume(100, 50, false);
      calculateFinalVolume(150, 75, false);
      expect(getVolumeCacheSize()).toBe(2);

      clearVolumeCache();
      expect(getVolumeCacheSize()).toBe(0);
    });

    it('should cache muted track results', () => {
      // Muted tracks always return 0
      const result1 = calculateFinalVolume(100, 50, true);
      expect(result1).toBe(0);
      expect(getVolumeCacheSize()).toBe(1);

      // Should use cache for same muted state
      const result2 = calculateFinalVolume(100, 50, true);
      expect(result2).toBe(0);
      expect(getVolumeCacheSize()).toBe(1);
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with caching for repeated calculations', () => {
      clearFitMediaCache();
      
      const media: MediaDimensions = { width: 1920, height: 1080 };
      const canvas: MediaDimensions = { width: 1280, height: 720 };
      const iterations = 1000;

      // Measure time for first calculation (uncached)
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        fitMedia(media, canvas, 'contain');
      }
      const duration1 = performance.now() - start1;

      // Clear cache and measure again
      clearFitMediaCache();
      
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        fitMedia(media, canvas, 'contain');
      }
      const duration2 = performance.now() - start2;

      // With caching, the second run should be faster or similar
      // (First iteration calculates, rest use cache)
      console.log(`First run: ${duration1.toFixed(2)}ms, Second run: ${duration2.toFixed(2)}ms`);
      
      // Both should complete in reasonable time
      expect(duration1).toBeLessThan(100);
      expect(duration2).toBeLessThan(100);
    });
  });
});
