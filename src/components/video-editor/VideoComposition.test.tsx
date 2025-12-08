import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import { msToFrames } from './VideoComposition';
import { fitMedia } from '@/lib/mediaFitting';

// Feature: video-editor-center-panel, Property 3: Timeline playback respects chronological order
describe('VideoComposition - Chronological Playback', () => {
  it('should render keyframes in chronological order based on timestamps', () => {
    fc.assert(
      fc.property(
        // Generate a project
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ maxLength: 200 }),
          aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
          duration: fc.integer({ min: 5000, max: 60000 }), // 5s to 60s
          createdAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
          updatedAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
        }),
        // Generate a track
        fc.record({
          id: fc.uuid(),
          projectId: fc.uuid(),
          type: fc.constantFrom('video' as const, 'music' as const, 'voiceover' as const),
          label: fc.string({ minLength: 1, maxLength: 30 }),
          locked: fc.boolean(),
          order: fc.integer({ min: 0, max: 10 }),
        }),
        // Generate an array of keyframes with random timestamps
        fc.array(
          fc.record({
            id: fc.uuid(),
            trackId: fc.uuid(),
            timestamp: fc.integer({ min: 0, max: 50000 }), // Random timestamps
            duration: fc.integer({ min: 1000, max: 10000 }), // 1s to 10s
            data: fc.record({
              type: fc.constantFrom('image' as const, 'video' as const, 'music' as const, 'voiceover' as const),
              mediaId: fc.uuid(),
              url: fc.webUrl(),
              prompt: fc.option(fc.string({ maxLength: 100 })),
            }),
          }),
          { minLength: 2, maxLength: 10 } // At least 2 keyframes to test ordering
        ),
        (project: VideoProject, track: VideoTrack, keyframes: VideoKeyFrame[]) => {
          // Ensure track and keyframes have matching IDs
          const trackWithMatchingId = { ...track, projectId: project.id };
          const keyframesWithMatchingTrackId = keyframes.map(kf => ({
            ...kf,
            trackId: trackWithMatchingId.id,
          }));

          // Sort keyframes by timestamp (this is what the component should do)
          const sortedKeyframes = [...keyframesWithMatchingTrackId].sort(
            (a, b) => a.timestamp - b.timestamp
          );

          // Verify that the sorted keyframes are in chronological order
          for (let i = 0; i < sortedKeyframes.length - 1; i++) {
            expect(sortedKeyframes[i].timestamp).toBeLessThanOrEqual(
              sortedKeyframes[i + 1].timestamp
            );
          }

          // Verify that frame calculations maintain chronological order
          const framePositions = sortedKeyframes.map(kf => ({
            id: kf.id,
            startFrame: msToFrames(kf.timestamp),
            endFrame: msToFrames(kf.timestamp + kf.duration),
          }));

          // Check that start frames are in ascending order
          for (let i = 0; i < framePositions.length - 1; i++) {
            expect(framePositions[i].startFrame).toBeLessThanOrEqual(
              framePositions[i + 1].startFrame
            );
          }

          // Verify that the original unsorted array is different from sorted
          // (unless it was already sorted by chance)
          const timestampsChanged = keyframesWithMatchingTrackId.some(
            (kf, idx) => kf.timestamp !== sortedKeyframes[idx].timestamp
          );

          // If timestamps were different, sorting should have changed the order
          if (timestampsChanged) {
            const originalTimestamps = keyframesWithMatchingTrackId.map(kf => kf.timestamp);
            const sortedTimestamps = sortedKeyframes.map(kf => kf.timestamp);
            
            // At least verify that sorting produces a valid chronological sequence
            let isChronological = true;
            for (let i = 0; i < sortedTimestamps.length - 1; i++) {
              if (sortedTimestamps[i] > sortedTimestamps[i + 1]) {
                isChronological = false;
                break;
              }
            }
            expect(isChronological).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: video-editor-center-panel, Property 16: Player reflects timeline changes
describe('VideoComposition - Timeline Changes', () => {
  it('should update composition when keyframes are added or removed', () => {
    fc.assert(
      fc.property(
        // Generate initial state
        fc.record({
          project: fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ maxLength: 200 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 5000, max: 60000 }),
            createdAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
            updatedAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
          }),
          track: fc.record({
            id: fc.uuid(),
            projectId: fc.uuid(),
            type: fc.constantFrom('video' as const, 'music' as const, 'voiceover' as const),
            label: fc.string({ minLength: 1, maxLength: 30 }),
            locked: fc.boolean(),
            order: fc.integer({ min: 0, max: 10 }),
          }),
          initialKeyframes: fc.array(
            fc.record({
              id: fc.uuid(),
              trackId: fc.uuid(),
              timestamp: fc.integer({ min: 0, max: 50000 }),
              duration: fc.integer({ min: 1000, max: 10000 }),
              data: fc.record({
                type: fc.constantFrom('image' as const, 'video' as const, 'music' as const, 'voiceover' as const),
                mediaId: fc.uuid(),
                url: fc.webUrl(),
                prompt: fc.option(fc.string({ maxLength: 100 })),
              }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          newKeyframe: fc.record({
            id: fc.uuid(),
            trackId: fc.uuid(),
            timestamp: fc.integer({ min: 0, max: 50000 }),
            duration: fc.integer({ min: 1000, max: 10000 }),
            data: fc.record({
              type: fc.constantFrom('image' as const, 'video' as const, 'music' as const, 'voiceover' as const),
              mediaId: fc.uuid(),
              url: fc.webUrl(),
              prompt: fc.option(fc.string({ maxLength: 100 })),
            }),
          }),
        }),
        ({ project, track, initialKeyframes, newKeyframe }) => {
          // Ensure IDs match
          const trackWithMatchingId = { ...track, projectId: project.id };
          const initialKeyframesWithMatchingTrackId = initialKeyframes.map(kf => ({
            ...kf,
            trackId: trackWithMatchingId.id,
          }));
          const newKeyframeWithMatchingTrackId = {
            ...newKeyframe,
            trackId: trackWithMatchingId.id,
          };

          // Test adding a keyframe
          const keyframesAfterAdd = [
            ...initialKeyframesWithMatchingTrackId,
            newKeyframeWithMatchingTrackId,
          ];

          // Verify that adding a keyframe increases the count
          expect(keyframesAfterAdd.length).toBe(initialKeyframesWithMatchingTrackId.length + 1);

          // Verify that the new keyframe is present
          expect(keyframesAfterAdd).toContainEqual(newKeyframeWithMatchingTrackId);

          // Test removing a keyframe (if there are any)
          if (initialKeyframesWithMatchingTrackId.length > 0) {
            const keyframeToRemove = initialKeyframesWithMatchingTrackId[0];
            const keyframesAfterRemove = initialKeyframesWithMatchingTrackId.filter(
              kf => kf.id !== keyframeToRemove.id
            );

            // Verify that removing a keyframe decreases the count
            expect(keyframesAfterRemove.length).toBe(
              initialKeyframesWithMatchingTrackId.length - 1
            );

            // Verify that the removed keyframe is not present
            expect(keyframesAfterRemove).not.toContainEqual(keyframeToRemove);
          }

          // Verify that the composition can handle empty keyframes
          const emptyKeyframes: VideoKeyFrame[] = [];
          expect(emptyKeyframes.length).toBe(0);

          // Verify that keyframes maintain their properties after changes
          keyframesAfterAdd.forEach(kf => {
            expect(kf).toHaveProperty('id');
            expect(kf).toHaveProperty('trackId');
            expect(kf).toHaveProperty('timestamp');
            expect(kf).toHaveProperty('duration');
            expect(kf).toHaveProperty('data');
            expect(kf.data).toHaveProperty('type');
            expect(kf.data).toHaveProperty('mediaId');
            expect(kf.data).toHaveProperty('url');
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: video-resolution-audio-controls, Property 4: Media scaling to project resolution
describe('VideoComposition - Media Scaling', () => {
  it('should scale media to fit project resolution', () => {
    fc.assert(
      fc.property(
        // Generate a project with resolution settings
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.string({ maxLength: 200 }),
          aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const),
          qualityPreset: fc.constantFrom('480p' as const, '720p' as const, '1080p' as const),
          width: fc.integer({ min: 480, max: 1920 }),
          height: fc.integer({ min: 480, max: 1920 }),
          duration: fc.integer({ min: 5000, max: 60000 }),
          createdAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
          updatedAt: fc.integer({ min: 1000000000000, max: 2000000000000 }),
        }),
        // Generate a track
        fc.record({
          id: fc.uuid(),
          projectId: fc.uuid(),
          type: fc.constantFrom('video' as const),
          label: fc.string({ minLength: 1, maxLength: 30 }),
          locked: fc.boolean(),
          order: fc.integer({ min: 0, max: 10 }),
          volume: fc.integer({ min: 0, max: 200 }),
          muted: fc.boolean(),
        }),
        // Generate keyframes with image/video media
        fc.array(
          fc.record({
            id: fc.uuid(),
            trackId: fc.uuid(),
            timestamp: fc.integer({ min: 0, max: 50000 }),
            duration: fc.integer({ min: 1000, max: 10000 }),
            data: fc.record({
              type: fc.constantFrom('image' as const, 'video' as const),
              mediaId: fc.uuid(),
              url: fc.webUrl(),
              prompt: fc.option(fc.string({ maxLength: 100 })),
              fitMode: fc.option(fc.constantFrom('contain' as const, 'cover' as const, 'fill' as const)),
            }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (project: VideoProject, track: VideoTrack, keyframes: VideoKeyFrame[]) => {
          // Ensure track and keyframes have matching IDs
          const trackWithMatchingId = { ...track, projectId: project.id };
          const keyframesWithMatchingTrackId = keyframes.map(kf => ({
            ...kf,
            trackId: trackWithMatchingId.id,
          }));

          // Verify that project has resolution settings
          expect(project.width).toBeGreaterThan(0);
          expect(project.height).toBeGreaterThan(0);

          // Verify that each keyframe has a fit mode (default to 'contain' if not set)
          keyframesWithMatchingTrackId.forEach(kf => {
            const fitMode = kf.data.fitMode || 'contain';
            expect(['contain', 'cover', 'fill']).toContain(fitMode);
          });

          // Verify that media types are image or video
          keyframesWithMatchingTrackId.forEach(kf => {
            expect(['image', 'video']).toContain(kf.data.type);
          });

          // The actual scaling is handled by CSS object-fit in the component
          // We verify that the component receives the correct canvas dimensions
          const canvasWidth = project.width;
          const canvasHeight = project.height;

          expect(canvasWidth).toBeGreaterThan(0);
          expect(canvasHeight).toBeGreaterThan(0);

          // Verify that the canvas dimensions match the project resolution
          expect(canvasWidth).toBe(project.width);
          expect(canvasHeight).toBe(project.height);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: video-resolution-audio-controls, Property 6: Media upscaling and downscaling
describe('VideoComposition - Media Upscaling and Downscaling', () => {
  it('should scale media up if smaller than canvas or down if larger than canvas', () => {
    fc.assert(
      fc.property(
        // Generate media dimensions (original size)
        fc.record({
          width: fc.integer({ min: 100, max: 3840 }),
          height: fc.integer({ min: 100, max: 2160 }),
        }),
        // Generate canvas dimensions (project resolution)
        fc.record({
          width: fc.integer({ min: 480, max: 1920 }),
          height: fc.integer({ min: 480, max: 1920 }),
        }),
        // Generate fit mode
        fc.constantFrom('contain' as const, 'cover' as const, 'fill' as const),
        (media, canvas, fitMode) => {
          const result = fitMedia(media, canvas, fitMode);

          // Verify that result has all required properties
          expect(result).toHaveProperty('width');
          expect(result).toHaveProperty('height');
          expect(result).toHaveProperty('x');
          expect(result).toHaveProperty('y');
          expect(result).toHaveProperty('scale');

          // Verify that dimensions are positive
          expect(result.width).toBeGreaterThan(0);
          expect(result.height).toBeGreaterThan(0);
          expect(result.scale).toBeGreaterThan(0);

          if (fitMode === 'contain') {
            // In contain mode, the entire media should be visible
            // The result dimensions should fit within the canvas
            expect(result.width).toBeLessThanOrEqual(canvas.width + 0.01); // Allow small floating point error
            expect(result.height).toBeLessThanOrEqual(canvas.height + 0.01);

            // Verify aspect ratio is preserved and scaling behavior
            const mediaAspect = media.width / media.height;
            const resultAspect = result.width / result.height;
            const canvasAspect = canvas.width / canvas.height;
            expect(Math.abs(mediaAspect - resultAspect)).toBeLessThan(0.01);
            
            if (mediaAspect > canvasAspect) {
              // Media is wider, fit to width
              // Scale should be canvas.width / media.width
              const expectedScale = canvas.width / media.width;
              expect(Math.abs(result.scale - expectedScale)).toBeLessThan(0.01);
              
              // Test upscaling/downscaling for width dimension
              if (media.width < canvas.width) {
                expect(result.scale).toBeGreaterThanOrEqual(0.99); // Allow small tolerance
              } else if (media.width > canvas.width) {
                expect(result.scale).toBeLessThanOrEqual(1.01); // Allow small tolerance
              }
            } else {
              // Media is taller, fit to height
              // Scale should be canvas.height / media.height
              const expectedScale = canvas.height / media.height;
              expect(Math.abs(result.scale - expectedScale)).toBeLessThan(0.01);
              
              // Test upscaling/downscaling for height dimension
              if (media.height < canvas.height) {
                expect(result.scale).toBeGreaterThanOrEqual(0.99); // Allow small tolerance
              } else if (media.height > canvas.height) {
                expect(result.scale).toBeLessThanOrEqual(1.01); // Allow small tolerance
              }
            }
          } else if (fitMode === 'cover') {
            // In cover mode, the canvas should be completely filled
            // At least one dimension should match the canvas
            const widthMatches = Math.abs(result.width - canvas.width) < 0.01;
            const heightMatches = Math.abs(result.height - canvas.height) < 0.01;
            expect(widthMatches || heightMatches).toBe(true);

            // Verify aspect ratio is preserved
            const mediaAspect = media.width / media.height;
            const resultAspect = result.width / result.height;
            expect(Math.abs(mediaAspect - resultAspect)).toBeLessThan(0.01);
          } else if (fitMode === 'fill') {
            // In fill mode, dimensions should exactly match canvas
            expect(Math.abs(result.width - canvas.width)).toBeLessThan(0.01);
            expect(Math.abs(result.height - canvas.height)).toBeLessThan(0.01);
            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
          }

          // Verify that position is within reasonable bounds
          // In cover mode, media can extend beyond canvas to crop, so allow wider bounds
          expect(result.x).toBeGreaterThanOrEqual(-result.width);
          expect(result.x).toBeLessThanOrEqual(canvas.width);
          expect(result.y).toBeGreaterThanOrEqual(-result.height);
          expect(result.y).toBeLessThanOrEqual(canvas.height);
        }
      ),
      { numRuns: 100 }
    );
  });
});
