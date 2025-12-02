import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StudioProvider, useStudio, VideoProject } from './StudioContext';
import * as fc from 'fast-check';
import React from 'react';

// Wrapper component for testing
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <StudioProvider>{children}</StudioProvider>
);

describe('StudioContext - Video Editor State', () => {
  // Feature: video-editor-center-panel, Property 24: Editor initialization stores project state
  // Validates: Requirements 7.1
  it('should store project state when editor initializes with a project', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ maxLength: 500 }),
          aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
          duration: fc.integer({ min: 1000, max: 3600000 }), // 1 second to 1 hour
        }),
        async (projectData) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Create a project
          let projectId: string = '';
          await act(async () => {
            projectId = await result.current.createProject(projectData);
          });

          // Wait for state to update
          await waitFor(() => {
            expect(result.current.currentProject).not.toBeNull();
          });

          // Verify the project state is stored in context
          expect(result.current.currentProject).toBeDefined();
          expect(result.current.currentProject?.title).toBe(projectData.title);
          expect(result.current.currentProject?.description).toBe(projectData.description);
          expect(result.current.currentProject?.aspectRatio).toBe(projectData.aspectRatio);
          expect(result.current.currentProject?.duration).toBe(projectData.duration);
          expect(result.current.currentProject?.id).toBe(projectId);
          expect(result.current.projects).toContainEqual(
            expect.objectContaining({
              title: projectData.title,
              description: projectData.description,
              aspectRatio: projectData.aspectRatio,
              duration: projectData.duration,
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 25: Track changes sync to context
  // Validates: Requirements 7.2
  it('should sync track changes to context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          projectId: fc.string({ minLength: 1 }),
          type: fc.constantFrom('video' as const, 'music' as const, 'voiceover' as const),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          locked: fc.boolean(),
          order: fc.integer({ min: 0, max: 100 }),
        }),
        async (trackData) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          const initialTrackCount = result.current.tracks.length;

          // Add a track
          let trackId: string = '';
          await act(async () => {
            trackId = await result.current.addTrack(trackData);
          });

          // Wait for state to update
          await waitFor(() => {
            expect(result.current.tracks.length).toBe(initialTrackCount + 1);
          });

          // Verify the track is in context
          const addedTrack = result.current.tracks.find(t => t.id === trackId);
          expect(addedTrack).toBeDefined();
          expect(addedTrack?.type).toBe(trackData.type);
          expect(addedTrack?.label).toBe(trackData.label);
          expect(addedTrack?.locked).toBe(trackData.locked);
          expect(addedTrack?.order).toBe(trackData.order);

          // Remove the track
          await act(async () => {
            await result.current.removeTrack(trackId);
          });

          // Wait for state to update
          await waitFor(() => {
            expect(result.current.tracks.length).toBe(initialTrackCount);
          });

          // Verify the track is removed from context
          const removedTrack = result.current.tracks.find(t => t.id === trackId);
          expect(removedTrack).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 26: Playback state syncs to context
  // Validates: Requirements 7.3
  it('should sync playback state changes to context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('playing' as const, 'paused' as const),
        async (newState) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Initial state should be paused
          expect(result.current.playerState).toBe('paused');

          // Change player state
          act(() => {
            result.current.setPlayerState(newState);
          });

          // Verify the state is updated in context
          expect(result.current.playerState).toBe(newState);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 27: Timestamp syncs to context
  // Validates: Requirements 7.4
  it('should sync timestamp changes to context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 3600, noNaN: true }), // 0 to 1 hour in seconds
        async (newTimestamp) => {
          const { result } = renderHook(() => useStudio(), { wrapper });

          // Initial timestamp should be 0
          expect(result.current.currentTimestamp).toBe(0);

          // Change timestamp
          act(() => {
            result.current.setCurrentTimestamp(newTimestamp);
          });

          // Verify the timestamp is updated in context
          expect(result.current.currentTimestamp).toBe(newTimestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 28: Context changes propagate to subscribers
  // Validates: Requirements 7.5
  it('should propagate context changes to all subscribers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(1.1), max: Math.fround(10), noNaN: true }),
        async (newZoom) => {
          const { result, rerender } = renderHook(() => useStudio(), { wrapper });

          // Initial zoom should be 1
          expect(result.current.zoom).toBe(1);

          // Change zoom
          act(() => {
            result.current.setZoom(newZoom);
          });

          // Force a re-render to simulate a subscriber re-rendering
          rerender();

          // Verify the hook sees the updated value after re-render
          expect(result.current.zoom).toBe(newZoom);
        }
      ),
      { numRuns: 100 }
    );
  });
});
