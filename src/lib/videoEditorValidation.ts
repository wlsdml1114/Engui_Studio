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

/**
 * Resolution and Audio Control Validation
 */

export type AspectRatio = '16:9' | '9:16';
export type QualityPreset = '480p' | '720p' | '1080p';
export type FitMode = 'contain' | 'cover' | 'fill';

/**
 * Validates aspect ratio value
 */
export function validateAspectRatio(value: unknown): MediaValidationResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: 'Aspect ratio must be a string',
    };
  }

  const validRatios: AspectRatio[] = ['16:9', '9:16'];
  if (!validRatios.includes(value as AspectRatio)) {
    return {
      valid: false,
      error: `Invalid aspect ratio: ${value}. Must be one of: ${validRatios.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates quality preset value
 */
export function validateQualityPreset(value: unknown): MediaValidationResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: 'Quality preset must be a string',
    };
  }

  const validPresets: QualityPreset[] = ['480p', '720p', '1080p'];
  if (!validPresets.includes(value as QualityPreset)) {
    return {
      valid: false,
      error: `Invalid quality preset: ${value}. Must be one of: ${validPresets.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates resolution configuration
 */
export function validateResolutionConfig(config: {
  aspectRatio?: unknown;
  qualityPreset?: unknown;
  width?: unknown;
  height?: unknown;
}): MediaValidationResult {
  // Validate aspect ratio
  if (config.aspectRatio !== undefined) {
    const aspectRatioValidation = validateAspectRatio(config.aspectRatio);
    if (!aspectRatioValidation.valid) {
      return aspectRatioValidation;
    }
  }

  // Validate quality preset
  if (config.qualityPreset !== undefined) {
    const qualityPresetValidation = validateQualityPreset(config.qualityPreset);
    if (!qualityPresetValidation.valid) {
      return qualityPresetValidation;
    }
  }

  // Validate width
  if (config.width !== undefined) {
    if (typeof config.width !== 'number' || config.width <= 0) {
      return {
        valid: false,
        error: 'Width must be a positive number',
      };
    }
  }

  // Validate height
  if (config.height !== undefined) {
    if (typeof config.height !== 'number' || config.height <= 0) {
      return {
        valid: false,
        error: 'Height must be a positive number',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates volume value (0-200 range)
 */
export function validateVolume(value: unknown): MediaValidationResult {
  if (typeof value !== 'number') {
    return {
      valid: false,
      error: 'Volume must be a number',
    };
  }

  if (value < 0 || value > 200) {
    return {
      valid: false,
      error: 'Volume must be between 0 and 200',
    };
  }

  return { valid: true };
}

/**
 * Validates fit mode value
 */
export function validateFitMode(value: unknown): MediaValidationResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: 'Fit mode must be a string',
    };
  }

  const validModes: FitMode[] = ['contain', 'cover', 'fill'];
  if (!validModes.includes(value as FitMode)) {
    return {
      valid: false,
      error: `Invalid fit mode: ${value}. Must be one of: ${validModes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validates media dimensions
 */
export function validateMediaDimensions(dimensions: {
  width?: unknown;
  height?: unknown;
}): MediaValidationResult {
  if (dimensions.width !== undefined) {
    if (typeof dimensions.width !== 'number' || dimensions.width <= 0) {
      return {
        valid: false,
        error: 'Media width must be a positive number',
      };
    }
  }

  if (dimensions.height !== undefined) {
    if (typeof dimensions.height !== 'number' || dimensions.height <= 0) {
      return {
        valid: false,
        error: 'Media height must be a positive number',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates track volume settings
 */
export function validateTrackVolumeSettings(settings: {
  volume?: unknown;
  muted?: unknown;
}): MediaValidationResult {
  // Validate volume
  if (settings.volume !== undefined) {
    const volumeValidation = validateVolume(settings.volume);
    if (!volumeValidation.valid) {
      return volumeValidation;
    }
  }

  // Validate muted
  if (settings.muted !== undefined) {
    if (typeof settings.muted !== 'boolean') {
      return {
        valid: false,
        error: 'Muted must be a boolean',
      };
    }
  }

  return { valid: true };
}

/**
 * Validates keyframe settings
 */
export function validateKeyframeSettings(settings: {
  fitMode?: unknown;
  volume?: unknown;
}): MediaValidationResult {
  // Validate fit mode
  if (settings.fitMode !== undefined && settings.fitMode !== null) {
    const fitModeValidation = validateFitMode(settings.fitMode);
    if (!fitModeValidation.valid) {
      return fitModeValidation;
    }
  }

  // Validate volume
  if (settings.volume !== undefined && settings.volume !== null) {
    const volumeValidation = validateVolume(settings.volume);
    if (!volumeValidation.valid) {
      return volumeValidation;
    }
  }

  return { valid: true };
}

/**
 * Clamps volume to valid range (0-200)
 */
export function clampVolume(volume: number): number {
  return Math.max(0, Math.min(200, volume));
}

/**
 * Validates project data for creation/update
 */
export function validateProjectData(project: {
  title?: unknown;
  description?: unknown;
  aspectRatio?: unknown;
  qualityPreset?: unknown;
  width?: unknown;
  height?: unknown;
  duration?: unknown;
}): MediaValidationResult {
  // Validate title
  if (project.title !== undefined) {
    if (typeof project.title !== 'string') {
      return {
        valid: false,
        error: 'Project title must be a string',
      };
    }
    if (project.title.length > 200) {
      return {
        valid: false,
        error: 'Project title must be 200 characters or less',
      };
    }
  }

  // Validate description
  if (project.description !== undefined) {
    if (typeof project.description !== 'string') {
      return {
        valid: false,
        error: 'Project description must be a string',
      };
    }
    if (project.description.length > 1000) {
      return {
        valid: false,
        error: 'Project description must be 1000 characters or less',
      };
    }
  }

  // Validate resolution config
  const resolutionValidation = validateResolutionConfig({
    aspectRatio: project.aspectRatio,
    qualityPreset: project.qualityPreset,
    width: project.width,
    height: project.height,
  });
  if (!resolutionValidation.valid) {
    return resolutionValidation;
  }

  // Validate duration
  if (project.duration !== undefined) {
    if (typeof project.duration !== 'number' || project.duration <= 0) {
      return {
        valid: false,
        error: 'Project duration must be a positive number',
      };
    }
  }

  return { valid: true };
}
