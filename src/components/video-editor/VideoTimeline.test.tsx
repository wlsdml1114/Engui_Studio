import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { VideoTimeline } from './VideoTimeline';
import * as fc from 'fast-check';
import React from 'react';

// Mock the child components
vi.mock('./TimelineRuler', () => ({
  TimelineRuler: () => <div data-testid="timeline-ruler">Timeline Ruler</div>,
}));

vi.mock('./VideoTrackRow', () => ({
  VideoTrackRow: ({ track }: any) => (
    <div data-testid={`track-row-${track.id}`}>Track Row: {track.label}</div>
  ),
}));

// Mock the StudioContext
vi.mock('@/lib/context/StudioContext', () => {
  const React = require('react');
  const StudioContext = React.createContext<any>(null);
  
  return {
    useStudio: () => React.useContext(StudioContext),
    StudioContext,
  };
});

// Mock the i18n context
vi.mock('@/lib/i18n/context', () => ({
  useI18n: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string, params?: Record<string, string | number>) => {
      // Return the key as the translation for testing
      if (params) {
        let result = key;
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, String(v));
        });
        return result;
      }
      return key;
    },
  }),
}));

// Mock audio detection service
vi.mock('@/lib/audioDetectionService', () => ({
  hasAudioTrack: vi.fn(),
}));

// Mock track selection service
vi.mock('@/lib/trackSelectionService', () => ({
  findAvailableAudioTrack: vi.fn(),
}));

describe('VideoTimeline Property Tests', () => {
  const mockProject = {
    id: 'test-project',
    title: 'Test Project',
    description: 'Test Description',
    aspectRatio: '16:9' as const,
    duration: 30000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const createTestWrapper = (mockAddKeyframe: any, mockAddTrack: any) => {
    return async ({ children }: { children: React.ReactNode }) => {
      const { StudioContext } = await import('@/lib/context/StudioContext');
      
      return (
        <StudioContext.Provider
          value={{
            currentProject: mockProject,
            projects: [mockProject],
            tracks: [],
            keyframes: {},
            player: null,
            playerState: 'paused',
            currentTimestamp: 0,
            zoom: 1,
            selectedKeyframeIds: [],
            exportDialogOpen: false,
            setCurrentTimestamp: vi.fn(),
            addKeyframe: mockAddKeyframe,
            addTrack: mockAddTrack,
            setPlayer: vi.fn(),
            setPlayerState: vi.fn(),
            setZoom: vi.fn(),
            selectKeyframe: vi.fn(),
            deselectKeyframe: vi.fn(),
            clearSelection: vi.fn(),
            setExportDialogOpen: vi.fn(),
            createProject: vi.fn(),
            loadProject: vi.fn(),
            updateProject: vi.fn(),
            deleteProject: vi.fn(),
            removeTrack: vi.fn(),
            updateKeyframe: vi.fn(),
            removeKeyframe: vi.fn(),
          } as any}
        >
          {children}
        </StudioContext.Provider>
      );
    };
  };

  // Feature: video-editor-center-panel, Property 2: Media addition creates keyframes
  describe('Property 2: Media addition creates keyframes', () => {
    it('should create keyframes for any valid media item added to timeline', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('image', 'video', 'music', 'voiceover'),
            url: fc.webUrl(),
            prompt: fc.option(fc.string(), { nil: undefined }),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            let addedKeyframe: any = null;

            const mockAddKeyframe = vi.fn(async (keyframe) => {
              addedKeyframe = keyframe;
              return `keyframe-${Date.now()}`;
            });

            const mockAddTrack = vi.fn(async (track) => {
              return `track-${Date.now()}`;
            });

            const { StudioContext } = await import('@/lib/context/StudioContext');
            
            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: mockAddTrack,
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            // Simulate drag and drop
            const timeline = container.querySelector('[data-timeline-zoom]');
            expect(timeline).toBeTruthy();

            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: (type: string) => {
                if (type === 'application/json') {
                  return JSON.stringify(media);
                }
                return '';
              },
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            // Wait for async operations with shorter timeout
            await waitFor(
              () => {
                expect(mockAddKeyframe).toHaveBeenCalled();
              },
              { timeout: 500 }
            );

            // Verify keyframe was created with correct media data
            expect(addedKeyframe).toBeTruthy();
            expect(addedKeyframe.data.mediaId).toBe(media.id);
            expect(addedKeyframe.data.type).toBe(media.type);
            expect(addedKeyframe.data.url).toBe(media.url);
            expect(addedKeyframe.data.prompt).toBe(media.prompt);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for 100 runs
  });

  // Feature: video-editor-center-panel, Property 10: Video media creates video track
  describe('Property 10: Video media creates video track', () => {
    it('should create or use video track for any video media', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constant('video'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            let createdTrack: any = null;

            const mockAddTrack = vi.fn(async (track) => {
              createdTrack = track;
              return `track-${Date.now()}`;
            });

            const mockAddKeyframe = vi.fn(async () => `keyframe-${Date.now()}`);

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: mockAddTrack,
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(() => {
              expect(mockAddTrack).toHaveBeenCalled();
            });

            // Verify track type is 'video'
            expect(createdTrack).toBeTruthy();
            expect(createdTrack.type).toBe('video');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: video-editor-center-panel, Property 11: Image media uses video track
  describe('Property 11: Image media uses video track', () => {
    it('should place image media in video track', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constant('image'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            let createdTrack: any = null;

            const mockAddTrack = vi.fn(async (track) => {
              createdTrack = track;
              return `track-${Date.now()}`;
            });

            const mockAddKeyframe = vi.fn(async () => `keyframe-${Date.now()}`);

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: mockAddTrack,
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(() => {
              expect(mockAddTrack).toHaveBeenCalled();
            });

            // Verify track type is 'video' for image media
            expect(createdTrack).toBeTruthy();
            expect(createdTrack.type).toBe('video');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: video-editor-center-panel, Property 12: Audio media creates appropriate track
  describe('Property 12: Audio media creates appropriate track', () => {
    it('should create music or voiceover track for audio media', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('music', 'voiceover'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            let createdTrack: any = null;

            const mockAddTrack = vi.fn(async (track) => {
              createdTrack = track;
              return `track-${Date.now()}`;
            });

            const mockAddKeyframe = vi.fn(async () => `keyframe-${Date.now()}`);

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: mockAddTrack,
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(() => {
              expect(mockAddTrack).toHaveBeenCalled();
            });

            // Verify track type matches media type
            expect(createdTrack).toBeTruthy();
            expect(createdTrack.type).toBe(media.type);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: video-audio-track-sync, Property 1: Audio extraction for videos with audio**
  describe('Property 1: Audio extraction for videos with audio', () => {
    it('should create audio keyframe for any video with audio', async () => {
      const { hasAudioTrack } = await import('@/lib/audioDetectionService');
      const { findAvailableAudioTrack } = await import('@/lib/trackSelectionService');
      
      // Mock hasAudioTrack to return true
      vi.mocked(hasAudioTrack).mockResolvedValue(true);
      
      // Mock findAvailableAudioTrack to return a track ID
      vi.mocked(findAvailableAudioTrack).mockReturnValue('audio-track-1');
      
      // Mock fetch for audio extraction API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ audioPath: '/results/audio/test-audio.mp3' }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constant('video'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
            timestamp: fc.integer({ min: 0, max: 20000 }),
          }),
          async (media) => {
            const addedKeyframes: any[] = [];

            const mockAddKeyframe = vi.fn(async (keyframe) => {
              addedKeyframes.push(keyframe);
              return `keyframe-${Date.now()}`;
            });

            const mockAddTrack = vi.fn(async () => 'track-1');

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const musicTrack = {
              id: 'audio-track-1',
              projectId: 'test-project',
              type: 'music' as const,
              label: 'Music Track',
              locked: false,
              order: 1,
            };

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [musicTrack],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: mockAddTrack,
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[musicTrack]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(
              () => {
                expect(mockAddKeyframe).toHaveBeenCalledTimes(2); // Video + Audio
              },
              { timeout: 1000 }
            );

            // Verify both video and audio keyframes were created
            expect(addedKeyframes.length).toBe(2);
            
            // Find audio keyframe
            const audioKeyframe = addedKeyframes.find(kf => 
              kf.data.type === 'music' || kf.data.type === 'voiceover'
            );
            
            expect(audioKeyframe).toBeTruthy();
            expect(audioKeyframe.trackId).toBe('audio-track-1');
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  // **Feature: video-audio-track-sync, Property 2: Video and audio keyframe synchronization**
  describe('Property 2: Video and audio keyframe synchronization', () => {
    it('should create audio keyframe with same timestamp and duration as video', async () => {
      const { hasAudioTrack } = await import('@/lib/audioDetectionService');
      const { findAvailableAudioTrack } = await import('@/lib/trackSelectionService');
      
      vi.mocked(hasAudioTrack).mockResolvedValue(true);
      vi.mocked(findAvailableAudioTrack).mockReturnValue('audio-track-1');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ audioPath: '/results/audio/test-audio.mp3' }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constant('video'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            const addedKeyframes: any[] = [];

            const mockAddKeyframe = vi.fn(async (keyframe) => {
              addedKeyframes.push(keyframe);
              return `keyframe-${Date.now()}`;
            });

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const musicTrack = {
              id: 'audio-track-1',
              projectId: 'test-project',
              type: 'music' as const,
              label: 'Music Track',
              locked: false,
              order: 1,
            };

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [musicTrack],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: vi.fn(async () => 'track-1'),
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[musicTrack]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(
              () => {
                expect(mockAddKeyframe).toHaveBeenCalledTimes(2);
              },
              { timeout: 1000 }
            );

            // Get video and audio keyframes
            const videoKeyframe = addedKeyframes[0];
            const audioKeyframe = addedKeyframes[1];

            // Verify synchronization
            expect(audioKeyframe.timestamp).toBe(videoKeyframe.timestamp);
            expect(audioKeyframe.duration).toBe(videoKeyframe.duration);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  // **Feature: video-audio-track-sync, Property 3: No audio extraction for silent videos**
  describe('Property 3: No audio extraction for silent videos', () => {
    it('should not create audio keyframe for videos without audio', async () => {
      const { hasAudioTrack } = await import('@/lib/audioDetectionService');
      
      // Mock hasAudioTrack to return false (no audio)
      vi.mocked(hasAudioTrack).mockResolvedValue(false);

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constant('video'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            const addedKeyframes: any[] = [];

            const mockAddKeyframe = vi.fn(async (keyframe) => {
              addedKeyframes.push(keyframe);
              return `keyframe-${Date.now()}`;
            });

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: vi.fn(async () => 'track-1'),
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(
              () => {
                expect(mockAddKeyframe).toHaveBeenCalled();
              },
              { timeout: 1000 }
            );

            // Verify only video keyframe was created (no audio)
            expect(addedKeyframes.length).toBe(1);
            expect(addedKeyframes[0].data.type).toBe('video');
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  // **Feature: video-audio-track-sync, Property 7: Audio keyframe URL storage**
  describe('Property 7: Audio keyframe URL storage', () => {
    it('should store valid audio URL in audio keyframe data', async () => {
      const { hasAudioTrack } = await import('@/lib/audioDetectionService');
      const { findAvailableAudioTrack } = await import('@/lib/trackSelectionService');
      
      vi.mocked(hasAudioTrack).mockResolvedValue(true);
      vi.mocked(findAvailableAudioTrack).mockReturnValue('audio-track-1');
      
      const testAudioPath = '/results/audio/test-audio.mp3';
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ audioPath: testAudioPath }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constant('video'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            const addedKeyframes: any[] = [];

            const mockAddKeyframe = vi.fn(async (keyframe) => {
              addedKeyframes.push(keyframe);
              return `keyframe-${Date.now()}`;
            });

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const musicTrack = {
              id: 'audio-track-1',
              projectId: 'test-project',
              type: 'music' as const,
              label: 'Music Track',
              locked: false,
              order: 1,
            };

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [musicTrack],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: vi.fn(async () => 'track-1'),
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[musicTrack]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(
              () => {
                expect(mockAddKeyframe).toHaveBeenCalledTimes(2);
              },
              { timeout: 1000 }
            );

            // Find audio keyframe
            const audioKeyframe = addedKeyframes.find(kf => 
              kf.data.type === 'music' || kf.data.type === 'voiceover'
            );

            // Verify URL is stored and valid
            expect(audioKeyframe).toBeTruthy();
            expect(audioKeyframe.data.url).toBe(testAudioPath);
            expect(audioKeyframe.data.url).toMatch(/^\/results\/audio\/.+\.mp3$/);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  // **Feature: video-audio-track-sync, Property 8: Audio keyframe duration metadata**
  describe('Property 8: Audio keyframe duration metadata', () => {
    it('should store originalDuration in audio keyframe data', async () => {
      const { hasAudioTrack } = await import('@/lib/audioDetectionService');
      const { findAvailableAudioTrack } = await import('@/lib/trackSelectionService');
      
      vi.mocked(hasAudioTrack).mockResolvedValue(true);
      vi.mocked(findAvailableAudioTrack).mockReturnValue('audio-track-1');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ audioPath: '/results/audio/test-audio.mp3' }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constant('video'),
            url: fc.webUrl(),
            duration: fc.integer({ min: 1000, max: 30000 }),
          }),
          async (media) => {
            const addedKeyframes: any[] = [];

            const mockAddKeyframe = vi.fn(async (keyframe) => {
              addedKeyframes.push(keyframe);
              return `keyframe-${Date.now()}`;
            });

            const { StudioContext } = await import('@/lib/context/StudioContext');

            const musicTrack = {
              id: 'audio-track-1',
              projectId: 'test-project',
              type: 'music' as const,
              label: 'Music Track',
              locked: false,
              order: 1,
            };

            const { container } = render(
              <StudioContext.Provider
                value={{
                  currentProject: mockProject,
                  projects: [mockProject],
                  tracks: [musicTrack],
                  keyframes: {},
                  player: null,
                  playerState: 'paused',
                  currentTimestamp: 0,
                  zoom: 1,
                  selectedKeyframeIds: [],
                  exportDialogOpen: false,
                  setCurrentTimestamp: vi.fn(),
                  addKeyframe: mockAddKeyframe,
                  addTrack: vi.fn(async () => 'track-1'),
                  setPlayer: vi.fn(),
                  setPlayerState: vi.fn(),
                  setZoom: vi.fn(),
                  selectKeyframe: vi.fn(),
                  deselectKeyframe: vi.fn(),
                  clearSelection: vi.fn(),
                  setExportDialogOpen: vi.fn(),
                  createProject: vi.fn(),
                  loadProject: vi.fn(),
                  updateProject: vi.fn(),
                  deleteProject: vi.fn(),
                  removeTrack: vi.fn(),
                  updateKeyframe: vi.fn(),
                  removeKeyframe: vi.fn(),
                } as any}
              >
                <VideoTimeline
                  project={mockProject}
                  tracks={[musicTrack]}
                  keyframes={{}}
                  currentTimestamp={0}
                  zoom={1}
                />
              </StudioContext.Provider>
            );

            const timeline = container.querySelector('[data-timeline-zoom]');
            const dropEvent = new Event('drop', { bubbles: true }) as any;
            dropEvent.dataTransfer = {
              getData: () => JSON.stringify(media),
            };
            dropEvent.clientX = 100;

            timeline?.dispatchEvent(dropEvent);

            await waitFor(
              () => {
                expect(mockAddKeyframe).toHaveBeenCalledTimes(2);
              },
              { timeout: 1000 }
            );

            // Find audio keyframe
            const audioKeyframe = addedKeyframes.find(kf => 
              kf.data.type === 'music' || kf.data.type === 'voiceover'
            );

            // Verify originalDuration is stored
            expect(audioKeyframe).toBeTruthy();
            expect(audioKeyframe.data.originalDuration).toBeDefined();
            expect(typeof audioKeyframe.data.originalDuration).toBe('number');
            expect(audioKeyframe.data.originalDuration).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  describe('Accessibility Tests', () => {
    it('should have region role with aria-label', async () => {
      const { StudioContext } = await import('@/lib/context/StudioContext');
      
      const { container } = render(
        <StudioContext.Provider
          value={{
            currentProject: mockProject,
            projects: [mockProject],
            tracks: [],
            keyframes: {},
            player: null,
            playerState: 'paused',
            currentTimestamp: 0,
            zoom: 1,
            selectedKeyframeIds: [],
            exportDialogOpen: false,
            setCurrentTimestamp: vi.fn(),
            addKeyframe: vi.fn(),
            addTrack: vi.fn(),
            setPlayer: vi.fn(),
            setPlayerState: vi.fn(),
            setZoom: vi.fn(),
            selectKeyframe: vi.fn(),
            deselectKeyframe: vi.fn(),
            clearSelection: vi.fn(),
            setExportDialogOpen: vi.fn(),
            createProject: vi.fn(),
            loadProject: vi.fn(),
            updateProject: vi.fn(),
            deleteProject: vi.fn(),
            removeTrack: vi.fn(),
            updateKeyframe: vi.fn(),
            removeKeyframe: vi.fn(),
          } as any}
        >
          <VideoTimeline
            project={mockProject}
            tracks={[]}
            keyframes={{}}
            currentTimestamp={0}
            zoom={1}
          />
        </StudioContext.Provider>
      );

      const region = container.querySelector('[role="region"]');
      expect(region).toBeInTheDocument();
      // Now uses translation key since useI18n is mocked to return the key
      expect(region).toHaveAttribute('aria-label', 'videoEditor.messages.videoTimeline');
    });

    it('should have hidden instructions for screen readers', async () => {
      const { StudioContext } = await import('@/lib/context/StudioContext');
      
      const { container } = render(
        <StudioContext.Provider
          value={{
            currentProject: mockProject,
            projects: [mockProject],
            tracks: [],
            keyframes: {},
            player: null,
            playerState: 'paused',
            currentTimestamp: 0,
            zoom: 1,
            selectedKeyframeIds: [],
            exportDialogOpen: false,
            setCurrentTimestamp: vi.fn(),
            addKeyframe: vi.fn(),
            addTrack: vi.fn(),
            setPlayer: vi.fn(),
            setPlayerState: vi.fn(),
            setZoom: vi.fn(),
            selectKeyframe: vi.fn(),
            deselectKeyframe: vi.fn(),
            clearSelection: vi.fn(),
            setExportDialogOpen: vi.fn(),
            createProject: vi.fn(),
            loadProject: vi.fn(),
            updateProject: vi.fn(),
            deleteProject: vi.fn(),
            removeTrack: vi.fn(),
            updateKeyframe: vi.fn(),
            removeKeyframe: vi.fn(),
          } as any}
        >
          <VideoTimeline
            project={mockProject}
            tracks={[]}
            keyframes={{}}
            currentTimestamp={0}
            zoom={1}
          />
        </StudioContext.Provider>
      );

      const instructions = container.querySelector('#timeline-instructions');
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveClass('sr-only');
      // Now uses translation key since useI18n is mocked to return the key
      expect(instructions?.textContent).toContain('videoEditor.messages.timelineKeyboardShortcuts');
    });

    it('should have keyboard navigation support', async () => {
      const { StudioContext } = await import('@/lib/context/StudioContext');
      
      const { container } = render(
        <StudioContext.Provider
          value={{
            currentProject: mockProject,
            projects: [mockProject],
            tracks: [],
            keyframes: {},
            player: null,
            playerState: 'paused',
            currentTimestamp: 0,
            zoom: 1,
            selectedKeyframeIds: [],
            exportDialogOpen: false,
            setCurrentTimestamp: vi.fn(),
            addKeyframe: vi.fn(),
            addTrack: vi.fn(),
            setPlayer: vi.fn(),
            setPlayerState: vi.fn(),
            setZoom: vi.fn(),
            selectKeyframe: vi.fn(),
            deselectKeyframe: vi.fn(),
            clearSelection: vi.fn(),
            setExportDialogOpen: vi.fn(),
            createProject: vi.fn(),
            loadProject: vi.fn(),
            updateProject: vi.fn(),
            deleteProject: vi.fn(),
            removeTrack: vi.fn(),
            updateKeyframe: vi.fn(),
            removeKeyframe: vi.fn(),
          } as any}
        >
          <VideoTimeline
            project={mockProject}
            tracks={[]}
            keyframes={{}}
            currentTimestamp={0}
            zoom={1}
          />
        </StudioContext.Provider>
      );

      // Check that timeline has focusable elements
      const focusableElements = container.querySelectorAll('[tabIndex]');
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should have proper ARIA attributes on timeline container', async () => {
      const { StudioContext } = await import('@/lib/context/StudioContext');
      
      const { container } = render(
        <StudioContext.Provider
          value={{
            currentProject: mockProject,
            projects: [mockProject],
            tracks: [],
            keyframes: {},
            player: null,
            playerState: 'paused',
            currentTimestamp: 0,
            zoom: 1,
            selectedKeyframeIds: [],
            exportDialogOpen: false,
            setCurrentTimestamp: vi.fn(),
            addKeyframe: vi.fn(),
            addTrack: vi.fn(),
            setPlayer: vi.fn(),
            setPlayerState: vi.fn(),
            setZoom: vi.fn(),
            selectKeyframe: vi.fn(),
            deselectKeyframe: vi.fn(),
            clearSelection: vi.fn(),
            setExportDialogOpen: vi.fn(),
            createProject: vi.fn(),
            loadProject: vi.fn(),
            updateProject: vi.fn(),
            deleteProject: vi.fn(),
            removeTrack: vi.fn(),
            updateKeyframe: vi.fn(),
            removeKeyframe: vi.fn(),
          } as any}
        >
          <VideoTimeline
            project={mockProject}
            tracks={[]}
            keyframes={{}}
            currentTimestamp={0}
            zoom={1}
          />
        </StudioContext.Provider>
      );

      // Check for ARIA attributes
      const ariaElements = container.querySelectorAll('[aria-label], [aria-describedby], [role]');
      expect(ariaElements.length).toBeGreaterThan(0);
    });
  });

  /**
   * **Feature: video-audio-track-sync, Property 12: Video keyframe uses muted video**
   * **Validates: Requirements 3.7**
   * 
   * For any video with audio added to a video track, the video keyframe should reference 
   * the muted video file URL, not the original video URL.
   */
  describe('Property 12: Video keyframe uses muted video', () => {
    it('should use muted video URL for video keyframes when video has audio', async () => {
      const { hasAudioTrack } = await import('@/lib/audioDetectionService');
      const { findAvailableAudioTrack } = await import('@/lib/trackSelectionService');
      
      // Mock hasAudioTrack to return true (video has audio)
      vi.mocked(hasAudioTrack).mockResolvedValue(true);
      
      // Mock findAvailableAudioTrack to return a track ID
      vi.mocked(findAvailableAudioTrack).mockReturnValue('audio-track-1');
      
      // Mock fetch for muted video creation and audio extraction
      global.fetch = vi.fn((url: string) => {
        if (url === '/api/video-tracks/create-muted') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ mutedVideoPath: '/results/video/test-video-muted-123.mp4' }),
          } as Response);
        } else if (url === '/api/video-tracks/extract-audio') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ audioPath: '/results/audio/test-video-audio-123.mp3' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const mockAddKeyframe = vi.fn().mockResolvedValue('keyframe-1');
      const mockAddTrack = vi.fn().mockResolvedValue('video-track-1');

      const { container } = render(
        <VideoTimeline
          project={mockProject}
          tracks={[
            {
              id: 'video-track-1',
              projectId: mockProject.id,
              type: 'video',
              label: 'Video Track',
              locked: false,
              order: 0,
            },
            {
              id: 'audio-track-1',
              projectId: mockProject.id,
              type: 'music',
              label: 'Music Track',
              locked: false,
              order: 1,
            },
          ]}
          keyframes={{}}
          currentTimestamp={0}
          zoom={1}
        />,
        {
          wrapper: await createTestWrapper(mockAddKeyframe, mockAddTrack),
        }
      );

      // Simulate dropping a video with audio
      const timeline = container.querySelector('[data-testid="video-timeline"]') || container.firstChild;
      if (timeline) {
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = {
          getData: vi.fn().mockReturnValue(JSON.stringify({
            type: 'video',
            url: '/generations/test-video.mp4',
            id: 'test-video-id',
            prompt: 'Test Video',
          })),
        };
        dropEvent.clientX = 100;
        
        timeline.dispatchEvent(dropEvent);

        // Wait for async operations
        await waitFor(() => {
          expect(mockAddKeyframe).toHaveBeenCalled();
        }, { timeout: 5000 });

        // Verify that the video keyframe was added with muted video URL
        const videoKeyframeCall = mockAddKeyframe.mock.calls.find((call: any) => 
          call[0].data.type === 'video'
        );
        
        expect(videoKeyframeCall).toBeDefined();
        expect(videoKeyframeCall[0].data.url).toContain('-muted-');
        expect(videoKeyframeCall[0].data.url).not.toBe('/generations/test-video.mp4');
        
        // Verify that audio keyframe was also added
        const audioKeyframeCall = mockAddKeyframe.mock.calls.find((call: any) => 
          call[0].data.type === 'music' || call[0].data.type === 'voiceover'
        );
        
        expect(audioKeyframeCall).toBeDefined();
        expect(audioKeyframeCall[0].data.url).toContain('-audio-');
      }
    });

    it('should use original video URL when video has no audio', async () => {
      const { hasAudioTrack } = await import('@/lib/audioDetectionService');
      
      // Mock hasAudioTrack to return false (video has no audio)
      vi.mocked(hasAudioTrack).mockResolvedValue(false);

      const mockAddKeyframe = vi.fn().mockResolvedValue('keyframe-1');
      const mockAddTrack = vi.fn().mockResolvedValue('video-track-1');

      const { container } = render(
        <VideoTimeline
          project={mockProject}
          tracks={[
            {
              id: 'video-track-1',
              projectId: mockProject.id,
              type: 'video',
              label: 'Video Track',
              locked: false,
              order: 0,
            },
          ]}
          keyframes={{}}
          currentTimestamp={0}
          zoom={1}
        />,
        {
          wrapper: await createTestWrapper(mockAddKeyframe, mockAddTrack),
        }
      );

      // Simulate dropping a video without audio
      const timeline = container.querySelector('[data-testid="video-timeline"]') || container.firstChild;
      if (timeline) {
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        dropEvent.dataTransfer = {
          getData: vi.fn().mockReturnValue(JSON.stringify({
            type: 'video',
            url: '/generations/silent-video.mp4',
            id: 'silent-video-id',
            prompt: 'Silent Video',
          })),
        };
        dropEvent.clientX = 100;
        
        timeline.dispatchEvent(dropEvent);

        // Wait for async operations
        await waitFor(() => {
          expect(mockAddKeyframe).toHaveBeenCalled();
        }, { timeout: 5000 });

        // Verify that the video keyframe was added with original video URL
        const videoKeyframeCall = mockAddKeyframe.mock.calls.find((call: any) => 
          call[0].data.type === 'video'
        );
        
        expect(videoKeyframeCall).toBeDefined();
        expect(videoKeyframeCall[0].data.url).toBe('/generations/silent-video.mp4');
        
        // Verify that no audio keyframe was added
        const audioKeyframeCall = mockAddKeyframe.mock.calls.find((call: any) => 
          call[0].data.type === 'music' || call[0].data.type === 'voiceover'
        );
        
        expect(audioKeyframeCall).toBeUndefined();
      }
    });
  });
});
