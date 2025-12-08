import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  fitMedia,
  needsUpscaling,
  needsDownscaling,
  getAspectRatio,
  aspectRatiosEqual,
  type MediaDimensions,
  type FitMode,
} from './mediaFitting';

describe('mediaFitting', () => {
  describe('fitMedia - contain mode', () => {
    // Feature: video-resolution-audio-controls, Property 5: Contain fit mode preserves aspect ratio
    it('should preserve media aspect ratio in contain mode', () => {
      fc.assert(
        fc.property(
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          (media, canvas) => {
            const result = fitMedia(media, canvas, 'contain');

            // Verify aspect ratio is preserved
            const mediaAspect = media.width / media.height;
            const resultAspect = result.width / result.height;
            expect(Math.abs(mediaAspect - resultAspect)).toBeLessThan(0.01);

            // Verify entire media fits within canvas
            expect(result.width).toBeLessThanOrEqual(canvas.width + 0.01);
            expect(result.height).toBeLessThanOrEqual(canvas.height + 0.01);

            // Verify at least one dimension matches canvas
            const widthMatches = Math.abs(result.width - canvas.width) < 0.01;
            const heightMatches = Math.abs(result.height - canvas.height) < 0.01;
            expect(widthMatches || heightMatches).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should center media when letterboxing/pillarboxing', () => {
      fc.assert(
        fc.property(
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          (media, canvas) => {
            const result = fitMedia(media, canvas, 'contain');

            // Verify media is centered
            if (result.width < canvas.width) {
              // Pillarbox - centered horizontally
              const leftMargin = result.x;
              const rightMargin = canvas.width - (result.x + result.width);
              expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(0.01);
            }

            if (result.height < canvas.height) {
              // Letterbox - centered vertically
              const topMargin = result.y;
              const bottomMargin = canvas.height - (result.y + result.height);
              expect(Math.abs(topMargin - bottomMargin)).toBeLessThan(0.01);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('fitMedia - cover mode', () => {
    // Feature: video-resolution-audio-controls, Property 7: Cover fit mode fills canvas
    it('should fill canvas completely in cover mode', () => {
      fc.assert(
        fc.property(
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          (media, canvas) => {
            const result = fitMedia(media, canvas, 'cover');

            // Verify canvas is completely filled
            // At least one dimension should match exactly
            const widthMatches = Math.abs(result.width - canvas.width) < 0.01;
            const heightMatches = Math.abs(result.height - canvas.height) < 0.01;
            expect(widthMatches || heightMatches).toBe(true);

            // The other dimension should be at least as large as canvas
            expect(result.width).toBeGreaterThanOrEqual(canvas.width - 0.01);
            expect(result.height).toBeGreaterThanOrEqual(canvas.height - 0.01);

            // Verify aspect ratio is preserved
            const mediaAspect = media.width / media.height;
            const resultAspect = result.width / result.height;
            expect(Math.abs(mediaAspect - resultAspect)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('fitMedia - fill mode', () => {
    // Feature: video-resolution-audio-controls, Property 8: Fill fit mode matches canvas exactly
    it('should match canvas dimensions exactly in fill mode', () => {
      fc.assert(
        fc.property(
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          fc.record({
            width: fc.integer({ min: 100, max: 4000 }),
            height: fc.integer({ min: 100, max: 4000 }),
          }),
          (media, canvas) => {
            const result = fitMedia(media, canvas, 'fill');

            // Verify dimensions match canvas exactly
            expect(result.width).toBe(canvas.width);
            expect(result.height).toBe(canvas.height);

            // Verify position is at origin
            expect(result.x).toBe(0);
            expect(result.y).toBe(0);

            // Verify scale is 1 (no scaling in fill mode)
            expect(result.scale).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('specific fit mode examples', () => {
    it('should handle 16:9 media in 16:9 canvas (contain)', () => {
      const media = { width: 1920, height: 1080 };
      const canvas = { width: 1280, height: 720 };
      const result = fitMedia(media, canvas, 'contain');

      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle 4:3 media in 16:9 canvas (contain)', () => {
      const media = { width: 1600, height: 1200 };
      const canvas = { width: 1280, height: 720 };
      const result = fitMedia(media, canvas, 'contain');

      // Should fit to height, add pillarbox
      expect(result.height).toBe(720);
      expect(result.width).toBe(960);
      expect(result.y).toBe(0);
      expect(result.x).toBeCloseTo(160, 0);
    });

    it('should handle 9:16 media in 16:9 canvas (contain)', () => {
      const media = { width: 1080, height: 1920 };
      const canvas = { width: 1280, height: 720 };
      const result = fitMedia(media, canvas, 'contain');

      // Should fit to width, add letterbox
      expect(result.width).toBeCloseTo(405, 0);
      expect(result.height).toBe(720);
      expect(result.x).toBeCloseTo(437.5, 0);
      expect(result.y).toBe(0);
    });

    it('should handle 16:9 media in 16:9 canvas (cover)', () => {
      const media = { width: 1920, height: 1080 };
      const canvas = { width: 1280, height: 720 };
      const result = fitMedia(media, canvas, 'cover');

      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle 4:3 media in 16:9 canvas (cover)', () => {
      const media = { width: 1600, height: 1200 };
      const canvas = { width: 1280, height: 720 };
      const result = fitMedia(media, canvas, 'cover');

      // Should fit to width, crop height
      expect(result.width).toBe(1280);
      expect(result.height).toBe(960);
      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(-120, 0);
    });

    it('should handle any media in any canvas (fill)', () => {
      const media = { width: 1920, height: 1080 };
      const canvas = { width: 1280, height: 720 };
      const result = fitMedia(media, canvas, 'fill');

      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('needsUpscaling', () => {
    it('should return true when media is smaller than canvas', () => {
      expect(needsUpscaling({ width: 640, height: 480 }, { width: 1280, height: 720 })).toBe(true);
    });

    it('should return false when media is larger than canvas', () => {
      expect(needsUpscaling({ width: 1920, height: 1080 }, { width: 1280, height: 720 })).toBe(
        false
      );
    });

    it('should return true when one dimension is smaller', () => {
      expect(needsUpscaling({ width: 1920, height: 480 }, { width: 1280, height: 720 })).toBe(
        true
      );
    });
  });

  describe('needsDownscaling', () => {
    it('should return true when media is larger than canvas', () => {
      expect(needsDownscaling({ width: 1920, height: 1080 }, { width: 1280, height: 720 })).toBe(
        true
      );
    });

    it('should return false when media is smaller than canvas', () => {
      expect(needsDownscaling({ width: 640, height: 480 }, { width: 1280, height: 720 })).toBe(
        false
      );
    });

    it('should return true when one dimension is larger', () => {
      expect(needsDownscaling({ width: 1920, height: 480 }, { width: 1280, height: 720 })).toBe(
        true
      );
    });
  });

  describe('getAspectRatio', () => {
    it('should calculate aspect ratio correctly', () => {
      expect(getAspectRatio({ width: 1920, height: 1080 })).toBeCloseTo(16 / 9, 2);
      expect(getAspectRatio({ width: 1280, height: 720 })).toBeCloseTo(16 / 9, 2);
      expect(getAspectRatio({ width: 1080, height: 1920 })).toBeCloseTo(9 / 16, 2);
    });
  });

  describe('aspectRatiosEqual', () => {
    it('should return true for equal aspect ratios', () => {
      expect(aspectRatiosEqual(16 / 9, 16 / 9)).toBe(true);
      expect(aspectRatiosEqual(1.777, 1.778, 0.01)).toBe(true);
    });

    it('should return false for different aspect ratios', () => {
      expect(aspectRatiosEqual(16 / 9, 4 / 3)).toBe(false);
      expect(aspectRatiosEqual(1.777, 1.9, 0.01)).toBe(false);
    });
  });
});
