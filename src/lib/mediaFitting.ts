/**
 * Media fitting utilities for video editor
 * Handles scaling and positioning of media to fit canvas dimensions
 */

export type FitMode = 'contain' | 'cover' | 'fill';

// Cache for memoized fitMedia results
const fitMediaCache = new Map<string, FitResult>();

/**
 * Generate cache key for fitMedia memoization
 */
function getFitMediaCacheKey(
  media: MediaDimensions,
  canvas: MediaDimensions,
  fitMode: FitMode
): string {
  return `${media.width}x${media.height}_${canvas.width}x${canvas.height}_${fitMode}`;
}

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface FitResult {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
}

/**
 * Fit media to canvas using the specified fit mode
 * 
 * @param media - The media dimensions (original size)
 * @param canvas - The canvas dimensions (target size)
 * @param fitMode - The fit mode ('contain', 'cover', or 'fill')
 * @returns Fit result with dimensions, position, and scale
 * @throws Error if media or canvas dimensions are invalid
 * 
 * @example
 * ```ts
 * // Contain mode - fit entire media with letterbox/pillarbox
 * const result = fitMedia(
 *   { width: 1920, height: 1080 },
 *   { width: 1280, height: 720 },
 *   'contain'
 * );
 * 
 * // Cover mode - fill canvas, crop if needed
 * const result = fitMedia(
 *   { width: 1920, height: 1080 },
 *   { width: 1280, height: 720 },
 *   'cover'
 * );
 * 
 * // Fill mode - stretch to fill canvas
 * const result = fitMedia(
 *   { width: 1920, height: 1080 },
 *   { width: 1280, height: 720 },
 *   'fill'
 * );
 * ```
 */
export function fitMedia(
  media: MediaDimensions,
  canvas: MediaDimensions,
  fitMode: FitMode
): FitResult {
  // Validate media dimensions
  if (!media || typeof media.width !== 'number' || typeof media.height !== 'number') {
    throw new Error('Invalid media dimensions: width and height must be numbers');
  }
  
  if (media.width <= 0 || media.height <= 0) {
    throw new Error('Invalid media dimensions: width and height must be positive');
  }
  
  // Validate canvas dimensions
  if (!canvas || typeof canvas.width !== 'number' || typeof canvas.height !== 'number') {
    throw new Error('Invalid canvas dimensions: width and height must be numbers');
  }
  
  if (canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('Invalid canvas dimensions: width and height must be positive');
  }
  
  // Check cache first
  const cacheKey = getFitMediaCacheKey(media, canvas, fitMode);
  const cached = fitMediaCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const mediaAspect = media.width / media.height;
  const canvasAspect = canvas.width / canvas.height;

  let width: number;
  let height: number;
  let x: number;
  let y: number;
  let scale: number;

  switch (fitMode) {
    case 'contain': {
      // Fit entire media, add letterbox/pillarbox if needed
      if (mediaAspect > canvasAspect) {
        // Media is wider, fit to width
        width = canvas.width;
        height = canvas.width / mediaAspect;
        x = 0;
        y = (canvas.height - height) / 2;
        scale = canvas.width / media.width;
      } else {
        // Media is taller, fit to height
        width = canvas.height * mediaAspect;
        height = canvas.height;
        x = (canvas.width - width) / 2;
        y = 0;
        scale = canvas.height / media.height;
      }
      break;
    }

    case 'cover': {
      // Fill canvas, crop if needed
      if (mediaAspect > canvasAspect) {
        // Media is wider, fit to height and crop width
        width = canvas.height * mediaAspect;
        height = canvas.height;
        x = (canvas.width - width) / 2;
        y = 0;
        scale = canvas.height / media.height;
      } else {
        // Media is taller, fit to width and crop height
        width = canvas.width;
        height = canvas.width / mediaAspect;
        x = 0;
        y = (canvas.height - height) / 2;
        scale = canvas.width / media.width;
      }
      break;
    }

    case 'fill': {
      // Stretch to fill canvas
      width = canvas.width;
      height = canvas.height;
      x = 0;
      y = 0;
      scale = 1;
      break;
    }
  }

  const result = { width, height, x, y, scale };
  
  // Cache the result
  fitMediaCache.set(cacheKey, result);
  
  // Limit cache size to prevent memory leaks (keep last 100 entries)
  if (fitMediaCache.size > 100) {
    const firstKey = fitMediaCache.keys().next().value;
    fitMediaCache.delete(firstKey);
  }
  
  return result;
}

/**
 * Check if media needs upscaling to fit canvas
 */
export function needsUpscaling(
  media: MediaDimensions,
  canvas: MediaDimensions
): boolean {
  return media.width < canvas.width || media.height < canvas.height;
}

/**
 * Check if media needs downscaling to fit canvas
 */
export function needsDownscaling(
  media: MediaDimensions,
  canvas: MediaDimensions
): boolean {
  return media.width > canvas.width || media.height > canvas.height;
}

/**
 * Get the aspect ratio of media dimensions
 */
export function getAspectRatio(dimensions: MediaDimensions): number {
  return dimensions.width / dimensions.height;
}

/**
 * Check if two aspect ratios are approximately equal
 */
export function aspectRatiosEqual(
  ratio1: number,
  ratio2: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(ratio1 - ratio2) < tolerance;
}

/**
 * Clear the fitMedia cache
 * Useful when memory needs to be freed or when testing
 */
export function clearFitMediaCache(): void {
  fitMediaCache.clear();
}

/**
 * Get the current size of the fitMedia cache
 * Useful for monitoring and testing
 */
export function getFitMediaCacheSize(): number {
  return fitMediaCache.size;
}

/**
 * Safely fit media with fallback to default behavior
 * Returns a default fit result if media dimensions are unavailable
 * 
 * @param media - The media dimensions (may be invalid)
 * @param canvas - The canvas dimensions
 * @param fitMode - The fit mode
 * @returns Fit result or default centered result
 */
export function safeFitMedia(
  media: MediaDimensions | null | undefined,
  canvas: MediaDimensions,
  fitMode: FitMode = 'contain'
): FitResult {
  // If media dimensions are unavailable, return default centered result
  if (!media || !media.width || !media.height || media.width <= 0 || media.height <= 0) {
    console.warn('Media dimensions unavailable, using default fit');
    return {
      width: canvas.width,
      height: canvas.height,
      x: 0,
      y: 0,
      scale: 1,
    };
  }
  
  try {
    return fitMedia(media, canvas, fitMode);
  } catch (error) {
    console.error('Error fitting media:', error);
    // Return default centered result as fallback
    return {
      width: canvas.width,
      height: canvas.height,
      x: 0,
      y: 0,
      scale: 1,
    };
  }
}
