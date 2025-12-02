import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PATCH, DELETE } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe.sequential('Video Keyframes API Routes - PATCH and DELETE', () => {
  let testProjectId: string;
  let testTrackId: string;
  let testKeyframeId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});

    // Create a test project with a track and keyframe
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
            keyframes: {
              create: {
                timestamp: 0,
                duration: 5000,
                dataType: 'video',
                mediaId: 'media-1',
                url: 'http://example.com/video.mp4',
              },
            },
          },
        },
      },
      include: {
        tracks: {
          include: {
            keyframes: true,
          },
        },
      },
    });
    testProjectId = project.id;
    testTrackId = project.tracks[0].id;
    testKeyframeId = project.tracks[0].keyframes[0].id;
  });

  afterEach(async () => {
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});
  });

  describe('PATCH /api/video-keyframes/[id]', () => {
    it('should return 404 if keyframe does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes/non-existent-id', {
        method: 'PATCH',
        body: JSON.stringify({ timestamp: 1000 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video keyframe not found');
    });

    it('should update timestamp', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ timestamp: 2000 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.timestamp).toBe(2000);
      expect(data.keyframe.duration).toBe(5000); // unchanged
    });

    it('should update duration', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ duration: 8000 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.duration).toBe(8000);
      expect(data.keyframe.timestamp).toBe(0); // unchanged
    });

    it('should update dataType', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ dataType: 'image' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.dataType).toBe('image');
    });

    it('should update mediaId', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ mediaId: 'new-media-id' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.mediaId).toBe('new-media-id');
    });

    it('should update url', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ url: 'http://example.com/new-video.mp4' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.url).toBe('http://example.com/new-video.mp4');
    });

    it('should update prompt', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ prompt: 'Updated prompt' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.prompt).toBe('Updated prompt');
    });

    it('should update multiple fields at once', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          timestamp: 3000,
          duration: 7000,
          dataType: 'image',
          prompt: 'New prompt',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.timestamp).toBe(3000);
      expect(data.keyframe.duration).toBe(7000);
      expect(data.keyframe.dataType).toBe('image');
      expect(data.keyframe.prompt).toBe('New prompt');
    });

    it('should return 400 for invalid dataType', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ dataType: 'invalid-type' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('dataType must be one of: image, video, music, voiceover');
    });

    it('should return 400 for negative timestamp', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ timestamp: -100 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('timestamp must be non-negative');
    });

    it('should return 400 for zero duration', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ duration: 0 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be positive');
    });

    it('should return 400 for negative duration', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ duration: -1000 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be positive');
    });

    it('should allow timestamp of 0', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ timestamp: 0 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keyframe.timestamp).toBe(0);
    });
  });

  describe('DELETE /api/video-keyframes/[id]', () => {
    it('should return 404 if keyframe does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-keyframes/non-existent-id');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video keyframe not found');
    });

    it('should delete keyframe successfully', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`);
      const response = await DELETE(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify keyframe is deleted
      const deletedKeyframe = await prisma.videoKeyFrame.findUnique({
        where: { id: testKeyframeId },
      });
      expect(deletedKeyframe).toBeNull();
    });

    it('should not affect track when keyframe is deleted', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${testKeyframeId}`);
      const response = await DELETE(request, { params: Promise.resolve({ id: testKeyframeId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify track still exists
      const track = await prisma.videoTrack.findUnique({
        where: { id: testTrackId },
      });
      expect(track).not.toBeNull();
    });
  });
});
