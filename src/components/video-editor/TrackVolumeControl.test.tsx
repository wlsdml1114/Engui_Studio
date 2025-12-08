import { describe, test, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { TrackVolumeControl } from './TrackVolumeControl';
import { VideoTrack } from '@/lib/context/StudioContext';

describe('TrackVolumeControl', () => {
  // Feature: video-resolution-audio-controls, Property 11: Mute button toggles track muted state
  // Validates: Requirements 6.2, 6.4
  test('mute button toggles track muted state', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          projectId: fc.uuid(),
          type: fc.constantFrom('music' as const, 'voiceover' as const),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          locked: fc.boolean(),
          order: fc.integer({ min: 0, max: 10 }),
          volume: fc.integer({ min: 0, max: 200 }),
          muted: fc.boolean(),
        }),
        (track: VideoTrack) => {
          const onVolumeChange = vi.fn();
          const onMuteToggle = vi.fn();

          const { container, unmount } = render(
            <TrackVolumeControl
              track={track}
              onVolumeChange={onVolumeChange}
              onMuteToggle={onMuteToggle}
            />
          );

          try {
            // Find the mute button by title attribute within this container
            const muteButton = within(container).getByTitle(track.muted ? 'Unmute' : 'Mute');
            
            // Use fireEvent for more reliable testing in property tests
            fireEvent.click(muteButton);

            // Verify the callback was called with the toggled state
            expect(onMuteToggle).toHaveBeenCalledWith(!track.muted);
            expect(onMuteToggle).toHaveBeenCalledTimes(1);
            
            return true;
          } finally {
            // Clean up after each run
            unmount();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('does not render for video tracks', () => {
    const videoTrack: VideoTrack = {
      id: '1',
      projectId: '1',
      type: 'video',
      label: 'Video Track',
      locked: false,
      order: 0,
      volume: 100,
      muted: false,
    };

    const { container } = render(
      <TrackVolumeControl
        track={videoTrack}
        onVolumeChange={vi.fn()}
        onMuteToggle={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('slider is disabled when track is muted', () => {
    const mutedTrack: VideoTrack = {
      id: '1',
      projectId: '1',
      type: 'music',
      label: 'Music Track',
      locked: false,
      order: 0,
      volume: 100,
      muted: true,
    };

    const { container } = render(
      <TrackVolumeControl
        track={mutedTrack}
        onVolumeChange={vi.fn()}
        onMuteToggle={vi.fn()}
      />
    );

    const slider = within(container).getByRole('slider');
    // Radix UI uses data-disabled attribute
    expect(slider).toHaveAttribute('data-disabled');
  });

  test('displays correct volume percentage', () => {
    const track: VideoTrack = {
      id: '1',
      projectId: '1',
      type: 'music',
      label: 'Music Track',
      locked: false,
      order: 0,
      volume: 150,
      muted: false,
    };

    const { container } = render(
      <TrackVolumeControl
        track={track}
        onVolumeChange={vi.fn()}
        onMuteToggle={vi.fn()}
      />
    );

    expect(within(container).getByText('150%')).toBeInTheDocument();
  });
});
