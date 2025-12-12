/**
 * Audio mixing utilities for video editor
 * Handles volume calculations for tracks and keyframes
 */

// Cache for memoized volume calculations
const volumeCache = new Map<string, number>();

/**
 * Generate cache key for volume calculation memoization
 */
function getVolumeCacheKey(
  trackVolume: number,
  keyframeVolume: number | null | undefined,
  trackMuted: boolean
): string {
  return `${trackVolume}_${keyframeVolume ?? 'null'}_${trackMuted}`;
}

/**
 * Calculate the final volume for an audio track/keyframe
 * 
 * @param trackVolume - The track volume (0-200)
 * @param keyframeVolume - The keyframe volume (0-200, null means use track volume)
 * @param trackMuted - Whether the track is muted
 * @returns The final volume percentage (0-200)
 * 
 * @example
 * ```ts
 * // Track at 100%, keyframe at 50%, not muted
 * const volume = calculateFinalVolume(100, 50, false);
 * // Returns: 50
 * 
 * // Track at 150%, no keyframe volume, not muted
 * const volume = calculateFinalVolume(150, null, false);
 * // Returns: 150
 * 
 * // Track at 100%, keyframe at 100%, muted
 * const volume = calculateFinalVolume(100, 100, true);
 * // Returns: 0
 * ```
 */
export function calculateFinalVolume(
  trackVolume: number,
  keyframeVolume: number | null | undefined,
  trackMuted: boolean
): number {
  // Check cache first
  const cacheKey = getVolumeCacheKey(trackVolume, keyframeVolume, trackMuted);
  const cached = volumeCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  let result: number;
  
  if (trackMuted) {
    result = 0;
  } else {
    const effectiveKeyframeVolume = keyframeVolume ?? 100;
    result = (trackVolume / 100) * (effectiveKeyframeVolume / 100) * 100;
  }
  
  // Cache the result
  volumeCache.set(cacheKey, result);
  
  // Limit cache size to prevent memory leaks (keep last 200 entries)
  if (volumeCache.size > 200) {
    const firstKey = volumeCache.keys().next().value;
    volumeCache.delete(firstKey);
  }
  
  return result;
}

/**
 * Convert volume percentage to gain multiplier
 * 
 * @param volumePercent - Volume percentage (0-200)
 * @returns Gain multiplier (0-2)
 * 
 * @example
 * ```ts
 * volumeToGain(0);   // Returns: 0
 * volumeToGain(100); // Returns: 1
 * volumeToGain(200); // Returns: 2
 * ```
 */
export function volumeToGain(volumePercent: number): number {
  return volumePercent / 100;
}

/**
 * Convert gain multiplier to volume percentage
 * 
 * @param gain - Gain multiplier (0-2)
 * @returns Volume percentage (0-200)
 * 
 * @example
 * ```ts
 * gainToVolume(0);   // Returns: 0
 * gainToVolume(1);   // Returns: 100
 * gainToVolume(2);   // Returns: 200
 * ```
 */
export function gainToVolume(gain: number): number {
  return gain * 100;
}

/**
 * Clamp volume to valid range (0-200)
 * 
 * @param volume - Volume to clamp
 * @returns Clamped volume (0-200)
 */
export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(200, volume));
}

/**
 * Validate if a volume value is within valid range
 * 
 * @param volume - Volume to validate
 * @returns True if volume is valid (0-200)
 */
export function isValidVolume(volume: number): boolean {
  return volume >= 0 && volume <= 200;
}

/**
 * Calculate the effective volume for a keyframe
 * If keyframe has custom volume, use it; otherwise use track volume
 * 
 * @param trackVolume - The track volume (0-200)
 * @param keyframeVolume - The keyframe volume (0-200, null means use track volume)
 * @returns The effective volume for the keyframe
 */
export function getEffectiveKeyframeVolume(
  trackVolume: number,
  keyframeVolume: number | null | undefined
): number {
  return keyframeVolume ?? trackVolume;
}

/**
 * Clear the volume calculation cache
 * Useful when memory needs to be freed or when testing
 */
export function clearVolumeCache(): void {
  volumeCache.clear();
}

/**
 * Get the current size of the volume cache
 * Useful for monitoring and testing
 */
export function getVolumeCacheSize(): number {
  return volumeCache.size;
}
