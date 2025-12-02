import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DELETE } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe.sequential('Video Tracks API Routes - DELETE', () => {
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

  describe('DELETE /api/video-tracks/[id]', () => {
    it('should return 404 if track does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks/non-existent-id');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video track not found');
    });

    it('should delete track successfully', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-tracks/${testTrackId}`);
      const response = await DELETE(request, { params: Promise.resolve({ id: testTrackId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify track is deleted
      const deletedTrack = await prisma.videoTrack.findUnique({
        where: { id: testTrackId },
      });
      expect(deletedTrack).toBeNull();
    });

    it('should cascade delete keyframes when track is deleted', async () => {
      // Create keyframes for the track
      const keyframe1 = await prisma.videoKeyFrame.create({
        data: {
          trackId: testTrackId,
          timestamp: 0,
          duration: 5000,
          dataType: 'video',
          mediaId: 'media-1',
          url: 'http://example.com/video.mp4',
        },
      });

      const keyframe2 = await prisma.videoKeyFrame.create({
        data: {
          trackId: testTrackId,
          timestamp: 5000,
          duration: 3000,
          dataType: 'image',
          mediaId: 'media-2',
          url: 'http://example.com/image.jpg',
        },
      });

      // Delete the track
      const request = new NextRequest(`http://localhost:3000/api/video-tracks/${testTrackId}`);
      const response = await DELETE(request, { params: Promise.resolve({ id: testTrackId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify keyframes are also deleted
      const deletedKeyframe1 = await prisma.videoKeyFrame.findUnique({
        where: { id: keyframe1.id },
      });
      const deletedKeyframe2 = await prisma.videoKeyFrame.findUnique({
        where: { id: keyframe2.id },
      });

      expect(deletedKeyframe1).toBeNull();
      expect(deletedKeyframe2).toBeNull();
    });
  });
});
