import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import * as remotionBundler from '@remotion/bundler';
import * as remotionRenderer from '@remotion/renderer';
import * as fsPromises from 'fs/promises';
import type { AspectRatio, QualityPreset } from '@/lib/resolutionConfig';

// Mock Remotion modules
vi.mock('@remotion/bundler', () => ({
  bundle: vi.fn(),
}));

vi.mock('@remotion/renderer', () => ({
  selectComposition: vi.fn(),
  renderMedia: vi.fn(),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {},
  mkdir: vi.fn(),
  rm: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
  readFile: vi.fn(),
}));

describe.sequential('Video Export API Routes', () => {
  let testProject: any;

  beforeEach(async () => {
    // Clean up test data
    await prisma.videoProject.deleteMany({});

    // Create a test project with tracks and keyframes
    testProject = await prisma.videoProject.create({
      data: {
        title: 'Test Export Project',
        description: 'Project for export testing',
        aspectRatio: '16:9',
        duration: 10000,
        tracks: {
          create: [
            {
              type: 'video',
              label: 'Video Track',
              locked: true,
              order: 0,
              keyframes: {
                create: [
                  {
                    timestamp: 0,
                    duration: 5000,
                    dataType: 'video',
                    mediaId: 'video-1',
                    url: 'http://example.com/video.mp4',
                  },
                ],
              },
            },
            {
              type: 'music',
              label: 'Audio Track',
              locked: true,
              order: 1,
              keyframes: {
                create: [
                  {
                    timestamp: 0,
                    duration: 10000,
                    dataType: 'music',
                    mediaId: 'audio-1',
                    url: 'http://example.com/audio.mp3',
                  },
                ],
              },
            },
          ],
        },
      },
    });

    // Setup default mocks
    vi.mocked(remotionBundler.bundle).mockResolvedValue('/tmp/bundle');
    vi.mocked(remotionRenderer.selectComposition).mockResolvedValue({
      id: 'MainComposition',
      width: 1024,
      height: 576,
      fps: 30,
      durationInFrames: 300,
      defaultProps: {},
    } as any);
    vi.mocked(remotionRenderer.renderMedia).mockResolvedValue(undefined);
    vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
    vi.mocked(fsPromises.rm).mockResolvedValue(undefined);
    vi.mocked(fsPromises.unlink).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await prisma.videoProject.deleteMany({});
    vi.clearAllMocks();
  });

  describe('POST /api/video-export', () => {
    it('should return 400 if projectId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PROJECT_ID');
      expect(data.error.message).toBe('projectId is required and must be a string');
    });

    it('should return 400 if projectId is not a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: 123 }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PROJECT_ID');
    });

    it('should return 404 if project does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'non-existent-id' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('PROJECT_NOT_FOUND');
      expect(data.error.message).toBe('Video project not found');
    });

    it('should return 400 if project has no content', async () => {
      // Create empty project
      const emptyProject = await prisma.videoProject.create({
        data: {
          title: 'Empty Project',
          duration: 30000,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: emptyProject.id }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EMPTY_PROJECT');
      expect(data.error.message).toContain('Cannot export empty project');
    });

    it('should return 400 for invalid format', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProject.id,
          options: { format: 'avi' },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_FORMAT');
      expect(data.error.message).toBe('format must be either mp4 or webm');
    });

    it('should return 400 for invalid quality', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProject.id,
          options: { quality: 'ultra' },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_QUALITY');
      expect(data.error.message).toBe('quality must be one of: low, medium, high');
    });

    it('should return 400 for invalid resolution', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProject.id,
          options: { resolution: '4k' },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_RESOLUTION');
      expect(data.error.message).toBe('resolution must be one of: original, 720p, 1080p');
    });

    it('should successfully export video with default options', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProject.id }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.downloadUrl).toBeDefined();
      expect(data.filename).toBeDefined();
      expect(data.exportId).toBeDefined();
      expect(data.filename).toMatch(/^export_.*\.mp4$/);

      // Verify Remotion functions were called
      expect(remotionBundler.bundle).toHaveBeenCalled();
      expect(remotionRenderer.selectComposition).toHaveBeenCalled();
      expect(remotionRenderer.renderMedia).toHaveBeenCalled();

      // Verify cleanup was called
      expect(fsPromises.rm).toHaveBeenCalledWith('/tmp/bundle', { recursive: true, force: true });
    });

    it('should successfully export video with custom options', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProject.id,
          options: {
            format: 'webm',
            quality: 'high',
            resolution: '1080p',
          },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.filename).toMatch(/^export_.*\.webm$/);

      // Verify renderMedia was called with correct codec
      const renderCall = vi.mocked(remotionRenderer.renderMedia).mock.calls[0][0];
      expect(renderCall.codec).toBe('vp8');
      expect(renderCall.videoBitrate).toBe('5M');
    });

    it('should use correct codec settings for mp4 format', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProject.id,
          options: {
            format: 'mp4',
            quality: 'low',
          },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);

      const renderCall = vi.mocked(remotionRenderer.renderMedia).mock.calls[0][0];
      expect(renderCall.codec).toBe('h264');
      expect(renderCall.crf).toBe(28);
    });

    it('should handle bundling errors gracefully', async () => {
      vi.mocked(remotionBundler.bundle).mockRejectedValue(new Error('Bundle failed'));

      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProject.id }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EXPORT_FAILED');
      expect(data.error.message).toBe('Failed to export video');
      expect(data.error.details).toContain('Bundle failed');
    });

    it('should handle rendering errors gracefully', async () => {
      vi.mocked(remotionRenderer.renderMedia).mockRejectedValue(new Error('Render failed'));

      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProject.id }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('EXPORT_FAILED');
      expect(data.error.details).toContain('Render failed');

      // Verify cleanup was attempted
      expect(fsPromises.rm).toHaveBeenCalled();
    });

    it('should clean up bundle on error', async () => {
      vi.mocked(remotionRenderer.selectComposition).mockRejectedValue(new Error('Composition error'));

      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProject.id }),
      });
      await POST(request);

      // Verify cleanup was called
      expect(fsPromises.rm).toHaveBeenCalledWith('/tmp/bundle', { recursive: true, force: true });
    });

    it('should pass correct input props to composition', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProject.id }),
      });
      await POST(request);

      const selectCall = vi.mocked(remotionRenderer.selectComposition).mock.calls[0][0];
      expect(selectCall.inputProps).toBeDefined();
      expect(selectCall.inputProps.project).toBeDefined();
      expect(selectCall.inputProps.project.id).toBe(testProject.id);
      expect(selectCall.inputProps.tracks).toHaveLength(2);
      expect(selectCall.inputProps.keyframes).toBeDefined();
    });

    it('should create output directory if it does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProject.id }),
      });
      await POST(request);

      expect(fsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('public/exports'),
        { recursive: true }
      );
    });

    it('should handle different aspect ratios correctly', async () => {
      // Create project with 9:16 aspect ratio
      const verticalProject = await prisma.videoProject.create({
        data: {
          title: 'Vertical Project',
          aspectRatio: '9:16',
          duration: 10000,
          tracks: {
            create: [
              {
                type: 'video',
                label: 'Video Track',
                locked: true,
                order: 0,
                keyframes: {
                  create: [
                    {
                      timestamp: 0,
                      duration: 5000,
                      dataType: 'video',
                      mediaId: 'video-1',
                      url: 'http://example.com/video.mp4',
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const request = new NextRequest('http://localhost:3000/api/video-export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: verticalProject.id,
          options: { resolution: '1080p' },
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      // The composition should be selected with correct dimensions
      expect(remotionRenderer.selectComposition).toHaveBeenCalled();
    });

    // Feature: video-resolution-audio-controls, Property 16: Export uses project resolution
    // Validates: Requirements 9.1
    it('should use project resolution in export for all valid resolution configurations', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom<AspectRatio>('16:9', '9:16'),
          fc.constantFrom<QualityPreset>('480p', '720p', '1080p'),
          fc.integer({ min: 100, max: 2000 }),
          fc.integer({ min: 100, max: 2000 }),
          async (aspectRatio, qualityPreset, width, height) => {
            // Create a test project with specific resolution
            const project = {
              id: 'test-project',
              title: 'Test Project',
              description: 'Test',
              aspectRatio,
              qualityPreset,
              width,
              height,
              duration: 10000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const tracks = [
              {
                id: 'track-1',
                projectId: project.id,
                type: 'video',
                label: 'Video Track',
                locked: true,
                order: 0,
                volume: 100,
                muted: false,
              },
            ];

            const keyframes = {
              'track-1': [
                {
                  id: 'kf-1',
                  trackId: 'track-1',
                  timestamp: 0,
                  duration: 5000,
                  data: {
                    type: 'video',
                    mediaId: 'video-1',
                    url: 'http://example.com/video.mp4',
                  },
                },
              ],
            };

            const request = new NextRequest('http://localhost:3000/api/video-export', {
              method: 'POST',
              body: JSON.stringify({
                project,
                tracks,
                keyframes,
                options: { format: 'mp4' },
              }),
            });

            const response = await POST(request);
            const data = await response.json();

            // Verify export succeeded
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify selectComposition was called with correct metadata
            const selectCall = vi.mocked(remotionRenderer.selectComposition).mock.calls[
              vi.mocked(remotionRenderer.selectComposition).mock.calls.length - 1
            ][0];
            
            expect(selectCall.inputProps.project.width).toBe(width);
            expect(selectCall.inputProps.project.height).toBe(height);
            expect(selectCall.inputProps.project.aspectRatio).toBe(aspectRatio);
            expect(selectCall.inputProps.project.qualityPreset).toBe(qualityPreset);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: video-resolution-audio-controls, Property 17: Export reflects track volume
    // Validates: Requirements 9.2
    it('should pass track volume settings to composition for all valid volume values', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 200 }),
          async (trackVolume) => {
            const project = {
              id: 'test-project',
              title: 'Test Project',
              description: 'Test',
              aspectRatio: '16:9' as AspectRatio,
              qualityPreset: '720p' as QualityPreset,
              width: 1280,
              height: 720,
              duration: 10000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const tracks = [
              {
                id: 'audio-track-1',
                projectId: project.id,
                type: 'music',
                label: 'Music Track',
                locked: true,
                order: 0,
                volume: trackVolume,
                muted: false,
              },
            ];

            const keyframes = {
              'audio-track-1': [
                {
                  id: 'kf-1',
                  trackId: 'audio-track-1',
                  timestamp: 0,
                  duration: 5000,
                  data: {
                    type: 'music',
                    mediaId: 'audio-1',
                    url: 'http://example.com/audio.mp3',
                  },
                },
              ],
            };

            const request = new NextRequest('http://localhost:3000/api/video-export', {
              method: 'POST',
              body: JSON.stringify({
                project,
                tracks,
                keyframes,
                options: { format: 'mp4' },
              }),
            });

            const response = await POST(request);
            const data = await response.json();

            // Verify export succeeded
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify track volume is passed to composition
            const selectCall = vi.mocked(remotionRenderer.selectComposition).mock.calls[
              vi.mocked(remotionRenderer.selectComposition).mock.calls.length - 1
            ][0];
            
            expect(selectCall.inputProps.tracks).toHaveLength(1);
            expect(selectCall.inputProps.tracks[0].volume).toBe(trackVolume);
            expect(selectCall.inputProps.tracks[0].type).toBe('music');
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: video-resolution-audio-controls, Property 18: Export reflects keyframe volume
    // Validates: Requirements 9.3
    it('should pass keyframe volume settings to composition for all valid volume values', () => {
      fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 200 }),
          fc.option(fc.integer({ min: 0, max: 200 }), { nil: null }),
          async (trackVolume, keyframeVolume) => {
            const project = {
              id: 'test-project',
              title: 'Test Project',
              description: 'Test',
              aspectRatio: '16:9' as AspectRatio,
              qualityPreset: '720p' as QualityPreset,
              width: 1280,
              height: 720,
              duration: 10000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const tracks = [
              {
                id: 'audio-track-1',
                projectId: project.id,
                type: 'music',
                label: 'Music Track',
                locked: true,
                order: 0,
                volume: trackVolume,
                muted: false,
              },
            ];

            const keyframes = {
              'audio-track-1': [
                {
                  id: 'kf-1',
                  trackId: 'audio-track-1',
                  timestamp: 0,
                  duration: 5000,
                  data: {
                    type: 'music',
                    mediaId: 'audio-1',
                    url: 'http://example.com/audio.mp3',
                    volume: keyframeVolume,
                  },
                },
              ],
            };

            const request = new NextRequest('http://localhost:3000/api/video-export', {
              method: 'POST',
              body: JSON.stringify({
                project,
                tracks,
                keyframes,
                options: { format: 'mp4' },
              }),
            });

            const response = await POST(request);
            const data = await response.json();

            // Verify export succeeded
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify keyframe volume is passed to composition
            const selectCall = vi.mocked(remotionRenderer.selectComposition).mock.calls[
              vi.mocked(remotionRenderer.selectComposition).mock.calls.length - 1
            ][0];
            
            const exportedKeyframes = selectCall.inputProps.keyframes['audio-track-1'];
            expect(exportedKeyframes).toHaveLength(1);
            expect(exportedKeyframes[0].data.volume).toBe(keyframeVolume);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: video-resolution-audio-controls, Property 19: Export excludes muted tracks
    // Validates: Requirements 9.4
    it('should pass muted state to composition for all tracks', () => {
      fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.integer({ min: 0, max: 200 }),
          async (muted, trackVolume) => {
            const project = {
              id: 'test-project',
              title: 'Test Project',
              description: 'Test',
              aspectRatio: '16:9' as AspectRatio,
              qualityPreset: '720p' as QualityPreset,
              width: 1280,
              height: 720,
              duration: 10000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const tracks = [
              {
                id: 'audio-track-1',
                projectId: project.id,
                type: 'music',
                label: 'Music Track',
                locked: true,
                order: 0,
                volume: trackVolume,
                muted,
              },
            ];

            const keyframes = {
              'audio-track-1': [
                {
                  id: 'kf-1',
                  trackId: 'audio-track-1',
                  timestamp: 0,
                  duration: 5000,
                  data: {
                    type: 'music',
                    mediaId: 'audio-1',
                    url: 'http://example.com/audio.mp3',
                  },
                },
              ],
            };

            const request = new NextRequest('http://localhost:3000/api/video-export', {
              method: 'POST',
              body: JSON.stringify({
                project,
                tracks,
                keyframes,
                options: { format: 'mp4' },
              }),
            });

            const response = await POST(request);
            const data = await response.json();

            // Verify export succeeded
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify muted state is passed to composition
            const selectCall = vi.mocked(remotionRenderer.selectComposition).mock.calls[
              vi.mocked(remotionRenderer.selectComposition).mock.calls.length - 1
            ][0];
            
            expect(selectCall.inputProps.tracks).toHaveLength(1);
            expect(selectCall.inputProps.tracks[0].muted).toBe(muted);
            
            // The composition will handle muted tracks by setting volume to 0
            // This is tested in the audioMixing tests
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: video-resolution-audio-controls, Property 20: Export reflects fit mode
    // Validates: Requirements 9.5
    it('should pass fit mode settings to composition for all valid fit modes', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('contain', 'cover', 'fill'),
          async (fitMode) => {
            const project = {
              id: 'test-project',
              title: 'Test Project',
              description: 'Test',
              aspectRatio: '16:9' as AspectRatio,
              qualityPreset: '720p' as QualityPreset,
              width: 1280,
              height: 720,
              duration: 10000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const tracks = [
              {
                id: 'video-track-1',
                projectId: project.id,
                type: 'video',
                label: 'Video Track',
                locked: true,
                order: 0,
                volume: 100,
                muted: false,
              },
            ];

            const keyframes = {
              'video-track-1': [
                {
                  id: 'kf-1',
                  trackId: 'video-track-1',
                  timestamp: 0,
                  duration: 5000,
                  data: {
                    type: 'video',
                    mediaId: 'video-1',
                    url: 'http://example.com/video.mp4',
                    fitMode,
                  },
                },
              ],
            };

            const request = new NextRequest('http://localhost:3000/api/video-export', {
              method: 'POST',
              body: JSON.stringify({
                project,
                tracks,
                keyframes,
                options: { format: 'mp4' },
              }),
            });

            const response = await POST(request);
            const data = await response.json();

            // Verify export succeeded
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify fit mode is passed to composition
            const selectCall = vi.mocked(remotionRenderer.selectComposition).mock.calls[
              vi.mocked(remotionRenderer.selectComposition).mock.calls.length - 1
            ][0];
            
            const exportedKeyframes = selectCall.inputProps.keyframes['video-track-1'];
            expect(exportedKeyframes).toHaveLength(1);
            expect(exportedKeyframes[0].data.fitMode).toBe(fitMode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
