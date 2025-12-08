/**
 * Resolution configuration utilities for video projects
 */

export type AspectRatio = '16:9' | '9:16';
export type QualityPreset = '480p' | '720p' | '1080p';

export interface ResolutionConfig {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  qualityPreset: QualityPreset;
}

/**
 * Resolution lookup table for all aspect ratio and quality preset combinations
 */
const RESOLUTION_TABLE: Record<
  AspectRatio,
  Record<QualityPreset, { width: number; height: number }>
> = {
  '16:9': {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
  },
  '9:16': {
    '480p': { width: 480, height: 854 },
    '720p': { width: 720, height: 1280 },
    '1080p': { width: 1080, height: 1920 },
  },
};

/**
 * Get resolution configuration for a given aspect ratio and quality preset
 * 
 * @param aspectRatio - The aspect ratio ('16:9' or '9:16')
 * @param qualityPreset - The quality preset ('480p', '720p', or '1080p')
 * @returns Resolution configuration with width, height, aspect ratio, and quality preset
 * 
 * @example
 * ```ts
 * const config = getResolutionConfig('16:9', '1080p');
 * // Returns: { width: 1920, height: 1080, aspectRatio: '16:9', qualityPreset: '1080p' }
 * ```
 */
export function getResolutionConfig(
  aspectRatio: AspectRatio,
  qualityPreset: QualityPreset
): ResolutionConfig {
  const dimensions = RESOLUTION_TABLE[aspectRatio][qualityPreset];
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio,
    qualityPreset,
  };
}

/**
 * Validate if a given aspect ratio is supported
 */
export function isValidAspectRatio(value: string): value is AspectRatio {
  return value === '16:9' || value === '9:16';
}

/**
 * Validate if a given quality preset is supported
 */
export function isValidQualityPreset(value: string): value is QualityPreset {
  return value === '480p' || value === '720p' || value === '1080p';
}

/**
 * Get all supported aspect ratios
 */
export function getSupportedAspectRatios(): AspectRatio[] {
  return ['16:9', '9:16'];
}

/**
 * Get all supported quality presets
 */
export function getSupportedQualityPresets(): QualityPreset[] {
  return ['480p', '720p', '1080p'];
}
