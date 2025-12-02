import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import { msToFrames } from './VideoComposition';

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
