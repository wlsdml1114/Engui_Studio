import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getResolutionConfig,
  isValidAspectRatio,
  isValidQualityPreset,
  getSupportedAspectRatios,
  getSupportedQualityPresets,
  type AspectRatio,
  type QualityPreset,
} from './resolutionConfig';

describe('resolutionConfig', () => {
  describe('getResolutionConfig', () => {
    // Feature: video-resolution-audio-controls, Property 1: Resolution calculation correctness
    it('should calculate correct resolution for all aspect ratios and quality presets', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<AspectRatio>('16:9', '9:16'),
          fc.constantFrom<QualityPreset>('480p', '720p', '1080p'),
          (aspectRatio, qualityPreset) => {
            const config = getResolutionConfig(aspectRatio, qualityPreset);

            // Verify aspect ratio is correct
            const expectedRatio = aspectRatio === '16:9' ? 16 / 9 : 9 / 16;
            const actualRatio = config.width / config.height;
            expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(0.01);

            // Verify quality preset matches (short side should match the preset)
            const shortSide = Math.min(config.width, config.height);
            const expectedShortSide = parseInt(qualityPreset);
            expect(Math.abs(shortSide - expectedShortSide)).toBeLessThan(10);

            // Verify returned values match input
            expect(config.aspectRatio).toBe(aspectRatio);
            expect(config.qualityPreset).toBe(qualityPreset);

            // Verify dimensions are positive integers
            expect(config.width).toBeGreaterThan(0);
            expect(config.height).toBeGreaterThan(0);
            expect(Number.isInteger(config.width)).toBe(true);
            expect(Number.isInteger(config.height)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent results for the same inputs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<AspectRatio>('16:9', '9:16'),
          fc.constantFrom<QualityPreset>('480p', '720p', '1080p'),
          (aspectRatio, qualityPreset) => {
            const config1 = getResolutionConfig(aspectRatio, qualityPreset);
            const config2 = getResolutionConfig(aspectRatio, qualityPreset);

            expect(config1).toEqual(config2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct dimensions for 16:9 480p', () => {
      const config = getResolutionConfig('16:9', '480p');
      expect(config.width).toBe(854);
      expect(config.height).toBe(480);
    });

    it('should return correct dimensions for 16:9 720p', () => {
      const config = getResolutionConfig('16:9', '720p');
      expect(config.width).toBe(1280);
      expect(config.height).toBe(720);
    });

    it('should return correct dimensions for 16:9 1080p', () => {
      const config = getResolutionConfig('16:9', '1080p');
      expect(config.width).toBe(1920);
      expect(config.height).toBe(1080);
    });

    it('should return correct dimensions for 9:16 480p', () => {
      const config = getResolutionConfig('9:16', '480p');
      expect(config.width).toBe(480);
      expect(config.height).toBe(854);
    });

    it('should return correct dimensions for 9:16 720p', () => {
      const config = getResolutionConfig('9:16', '720p');
      expect(config.width).toBe(720);
      expect(config.height).toBe(1280);
    });

    it('should return correct dimensions for 9:16 1080p', () => {
      const config = getResolutionConfig('9:16', '1080p');
      expect(config.width).toBe(1080);
      expect(config.height).toBe(1920);
    });
  });

  describe('isValidAspectRatio', () => {
    it('should return true for valid aspect ratios', () => {
      expect(isValidAspectRatio('16:9')).toBe(true);
      expect(isValidAspectRatio('9:16')).toBe(true);
    });

    it('should return false for invalid aspect ratios', () => {
      expect(isValidAspectRatio('4:3')).toBe(false);
      expect(isValidAspectRatio('1:1')).toBe(false);
      expect(isValidAspectRatio('invalid')).toBe(false);
      expect(isValidAspectRatio('')).toBe(false);
    });
  });

  describe('isValidQualityPreset', () => {
    it('should return true for valid quality presets', () => {
      expect(isValidQualityPreset('480p')).toBe(true);
      expect(isValidQualityPreset('720p')).toBe(true);
      expect(isValidQualityPreset('1080p')).toBe(true);
    });

    it('should return false for invalid quality presets', () => {
      expect(isValidQualityPreset('360p')).toBe(false);
      expect(isValidQualityPreset('4K')).toBe(false);
      expect(isValidQualityPreset('invalid')).toBe(false);
      expect(isValidQualityPreset('')).toBe(false);
    });
  });

  describe('getSupportedAspectRatios', () => {
    it('should return all supported aspect ratios', () => {
      const ratios = getSupportedAspectRatios();
      expect(ratios).toEqual(['16:9', '9:16']);
    });
  });

  describe('getSupportedQualityPresets', () => {
    it('should return all supported quality presets', () => {
      const presets = getSupportedQualityPresets();
      expect(presets).toEqual(['480p', '720p', '1080p']);
    });
  });
});
