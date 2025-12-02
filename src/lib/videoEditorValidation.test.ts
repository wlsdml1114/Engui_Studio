import { describe, it, expect } from 'vitest';
import {
  validateMediaFormat,
  validateMediaUrl,
  validateKeyframeData,
  validatePlayerInit,
  getMediaType,
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_AUDIO_FORMATS,
} from './videoEditorValidation';

describe('videoEditorValidation', () => {
  describe('validateMediaFormat', () => {
    it('accepts valid video formats', () => {
      SUPPORTED_VIDEO_FORMATS.forEach((type) => {
        const result = validateMediaFormat({ type, name: 'test.mp4' });
        expect(result.valid).toBe(true);
      });
    });

    it('accepts valid image formats', () => {
      SUPPORTED_IMAGE_FORMATS.forEach((type) => {
        const result = validateMediaFormat({ type, name: 'test.jpg' });
        expect(result.valid).toBe(true);
      });
    });

    it('accepts valid audio formats', () => {
      SUPPORTED_AUDIO_FORMATS.forEach((type) => {
        const result = validateMediaFormat({ type, name: 'test.mp3' });
        expect(result.valid).toBe(true);
      });
    });

    it('rejects unsupported video format', () => {
      const result = validateMediaFormat({ type: 'video/avi', name: 'test.avi' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported video format');
    });

    it('rejects unsupported image format', () => {
      const result = validateMediaFormat({ type: 'image/bmp', name: 'test.bmp' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });

    it('rejects unsupported audio format', () => {
      const result = validateMediaFormat({ type: 'audio/flac', name: 'test.flac' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported audio format');
    });

    it('rejects media without type', () => {
      const result = validateMediaFormat({ type: '', name: 'test.file' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Media type is not specified');
    });

    it('rejects non-media types', () => {
      const result = validateMediaFormat({ type: 'application/pdf', name: 'test.pdf' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported media type');
    });
  });

  describe('validateMediaUrl', () => {
    it('accepts valid absolute URLs', () => {
      const result = validateMediaUrl('https://example.com/video.mp4');
      expect(result.valid).toBe(true);
    });

    it('accepts valid relative paths starting with /', () => {
      const result = validateMediaUrl('/videos/test.mp4');
      expect(result.valid).toBe(true);
    });

    it('accepts valid relative paths starting with ./', () => {
      const result = validateMediaUrl('./videos/test.mp4');
      expect(result.valid).toBe(true);
    });

    it('rejects empty URLs', () => {
      const result = validateMediaUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Media URL is required');
    });

    it('rejects whitespace-only URLs', () => {
      const result = validateMediaUrl('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Media URL is required');
    });

    it('rejects invalid URL formats', () => {
      const result = validateMediaUrl('not a valid url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid media URL format');
    });
  });

  describe('validateKeyframeData', () => {
    const validKeyframe = {
      trackId: 'track-123',
      timestamp: 1000,
      duration: 5000,
      data: {
        type: 'video' as const,
        mediaId: 'media-456',
        url: 'https://example.com/video.mp4',
        prompt: 'Test prompt',
      },
    };

    it('accepts valid keyframe data', () => {
      const result = validateKeyframeData(validKeyframe);
      expect(result.valid).toBe(true);
    });

    it('rejects keyframe without trackId', () => {
      const result = validateKeyframeData({ ...validKeyframe, trackId: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Track ID is required');
    });

    it('rejects keyframe with negative timestamp', () => {
      const result = validateKeyframeData({ ...validKeyframe, timestamp: -100 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Timestamp must be a non-negative number');
    });

    it('rejects keyframe with zero duration', () => {
      const result = validateKeyframeData({ ...validKeyframe, duration: 0 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Duration must be a positive number');
    });

    it('rejects keyframe with negative duration', () => {
      const result = validateKeyframeData({ ...validKeyframe, duration: -1000 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Duration must be a positive number');
    });

    it('rejects keyframe without data', () => {
      const result = validateKeyframeData({ ...validKeyframe, data: undefined as any });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Keyframe data is required');
    });

    it('rejects keyframe with invalid type', () => {
      const result = validateKeyframeData({
        ...validKeyframe,
        data: { ...validKeyframe.data, type: 'invalid' as any },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid media type');
    });

    it('rejects keyframe without mediaId', () => {
      const result = validateKeyframeData({
        ...validKeyframe,
        data: { ...validKeyframe.data, mediaId: '' },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Media ID is required');
    });

    it('rejects keyframe with invalid URL', () => {
      const result = validateKeyframeData({
        ...validKeyframe,
        data: { ...validKeyframe.data, url: '' },
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Media URL is required');
    });

    it('accepts all valid media types', () => {
      const types = ['image', 'video', 'music', 'voiceover'] as const;
      types.forEach((type) => {
        const result = validateKeyframeData({
          ...validKeyframe,
          data: { ...validKeyframe.data, type },
        });
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validatePlayerInit', () => {
    it('accepts valid project configuration', () => {
      const result = validatePlayerInit({
        duration: 30000,
        aspectRatio: '16:9',
      });
      expect(result.valid).toBe(true);
    });

    it('accepts all valid aspect ratios', () => {
      const aspectRatios = ['16:9', '9:16', '1:1'];
      aspectRatios.forEach((aspectRatio) => {
        const result = validatePlayerInit({
          duration: 30000,
          aspectRatio,
        });
        expect(result.valid).toBe(true);
      });
    });

    it('rejects project without duration', () => {
      const result = validatePlayerInit({
        duration: undefined as any,
        aspectRatio: '16:9',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid duration');
    });

    it('rejects project with zero duration', () => {
      const result = validatePlayerInit({
        duration: 0,
        aspectRatio: '16:9',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid duration');
    });

    it('rejects project with negative duration', () => {
      const result = validatePlayerInit({
        duration: -1000,
        aspectRatio: '16:9',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid duration');
    });

    it('rejects invalid aspect ratio', () => {
      const result = validatePlayerInit({
        duration: 30000,
        aspectRatio: '4:3',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid aspect ratio');
    });

    it('rejects null project', () => {
      const result = validatePlayerInit(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Project is required');
    });
  });

  describe('getMediaType', () => {
    it('returns video for video MIME types', () => {
      expect(getMediaType({ type: 'video/mp4', name: 'test.mp4' })).toBe('video');
      expect(getMediaType({ type: 'video/webm', name: 'test.webm' })).toBe('video');
    });

    it('returns image for image MIME types', () => {
      expect(getMediaType({ type: 'image/jpeg', name: 'test.jpg' })).toBe('image');
      expect(getMediaType({ type: 'image/png', name: 'test.png' })).toBe('image');
    });

    it('returns audio for audio MIME types', () => {
      expect(getMediaType({ type: 'audio/mpeg', name: 'test.mp3' })).toBe('audio');
      expect(getMediaType({ type: 'audio/wav', name: 'test.wav' })).toBe('audio');
    });

    it('returns unknown for unsupported types', () => {
      expect(getMediaType({ type: 'application/pdf', name: 'test.pdf' })).toBe('unknown');
      expect(getMediaType({ type: 'text/plain', name: 'test.txt' })).toBe('unknown');
    });
  });
});
