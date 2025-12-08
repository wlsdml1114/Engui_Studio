import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateFinalVolume,
  volumeToGain,
  gainToVolume,
  clampVolume,
  isValidVolume,
  getEffectiveKeyframeVolume,
} from './audioMixing';

describe('audioMixing', () => {
  describe('calculateFinalVolume', () => {
    // Feature: video-resolution-audio-controls, Property 14: Final volume calculation
    it('should calculate final volume correctly with track and keyframe volumes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }), // track volume
          fc.option(fc.integer({ min: 0, max: 200 })), // keyframe volume (nullable)
          fc.boolean(), // track muted
          (trackVolume, keyframeVolume, trackMuted) => {
            const finalVolume = calculateFinalVolume(trackVolume, keyframeVolume, trackMuted);

            if (trackMuted) {
              // Muted tracks should always produce 0 volume
              expect(finalVolume).toBe(0);
            } else {
              // Calculate expected volume
              const effectiveKeyframeVolume = keyframeVolume ?? 100;
              const expected = (trackVolume / 100) * (effectiveKeyframeVolume / 100) * 100;
              expect(Math.abs(finalVolume - expected)).toBeLessThan(0.01);

              // Verify volume is in valid range
              expect(finalVolume).toBeGreaterThanOrEqual(0);
              expect(finalVolume).toBeLessThanOrEqual(400); // Max is 200% * 200% = 400%
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use track volume when keyframe volume is null', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          (trackVolume) => {
            const finalVolume = calculateFinalVolume(trackVolume, null, false);
            expect(Math.abs(finalVolume - trackVolume)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use track volume when keyframe volume is undefined', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          (trackVolume) => {
            const finalVolume = calculateFinalVolume(trackVolume, undefined, false);
            expect(Math.abs(finalVolume - trackVolume)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: video-resolution-audio-controls, Property 12: Muted tracks produce zero volume
    it('should return 0 for muted tracks regardless of volume settings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          fc.option(fc.integer({ min: 0, max: 200 })),
          (trackVolume, keyframeVolume) => {
            const finalVolume = calculateFinalVolume(trackVolume, keyframeVolume, true);
            expect(finalVolume).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases correctly', () => {
      // 100% track, 100% keyframe, not muted = 100%
      expect(calculateFinalVolume(100, 100, false)).toBe(100);

      // 0% track, any keyframe, not muted = 0%
      expect(calculateFinalVolume(0, 100, false)).toBe(0);

      // Any track, 0% keyframe, not muted = 0%
      expect(calculateFinalVolume(100, 0, false)).toBe(0);

      // 200% track, 200% keyframe, not muted = 400%
      expect(calculateFinalVolume(200, 200, false)).toBe(400);

      // 50% track, 50% keyframe, not muted = 25%
      expect(calculateFinalVolume(50, 50, false)).toBe(25);

      // 150% track, no keyframe, not muted = 150%
      expect(calculateFinalVolume(150, null, false)).toBe(150);

      // Any volume, muted = 0%
      expect(calculateFinalVolume(100, 100, true)).toBe(0);
      expect(calculateFinalVolume(200, 200, true)).toBe(0);
    });
  });

  describe('volumeToGain', () => {
    it('should convert volume percentage to gain correctly', () => {
      expect(volumeToGain(0)).toBe(0);
      expect(volumeToGain(100)).toBe(1);
      expect(volumeToGain(200)).toBe(2);
      expect(volumeToGain(50)).toBe(0.5);
      expect(volumeToGain(150)).toBe(1.5);
    });

    it('should be consistent for all valid volumes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          (volume) => {
            const gain = volumeToGain(volume);
            expect(gain).toBe(volume / 100);
            expect(gain).toBeGreaterThanOrEqual(0);
            expect(gain).toBeLessThanOrEqual(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('gainToVolume', () => {
    it('should convert gain to volume percentage correctly', () => {
      expect(gainToVolume(0)).toBe(0);
      expect(gainToVolume(1)).toBe(100);
      expect(gainToVolume(2)).toBe(200);
      expect(gainToVolume(0.5)).toBe(50);
      expect(gainToVolume(1.5)).toBe(150);
    });

    it('should be inverse of volumeToGain', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          (volume) => {
            const gain = volumeToGain(volume);
            const backToVolume = gainToVolume(gain);
            expect(Math.abs(backToVolume - volume)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('clampVolume', () => {
    it('should clamp volume to 0-200 range', () => {
      expect(clampVolume(-10)).toBe(0);
      expect(clampVolume(0)).toBe(0);
      expect(clampVolume(100)).toBe(100);
      expect(clampVolume(200)).toBe(200);
      expect(clampVolume(250)).toBe(200);
      expect(clampVolume(1000)).toBe(200);
    });

    it('should clamp any number to valid range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }),
          (volume) => {
            const clamped = clampVolume(volume);
            expect(clamped).toBeGreaterThanOrEqual(0);
            expect(clamped).toBeLessThanOrEqual(200);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidVolume', () => {
    it('should return true for valid volumes', () => {
      expect(isValidVolume(0)).toBe(true);
      expect(isValidVolume(100)).toBe(true);
      expect(isValidVolume(200)).toBe(true);
      expect(isValidVolume(50)).toBe(true);
      expect(isValidVolume(150)).toBe(true);
    });

    it('should return false for invalid volumes', () => {
      expect(isValidVolume(-1)).toBe(false);
      expect(isValidVolume(201)).toBe(false);
      expect(isValidVolume(-100)).toBe(false);
      expect(isValidVolume(1000)).toBe(false);
    });

    it('should validate volume range correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }),
          (volume) => {
            const isValid = isValidVolume(volume);
            if (volume >= 0 && volume <= 200) {
              expect(isValid).toBe(true);
            } else {
              expect(isValid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getEffectiveKeyframeVolume', () => {
    it('should return keyframe volume when set', () => {
      expect(getEffectiveKeyframeVolume(100, 50)).toBe(50);
      expect(getEffectiveKeyframeVolume(150, 75)).toBe(75);
      expect(getEffectiveKeyframeVolume(200, 0)).toBe(0);
    });

    it('should return track volume when keyframe volume is null', () => {
      expect(getEffectiveKeyframeVolume(100, null)).toBe(100);
      expect(getEffectiveKeyframeVolume(150, null)).toBe(150);
      expect(getEffectiveKeyframeVolume(0, null)).toBe(0);
    });

    it('should return track volume when keyframe volume is undefined', () => {
      expect(getEffectiveKeyframeVolume(100, undefined)).toBe(100);
      expect(getEffectiveKeyframeVolume(150, undefined)).toBe(150);
      expect(getEffectiveKeyframeVolume(0, undefined)).toBe(0);
    });

    it('should handle all cases correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 200 }),
          fc.option(fc.integer({ min: 0, max: 200 })),
          (trackVolume, keyframeVolume) => {
            const effective = getEffectiveKeyframeVolume(trackVolume, keyframeVolume);
            if (keyframeVolume !== null && keyframeVolume !== undefined) {
              expect(effective).toBe(keyframeVolume);
            } else {
              expect(effective).toBe(trackVolume);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
