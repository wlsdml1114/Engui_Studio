/**
 * Property-Based Tests for Audio Detection Service
 * **Feature: video-audio-track-sync, Property 9: Audio detection before extraction**
 * **Validates: Requirements 4.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { hasAudioTrack } from './audioDetectionService';

describe('audioDetectionService', () => {
  describe('hasAudioTrack', () => {
    let mockVideo: any;
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
      // Save original createElement
      originalCreateElement = document.createElement.bind(document);

      // Create a mock video element with a proper src setter
      let internalSrc = '';
      mockVideo = {
        preload: '',
        muted: false,
        get src() {
          return internalSrc;
        },
        set src(value: string) {
          internalSrc = value;
        },
        audioTracks: [],
        currentTime: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        pause: vi.fn(),
        load: vi.fn(),
      };

      // Mock document.createElement to return our mock video
      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'video') {
          return mockVideo;
        }
        return originalCreateElement(tagName);
      }) as any;
    });

    afterEach(() => {
      // Restore original createElement
      document.createElement = originalCreateElement;
      vi.clearAllMocks();
    });

    /**
     * Property 9: Audio detection before extraction
     * For any video file being added to the timeline, the system should call
     * the audio detection function before attempting audio extraction.
     * 
     * This property test verifies that hasAudioTrack can be called with
     * arbitrary video URLs and returns a boolean result without throwing errors.
     */
    it('Property 9: should handle arbitrary video URLs without throwing errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl(), // Generate random valid URLs
          async (videoUrl) => {
            // Setup mock to trigger loadedmetadata event
            mockVideo.addEventListener = vi.fn((event: string, handler: any) => {
              if (event === 'loadedmetadata') {
                // Simulate metadata loaded with no audio
                setTimeout(() => handler(), 0);
              }
            });

            const result = await hasAudioTrack(videoUrl);
            
            // The function should return a boolean
            expect(typeof result).toBe('boolean');
            
            // The function should have attempted to create a video element
            expect(document.createElement).toHaveBeenCalledWith('video');
            
            // The video element should have been configured with proper settings
            expect(mockVideo.preload).toBe('metadata');
            expect(mockVideo.muted).toBe(true);
            
            // Verify load was called (indicating the detection process started)
            expect(mockVideo.load).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should return true when video has audio tracks', async () => {
      mockVideo.audioTracks = [{ id: 'audio1' }];
      mockVideo.addEventListener = vi.fn((event: string, handler: any) => {
        if (event === 'loadedmetadata') {
          setTimeout(() => handler(), 0);
        }
      });

      const result = await hasAudioTrack('test-video.mp4');
      expect(result).toBe(true);
    });

    it('should return true when mozHasAudio is true', async () => {
      mockVideo.mozHasAudio = true;
      mockVideo.addEventListener = vi.fn((event: string, handler: any) => {
        if (event === 'loadedmetadata') {
          setTimeout(() => handler(), 0);
        }
      });

      const result = await hasAudioTrack('test-video.mp4');
      expect(result).toBe(true);
    });

    it('should return true when webkitAudioDecodedByteCount > 0', async () => {
      mockVideo.webkitAudioDecodedByteCount = 1024;
      mockVideo.addEventListener = vi.fn((event: string, handler: any) => {
        if (event === 'loadedmetadata') {
          setTimeout(() => handler(), 0);
        }
      });

      const result = await hasAudioTrack('test-video.mp4');
      expect(result).toBe(true);
    });

    it('should return false when no audio detection methods indicate audio', async () => {
      mockVideo.addEventListener = vi.fn((event: string, handler: any) => {
        if (event === 'loadedmetadata') {
          setTimeout(() => handler(), 0);
        }
      });

      const result = await hasAudioTrack('test-video.mp4');
      expect(result).toBe(false);
    });

    it('should return false on video load error', async () => {
      mockVideo.addEventListener = vi.fn((event: string, handler: any) => {
        if (event === 'error') {
          setTimeout(() => handler(new Event('error')), 0);
        }
      });

      const result = await hasAudioTrack('invalid-video.mp4');
      expect(result).toBe(false);
    });

    it('should timeout after specified duration', async () => {
      // Don't trigger any events - let it timeout
      mockVideo.addEventListener = vi.fn();

      const startTime = Date.now();
      const result = await hasAudioTrack('slow-video.mp4', 100);
      const endTime = Date.now();

      expect(result).toBe(false);
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(200); // Allow some margin
    });

    it('should handle errors during detection gracefully', async () => {
      mockVideo.addEventListener = vi.fn((event: string, handler: any) => {
        if (event === 'loadedmetadata') {
          setTimeout(() => {
            // Simulate an error during detection
            mockVideo.audioTracks = null;
            handler();
          }, 0);
        }
      });

      const result = await hasAudioTrack('test-video.mp4');
      expect(result).toBe(false);
    });
  });
});
