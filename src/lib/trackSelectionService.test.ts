/**
 * Track Selection Service Tests
 * Tests for track selection logic including property-based tests
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { findAvailableAudioTrack } from './trackSelectionService';
import { VideoTrack, VideoKeyFrame } from './context/StudioContext';

describe('Track Selection Service', () => {
  describe('findAvailableAudioTrack', () => {
    it('should return null when no audio tracks exist', () => {
      const tracks: VideoTrack[] = [
        {
          id: 'track-1',
          projectId: 'project-1',
          type: 'video',
          label: 'Video Track',
          locked: false,
          order: 0,
        },
      ];
      const keyframes: Record<string, VideoKeyFrame[]> = {};

      const result = findAvailableAudioTrack(tracks, keyframes, 0, 1000);
      expect(result).toBeNull();
    });

    it('should return music track when available and empty', () => {
      const tracks: VideoTrack[] = [
        {
          id: 'music-1',
          projectId: 'project-1',
          type: 'music',
          label: 'Music Track',
          locked: false,
          order: 1,
        },
      ];
      const keyframes: Record<string, VideoKeyFrame[]> = {};

      const result = findAvailableAudioTrack(tracks, keyframes, 0, 1000);
      expect(result).toBe('music-1');
    });

    it('should prefer music track over voiceover track', () => {
      const tracks: VideoTrack[] = [
        {
          id: 'voiceover-1',
          projectId: 'project-1',
          type: 'voiceover',
          label: 'Voiceover Track',
          locked: false,
          order: 1,
        },
        {
          id: 'music-1',
          projectId: 'project-1',
          type: 'music',
          label: 'Music Track',
          locked: false,
          order: 2,
        },
      ];
      const keyframes: Record<string, VideoKeyFrame[]> = {};

      const result = findAvailableAudioTrack(tracks, keyframes, 0, 1000);
      expect(result).toBe('music-1');
    });

    it('should skip tracks with conflicting keyframes', () => {
      const tracks: VideoTrack[] = [
        {
          id: 'music-1',
          projectId: 'project-1',
          type: 'music',
          label: 'Music Track',
          locked: false,
          order: 1,
        },
        {
          id: 'voiceover-1',
          projectId: 'project-1',
          type: 'voiceover',
          label: 'Voiceover Track',
          locked: false,
          order: 2,
        },
      ];
      const keyframes: Record<string, VideoKeyFrame[]> = {
        'music-1': [
          {
            id: 'kf-1',
            trackId: 'music-1',
            timestamp: 500,
            duration: 1000,
            data: {
              type: 'music',
              mediaId: 'media-1',
              url: '/test.mp3',
            },
          },
        ],
      };

      // Try to add at timestamp 1000 with duration 1000 (overlaps with existing keyframe at 500-1500)
      const result = findAvailableAudioTrack(tracks, keyframes, 1000, 1000);
      expect(result).toBe('voiceover-1');
    });

    it('should return null when all tracks have conflicts', () => {
      const tracks: VideoTrack[] = [
        {
          id: 'music-1',
          projectId: 'project-1',
          type: 'music',
          label: 'Music Track',
          locked: false,
          order: 1,
        },
        {
          id: 'voiceover-1',
          projectId: 'project-1',
          type: 'voiceover',
          label: 'Voiceover Track',
          locked: false,
          order: 2,
        },
      ];
      const keyframes: Record<string, VideoKeyFrame[]> = {
        'music-1': [
          {
            id: 'kf-1',
            trackId: 'music-1',
            timestamp: 0,
            duration: 5000,
            data: {
              type: 'music',
              mediaId: 'media-1',
              url: '/test.mp3',
            },
          },
        ],
        'voiceover-1': [
          {
            id: 'kf-2',
            trackId: 'voiceover-1',
            timestamp: 0,
            duration: 5000,
            data: {
              type: 'voiceover',
              mediaId: 'media-2',
              url: '/test2.mp3',
            },
          },
        ],
      };

      const result = findAvailableAudioTrack(tracks, keyframes, 1000, 1000);
      expect(result).toBeNull();
    });

    /**
     * **Feature: video-audio-track-sync, Property 4: Audio track selection with conflicts**
     * **Validates: Requirements 1.5**
     * 
     * Property: For any video with audio being added at a timestamp where some audio tracks 
     * have conflicting keyframes, the system should select the first audio track (music or voiceover) 
     * that has no overlap at the target timestamp and duration.
     */
    it('property: selected track has no conflicts at target timestamp', () => {
      fc.assert(
        fc.property(
          // Generate random track configurations
          fc.record({
            numMusicTracks: fc.integer({ min: 0, max: 3 }),
            numVoiceoverTracks: fc.integer({ min: 0, max: 3 }),
            targetTimestamp: fc.integer({ min: 0, max: 10000 }),
            targetDuration: fc.integer({ min: 100, max: 5000 }),
            existingKeyframes: fc.array(
              fc.record({
                trackIndex: fc.integer({ min: 0, max: 5 }),
                timestamp: fc.integer({ min: 0, max: 10000 }),
                duration: fc.integer({ min: 100, max: 5000 }),
              }),
              { maxLength: 10 }
            ),
          }),
          (config) => {
            // Build tracks
            const tracks: VideoTrack[] = [];
            
            // Add music tracks
            for (let i = 0; i < config.numMusicTracks; i++) {
              tracks.push({
                id: `music-${i}`,
                projectId: 'project-1',
                type: 'music',
                label: `Music Track ${i}`,
                locked: false,
                order: i,
              });
            }
            
            // Add voiceover tracks
            for (let i = 0; i < config.numVoiceoverTracks; i++) {
              tracks.push({
                id: `voiceover-${i}`,
                projectId: 'project-1',
                type: 'voiceover',
                label: `Voiceover Track ${i}`,
                locked: false,
                order: config.numMusicTracks + i,
              });
            }

            // Build keyframes
            const keyframes: Record<string, VideoKeyFrame[]> = {};
            for (const kf of config.existingKeyframes) {
              // Only add keyframes to valid track indices
              if (kf.trackIndex >= tracks.length) continue;
              
              const track = tracks[kf.trackIndex];
              if (!keyframes[track.id]) {
                keyframes[track.id] = [];
              }
              
              keyframes[track.id].push({
                id: `kf-${kf.trackIndex}-${kf.timestamp}`,
                trackId: track.id,
                timestamp: kf.timestamp,
                duration: kf.duration,
                data: {
                  type: track.type === 'music' ? 'music' : 'voiceover',
                  mediaId: `media-${kf.trackIndex}`,
                  url: '/test.mp3',
                },
              });
            }

            // Call the function
            const result = findAvailableAudioTrack(
              tracks,
              keyframes,
              config.targetTimestamp,
              config.targetDuration
            );

            // Property: If a track is returned, it must have no conflicts
            if (result !== null) {
              const selectedTrackKeyframes = keyframes[result] || [];
              const targetStart = config.targetTimestamp;
              const targetEnd = config.targetTimestamp + config.targetDuration;

              for (const kf of selectedTrackKeyframes) {
                const kfStart = kf.timestamp;
                const kfEnd = kf.timestamp + kf.duration;
                
                // Check no overlap: either target ends before keyframe starts, or keyframe ends before target starts
                const noOverlap = targetEnd <= kfStart || kfEnd <= targetStart;
                expect(noOverlap).toBe(true);
              }

              // Property: The selected track must be an audio track
              const selectedTrack = tracks.find(t => t.id === result);
              expect(selectedTrack).toBeDefined();
              expect(['music', 'voiceover']).toContain(selectedTrack!.type);
            }

            // Property: If null is returned, all audio tracks must have conflicts
            if (result === null) {
              const audioTracks = tracks.filter(
                t => t.type === 'music' || t.type === 'voiceover'
              );

              // Either no audio tracks exist, or all have conflicts
              if (audioTracks.length > 0) {
                const targetStart = config.targetTimestamp;
                const targetEnd = config.targetTimestamp + config.targetDuration;

                for (const track of audioTracks) {
                  const trackKeyframes = keyframes[track.id] || [];
                  
                  // This track must have at least one conflict
                  const hasConflict = trackKeyframes.some(kf => {
                    const kfStart = kf.timestamp;
                    const kfEnd = kf.timestamp + kf.duration;
                    return targetStart < kfEnd && kfStart < targetEnd;
                  });

                  expect(hasConflict).toBe(true);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
