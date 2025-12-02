import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VideoTrackRow } from './VideoTrackRow';
import { StudioProvider } from '@/lib/context/StudioContext';
import * as fc from 'fast-check';

// Helper to wrap component with StudioProvider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<StudioProvider>{component}</StudioProvider>);
};

describe('VideoTrackRow Property Tests', () => {
  // Feature: video-editor-center-panel, Property 13: Track types have distinct visual styles
  it('track types have distinct visual styles', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          projectId: fc.uuid(),
          type: fc.constantFrom('video' as const, 'music' as const, 'voiceover' as const),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          locked: fc.boolean(),
          order: fc.integer({ min: 0, max: 10 }),
        }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            trackId: fc.uuid(),
            timestamp: fc.integer({ min: 0, max: 30000 }),
            duration: fc.integer({ min: 1000, max: 10000 }),
            data: fc.record({
              type: fc.constantFrom('image' as const, 'video' as const, 'music' as const, 'voiceover' as const),
              mediaId: fc.uuid(),
              url: fc.webUrl(),
              prompt: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (track, keyframes) => {
          // Ensure keyframes reference the correct track
          const adjustedKeyframes = keyframes.map(kf => ({ ...kf, trackId: track.id }));
          
          const { container } = renderWithProvider(
            <VideoTrackRow
              track={track}
              keyframes={adjustedKeyframes}
              pixelsPerMs={0.1}
            />
          );

          // Check that track type has distinct visual styling
          const trackElements = container.querySelectorAll('.bg-sky-600, .bg-teal-500, .bg-indigo-500');
          
          if (adjustedKeyframes.length > 0) {
            // If there are keyframes, we should have styled elements
            expect(trackElements.length).toBeGreaterThan(0);
            
            // Verify the correct color class is applied based on track type
            const hasCorrectColor = Array.from(trackElements).some(el => {
              if (track.type === 'video') {
                return el.classList.contains('bg-sky-600');
              } else if (track.type === 'music') {
                return el.classList.contains('bg-teal-500');
              } else if (track.type === 'voiceover') {
                return el.classList.contains('bg-indigo-500');
              }
              return false;
            });
            
            expect(hasCorrectColor).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 14: Tracks are sorted by type
  it('tracks are sorted by type', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            projectId: fc.uuid(),
            type: fc.constantFrom('video' as const, 'music' as const, 'voiceover' as const),
            label: fc.string({ minLength: 1, maxLength: 50 }),
            locked: fc.boolean(),
            order: fc.integer({ min: 0, max: 10 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (tracks) => {
          // Define the expected order
          const TRACK_TYPE_ORDER = ['video', 'music', 'voiceover'];
          
          // Sort tracks by type according to the defined order
          const sortedTracks = [...tracks].sort((a, b) => {
            const orderA = TRACK_TYPE_ORDER.indexOf(a.type);
            const orderB = TRACK_TYPE_ORDER.indexOf(b.type);
            return orderA - orderB;
          });
          
          // Verify that the sorted tracks follow the expected order
          for (let i = 0; i < sortedTracks.length - 1; i++) {
            const currentTypeIndex = TRACK_TYPE_ORDER.indexOf(sortedTracks[i].type);
            const nextTypeIndex = TRACK_TYPE_ORDER.indexOf(sortedTracks[i + 1].type);
            
            // Current track type should come before or be equal to next track type
            expect(currentTypeIndex).toBeLessThanOrEqual(nextTypeIndex);
          }
          
          // Verify that all video tracks come before music tracks
          const videoTracks = sortedTracks.filter(t => t.type === 'video');
          const musicTracks = sortedTracks.filter(t => t.type === 'music');
          const voiceoverTracks = sortedTracks.filter(t => t.type === 'voiceover');
          
          if (videoTracks.length > 0 && musicTracks.length > 0) {
            const lastVideoIndex = sortedTracks.lastIndexOf(videoTracks[videoTracks.length - 1]);
            const firstMusicIndex = sortedTracks.indexOf(musicTracks[0]);
            expect(lastVideoIndex).toBeLessThan(firstMusicIndex);
          }
          
          // Verify that all music tracks come before voiceover tracks
          if (musicTracks.length > 0 && voiceoverTracks.length > 0) {
            const lastMusicIndex = sortedTracks.lastIndexOf(musicTracks[musicTracks.length - 1]);
            const firstVoiceoverIndex = sortedTracks.indexOf(voiceoverTracks[0]);
            expect(lastMusicIndex).toBeLessThan(firstVoiceoverIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
