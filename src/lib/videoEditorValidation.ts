/**
 * Video Editor Validation Utilities
 * Provides validation functions for media formats, keyframe data, and player initialization
 */

// Supported media formats
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
];

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates if a media file has a supported format
 */
export function validateMediaFormat(
  file: File | { type: string; name: string }
): MediaValidationResult {
  const { type, name } = file;

  // Check if type is provided
  if (!type) {
    return {
      valid: false,
      error: 'Media type is not specified',
    };
  }

  // Determine media category
  const isVideo = type.startsWith('video/');
  const isImage = type.startsWith('image/');
  const isAudio = type.startsWith('audio/');

  if (!isVideo && !isImage && !isAudio) {
    return {
      valid: false,
      error: `Unsupported media type: ${type}`,
    };
  }

  // Check against supported formats
  if (isVideo && !SUPPORTED_VIDEO_FORMATS.includes(type)) {
    return {
      valid: false,
      error: `Unsupported video format: ${type}. Supported formats: ${SUPPORTED_VIDEO_FORMATS.join(', ')}`,
    };
  }

  if (isImage && !SUPPORTED_IMAGE_FORMATS.includes(type)) {
    return {
      valid: false,
      error: `Unsupported image format: ${type}. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
    };
  }

  if (isAudio && !SUPPORTED_AUDIO_FORMATS.includes(type)) {
    return {
      valid: false,
      error: `Unsupported audio format: ${type}. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates media URL
 */
export function validateMediaUrl(url: string): MediaValidationResult {
  if (!url || url.trim() === '') {
    return {
      valid: false,
      error: 'Media URL is required',
    };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    // Check if it's a relative path
    if (url.startsWith('/') || url.startsWith('./')) {
      return { valid: true };
    }
    return {
      valid: false,
      error: 'Invalid media URL format',
    };
  }
}

/**
 * Validates keyframe data
 */
export interface KeyframeData {
  trackId: string;
  timestamp: number;
  duration: number;
  data: {
    type: 'image' | 'video' | 'music' | 'voiceover';
    mediaId: string;
    url: string;
    prompt?: string;
  };
}

export function validateKeyframeData(
  keyframe: Partial<KeyframeData>
): MediaValidationResult {
  // Validate trackId
  if (!keyframe.trackId || keyframe.trackId.trim() === '') {
    return {
      valid: false,
      error: 'Track ID is required',
    };
  }

  // Validate timestamp
  if (typeof keyframe.timestamp !== 'number' || keyframe.timestamp < 0) {
    return {
      valid: false,
      error: 'Timestamp must be a non-negative number',
    };
  }

  // Validate duration
  if (typeof keyframe.duration !== 'number' || keyframe.duration <= 0) {
    return {
      valid: false,
      error: 'Duration must be a positive number',
    };
  }

  // Validate data object
  if (!keyframe.data) {
    return {
      valid: false,
      error: 'Keyframe data is required',
    };
  }

  const { data } = keyframe;

  // Validate type
  const validTypes = ['image', 'video', 'music', 'voiceover'];
  if (!data.type || !validTypes.includes(data.type)) {
    return {
      valid: false,
      error: `Invalid media type. Must be one of: ${validTypes.join(', ')}`,
    };
  }

  // Validate mediaId
  if (!data.mediaId || data.mediaId.trim() === '') {
    return {
      valid: false,
      error: 'Media ID is required',
    };
  }

  // Validate URL
  const urlValidation = validateMediaUrl(data.url);
  if (!urlValidation.valid) {
    return urlValidation;
  }

  return { valid: true };
}

/**
 * Validates player initialization requirements
 */
export interface PlayerInitValidation {
  hasProject: boolean;
  hasTracks: boolean;
  hasValidDuration: boolean;
  hasValidAspectRatio: boolean;
}

export function validatePlayerInit(project: {
  duration: number;
  aspectRatio: string;
}): MediaValidationResult {
  if (!project) {
    return {
      valid: false,
      error: 'Project is required for player initialization',
    };
  }

  if (typeof project.duration !== 'number' || project.duration <= 0) {
    return {
      valid: false,
      error: 'Project must have a valid duration',
    };
  }

  const validAspectRatios = ['16:9', '9:16', '1:1'];
  if (!validAspectRatios.includes(project.aspectRatio)) {
    return {
      valid: false,
      error: `Invalid aspect ratio. Must be one of: ${validAspectRatios.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Gets media type from file extension or MIME type
 */
export function getMediaType(
  file: File | { type: string; name: string }
): 'video' | 'image' | 'audio' | 'unknown' {
  const { type } = file;

  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';

  return 'unknown';
}
