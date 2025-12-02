import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { VideoPreview } from './VideoPreview';
import { VideoProject, VideoTrack, VideoKeyFrame } from '@/lib/context/StudioContext';
import * as fc from 'fast-check';
import React from 'react';

// Create mock player instance
const createMockPlayer = () => ({
  play: vi.fn(),
  pause: vi.fn(),
  seekTo: vi.fn(),
  getCurrentFrame: vi.fn(() => 0),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

let mockPlayerInstance = createMockPlayer();

// Mock Remotion modules
vi.mock('@remotion/player', () => ({
  Player: vi.fn((props: any) => {
    // Simulate ref assignment
    React.useEffect(() => {
      if (props.ref && typeof props.ref === 'object') {
        props.ref.current = mockPlayerInstance;
      }
    });
    return React.createElement('div', { 'data-testid': 'remotion-player' }, 'Player Mock');
  }),
}));

vi.mock('@remotion/preload', () => ({
  preloadVideo: vi.fn(),
  preloadImage: vi.fn(),
  preloadAudio: vi.fn(),
}));

describe('VideoPreview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayerInstance = createMockPlayer();
  });

  // Feature: video-editor-center-panel, Property 15: Player initializes on editor load
  // Validates: Requirements 4.1
  it('should initialize player when editor loads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 1000, max: 60000 }), // 1 to 60 seconds
            createdAt: fc.integer({ min: 0 }),
            updatedAt: fc.integer({ min: 0 }),
          }),
          tracks: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              projectId: fc.string({ minLength: 1 }),
              type: fc.constantFrom('video' as const, 'music' as const, 'voiceover' as const),
              label: fc.string({ minLength: 1, maxLength: 50 }),
              locked: fc.boolean(),
              order: fc.integer({ min: 0, max: 10 }),
            }),
            { maxLength: 5 }
          ),
        }),
        async ({ project, tracks }) => {
          const keyframes: Record<string, VideoKeyFrame[]> = {};
          const onPlayerReady = vi.fn();
          const onStateChange = vi.fn();
          const onTimeUpdate = vi.fn();

          render(
            <VideoPreview
              project={project}
              tracks={tracks}
              keyframes={keyframes}
              onPlayerReady={onPlayerReady}
              onStateChange={onStateChange}
              onTimeUpdate={onTimeUpdate}
            />
          );

          // Wait for player to initialize
          await waitFor(
            () => {
              expect(onPlayerReady).toHaveBeenCalled();
            },
            { timeout: 3000 }
          );

          // Verify player was initialized with a valid ref
          const playerRef = onPlayerReady.mock.calls[0][0];
          expect(playerRef).toBeDefined();
          expect(playerRef).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 4: Play button changes player state
  // Validates: Requirements 1.5
  it('should change player state when play event occurs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 1000, max: 60000 }),
            createdAt: fc.integer({ min: 0 }),
            updatedAt: fc.integer({ min: 0 }),
          }),
        }),
        async ({ project }) => {
          const tracks: VideoTrack[] = [];
          const keyframes: Record<string, VideoKeyFrame[]> = {};
          const onPlayerReady = vi.fn();
          const onStateChange = vi.fn();
          const onTimeUpdate = vi.fn();

          render(
            <VideoPreview
              project={project}
              tracks={tracks}
              keyframes={keyframes}
              onPlayerReady={onPlayerReady}
              onStateChange={onStateChange}
              onTimeUpdate={onTimeUpdate}
            />
          );

          // Wait for player to initialize
          await waitFor(() => {
            expect(onPlayerReady).toHaveBeenCalled();
          });

          const playerRef = onPlayerReady.mock.calls[0][0];

          // Simulate play event
          const playEvent = new Event('play');
          playerRef.addEventListener.mock.calls.forEach(([eventName, handler]: [string, Function]) => {
            if (eventName === 'play') {
              handler(playEvent);
            }
          });

          // Verify state change callback was called with 'playing'
          await waitFor(() => {
            expect(onStateChange).toHaveBeenCalledWith('playing');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 17: Seek updates displayed frame
  // Validates: Requirements 4.3
  it('should update displayed frame when seeking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 1000, max: 60000 }),
            createdAt: fc.integer({ min: 0 }),
            updatedAt: fc.integer({ min: 0 }),
          }),
          seekFrame: fc.integer({ min: 0, max: 1800 }), // 0 to 60 seconds at 30fps
        }),
        async ({ project, seekFrame }) => {
          const tracks: VideoTrack[] = [];
          const keyframes: Record<string, VideoKeyFrame[]> = {};
          const onPlayerReady = vi.fn();
          const onStateChange = vi.fn();
          const onTimeUpdate = vi.fn();

          render(
            <VideoPreview
              project={project}
              tracks={tracks}
              keyframes={keyframes}
              onPlayerReady={onPlayerReady}
              onStateChange={onStateChange}
              onTimeUpdate={onTimeUpdate}
            />
          );

          // Wait for player to initialize
          await waitFor(() => {
            expect(onPlayerReady).toHaveBeenCalled();
          });

          const playerRef = onPlayerReady.mock.calls[0][0];

          // Simulate seeked event
          const seekedEvent = { detail: { frame: seekFrame } };
          playerRef.addEventListener.mock.calls.forEach(([eventName, handler]: [string, Function]) => {
            if (eventName === 'seeked') {
              handler(seekedEvent);
            }
          });

          // Verify time update callback was called with correct timestamp
          const expectedTimestamp = seekFrame / 30; // FPS = 30
          await waitFor(() => {
            expect(onTimeUpdate).toHaveBeenCalledWith(expectedTimestamp);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: video-editor-center-panel, Property 18: Playback updates context timestamp
  // Validates: Requirements 4.4
  it('should update context timestamp during playback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          project: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom('16:9' as const, '9:16' as const, '1:1' as const),
            duration: fc.integer({ min: 1000, max: 60000 }),
            createdAt: fc.integer({ min: 0 }),
            updatedAt: fc.integer({ min: 0 }),
          }),
          currentFrame: fc.integer({ min: 0, max: 1800 }), // 0 to 60 seconds at 30fps
        }),
        async ({ project, currentFrame }) => {
          const tracks: VideoTrack[] = [];
          const keyframes: Record<string, VideoKeyFrame[]> = {};
          const onPlayerReady = vi.fn();
          const onStateChange = vi.fn();
          const onTimeUpdate = vi.fn();

          render(
            <VideoPreview
              project={project}
              tracks={tracks}
              keyframes={keyframes}
              onPlayerReady={onPlayerReady}
              onStateChange={onStateChange}
              onTimeUpdate={onTimeUpdate}
            />
          );

          // Wait for player to initialize
          await waitFor(() => {
            expect(onPlayerReady).toHaveBeenCalled();
          });

          const playerRef = onPlayerReady.mock.calls[0][0];

          // Simulate frameupdate event (happens during playback)
          const frameUpdateEvent = { detail: { frame: currentFrame } };
          playerRef.addEventListener.mock.calls.forEach(([eventName, handler]: [string, Function]) => {
            if (eventName === 'frameupdate') {
              handler(frameUpdateEvent);
            }
          });

          // Verify time update callback was called with correct timestamp
          const expectedTimestamp = currentFrame / 30; // FPS = 30
          await waitFor(() => {
            expect(onTimeUpdate).toHaveBeenCalledWith(expectedTimestamp);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

  describe('Accessibility Tests', () => {
    it('should have region role with aria-label', () => {
      const { container } = render(
        <VideoPreview {...defaultProps} />,
        { wrapper: TestWrapper }
      );

      const region = container.querySelector('[role="region"]');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-label', 'Video preview');
    });

    it('should have img role with descriptive aria-label on player container', () => {
      const { container } = render(
        <VideoPreview {...defaultProps} />,
        { wrapper: TestWrapper }
      );

      const imgRole = container.querySelector('[role="img"]');
      expect(imgRole).toBeInTheDocument();
      expect(imgRole).toHaveAttribute('aria-label', `Video preview for ${defaultProps.project.title}`);
    });

    it('should have alert role on error state', () => {
      const invalidProject = {
        ...defaultProps.project,
        aspectRatio: 'invalid' as any,
      };

      const { container } = render(
        <VideoPreview {...defaultProps} project={invalidProject} />,
        { wrapper: TestWrapper }
      );

      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have aria-label on retry button', () => {
      const invalidProject = {
        ...defaultProps.project,
        aspectRatio: 'invalid' as any,
      };

      render(
        <VideoPreview {...defaultProps} project={invalidProject} />,
        { wrapper: TestWrapper }
      );

      const retryButton = screen.getByRole('button', { name: /retry player initialization/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should hide decorative icons from screen readers', () => {
      const invalidProject = {
        ...defaultProps.project,
        aspectRatio: 'invalid' as any,
      };

      const { container } = render(
        <VideoPreview {...defaultProps} project={invalidProject} />,
        { wrapper: TestWrapper }
      );

      // Check that AlertCircle icon has aria-hidden
      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages for screen readers', () => {
      const invalidProject = {
        ...defaultProps.project,
        aspectRatio: 'invalid' as any,
      };

      render(
        <VideoPreview {...defaultProps} project={invalidProject} />,
        { wrapper: TestWrapper }
      );

      expect(screen.getByText('Player Initialization Failed')).toBeInTheDocument();
      expect(screen.getByText(/invalid aspect ratio/i)).toBeInTheDocument();
    });
  });
