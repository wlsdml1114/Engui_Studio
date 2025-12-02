import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe.sequential('Video Tracks API Routes - POST', () => {
  let testProjectId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});

    // Create a test project
    const project = await prisma.videoProject.create({
      data: {
        title: 'Test Project',
        duration: 30000,
      },
    });
    testProjectId = project.id;
  });

  afterEach(async () => {
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});
  });

  describe('POST /api/video-tracks', () => {
    it('should return 400 if projectId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({ type: 'video' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('projectId is required');
    });

    it('should return 400 if type is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({ projectId: testProjectId }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('type is required');
    });

    it('should return 400 for invalid track type', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProjectId,
          type: 'invalid-type',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('type must be one of: video, music, voiceover');
    });

    it('should return 404 if project does not exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'non-existent-id',
          type: 'video',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video project not found');
    });

    it('should create video track with minimal data', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProjectId,
          type: 'video',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.track).toBeDefined();
      expect(data.track.projectId).toBe(testProjectId);
      expect(data.track.type).toBe('video');
      expect(data.track.label).toBe('video track');
      expect(data.track.locked).toBe(true);
      expect(data.track.order).toBe(0);
      expect(data.track.id).toBeDefined();
    });

    it('should create music track', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProjectId,
          type: 'music',
          label: 'Background Music',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.track.type).toBe('music');
      expect(data.track.label).toBe('Background Music');
    });

    it('should create voiceover track', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProjectId,
          type: 'voiceover',
          label: 'Narration',
          locked: false,
          order: 2,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.track.type).toBe('voiceover');
      expect(data.track.label).toBe('Narration');
      expect(data.track.locked).toBe(false);
      expect(data.track.order).toBe(2);
    });

    it('should create track with all fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-tracks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: testProjectId,
          type: 'video',
          label: 'Main Video',
          locked: false,
          order: 1,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.track.projectId).toBe(testProjectId);
      expect(data.track.type).toBe('video');
      expect(data.track.label).toBe('Main Video');
      expect(data.track.locked).toBe(false);
      expect(data.track.order).toBe(1);
    });
  });
});
