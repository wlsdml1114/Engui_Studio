import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe.sequential('Video Keyframes API Routes - POST', () => {
  let testProjectId: string;
  let testTrackId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});

    // Create a test project with a track
    const project = await prisma.videoProject.create({
      data: {
        title: 'Test Project',
        duration: 30000,
        tracks: {
          create: {
            type: 'video',
            label: 'Test Track',
            locked: true,
            order: 0,
          },
        },
      },
      include: {
        tracks: true,
      },
    });
    testProjectId = project.id;
    testTrackId = project.tracks[0].id;
  });

  afterEach(async () => {
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});
  });

  describe('POST /api/video-keyframes', () => {
    it('should return 400 if trackId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('trackId is required');
    });

    it('should return 400 if timestamp is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('timestamp is required');
    });

    it('should return 400 if duration is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration is required');
    });

    it('should return 400 if dataType is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('dataType is required');
    });

    it('should return 400 if mediaId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('mediaId is required');
    });

    it('should return 400 if url is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('url is required');
    });

    it('should return 400 for invalid dataType', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          dataType: 'invalid-type',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('dataType must be one of: image, video, music, voiceover');
    });

    it('should return 400 for negative timestamp', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: -100,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('timestamp must be non-negative');
    });

    it('should return 400 for zero duration', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 0,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be positive');
    });

    it('should return 400 for negative duration', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: -1000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be positive');
    });

    it('should return 404 if track does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: 'non-existent-id',
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video track not found');
    });

    it('should create video keyframe with minimal data', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe).toBeDefined();
      expect(data.keyframe.trackId).toBe(testTrackId);
      expect(data.keyframe.timestamp).toBe(0);
      expect(data.keyframe.duration).toBe(5000);
      expect(data.keyframe.dataType).toBe('video');
      expect(data.keyframe.mediaId).toBe('media-1');
      expect(data.keyframe.url).toBe('http://example.com/video.mp4');
      expect(data.keyframe.prompt).toBeNull();
      expect(data.keyframe.id).toBeDefined();
    });

    it('should create image keyframe', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 5000,
          duration: 3000,
          dataType: 'image',
          mediaId: 'media-2',
          url: 'http://example.com/image.jpg',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.dataType).toBe('image');
      expect(data.keyframe.timestamp).toBe(5000);
      expect(data.keyframe.duration).toBe(3000);
    });

    it('should create music keyframe', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 30000,
          dataType: 'music',
          mediaId: 'media-3',
          url: 'http://example.com/music.mp3',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.dataType).toBe('music');
    });

    it('should create voiceover keyframe', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 1000,
          duration: 8000,
          dataType: 'voiceover',
          mediaId: 'media-4',
          url: 'http://example.com/voice.mp3',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.dataType).toBe('voiceover');
    });

    it('should create keyframe with prompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
          prompt: 'A beautiful sunset',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.prompt).toBe('A beautiful sunset');
    });

    it('should accept timestamp of 0', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes', {
        method: 'POST',
        body: JSON.stringify({
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.timestamp).toBe(0);
    });
  });
});
