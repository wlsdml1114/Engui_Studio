import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, PATCH, DELETE } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe.sequential('Video Projects [id] API Routes', () => {
  let testProjectId: string;

  beforeEach(async () => {
    // Clean up first to ensure isolation
    await prisma.videoProject.deleteMany({});
    
    // Create a test project before each test
    const project = await prisma.videoProject.create({
      data: {
        title: 'Test Project',
        description: 'Test Description',
        aspectRatio: '16:9',
        duration: 30000,
      },
    });
    testProjectId = project.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.videoProject.deleteMany({});
  });

  describe('GET /api/video-projects/[id]', () => {
    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects/non-existent-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video project not found');
    });

    it('should return project with tracks and keyframes', async () => {
      // Add tracks and keyframes to the test project
      await prisma.videoTrack.create({
        data: {
          projectId: testProjectId,
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
                mediaId: 'media-1',
                url: 'http://example.com/video.mp4',
              },
            ],
          },
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`);
      const response = await GET(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project).toBeDefined();
      expect(data.project.id).toBe(testProjectId);
      expect(data.project.title).toBe('Test Project');
      expect(data.project.tracks).toHaveLength(1);
      expect(data.project.tracks[0].keyframes).toHaveLength(1);
    });

    it('should return tracks ordered by order field', async () => {
      // Create multiple tracks with different order values
      await prisma.videoTrack.createMany({
        data: [
          { projectId: testProjectId, type: 'video', label: 'Track 3', locked: true, order: 2 },
          { projectId: testProjectId, type: 'music', label: 'Track 1', locked: true, order: 0 },
          { projectId: testProjectId, type: 'voiceover', label: 'Track 2', locked: true, order: 1 },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`);
      const response = await GET(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project.tracks).toHaveLength(3);
      expect(data.project.tracks[0].label).toBe('Track 1');
      expect(data.project.tracks[1].label).toBe('Track 2');
      expect(data.project.tracks[2].label).toBe('Track 3');
    });

    it('should return keyframes ordered by timestamp', async () => {
      const track = await prisma.videoTrack.create({
        data: {
          projectId: testProjectId,
          type: 'video',
          label: 'Video Track',
          locked: true,
          order: 0,
        },
      });

      // Create keyframes with different timestamps
      await prisma.videoKeyFrame.createMany({
        data: [
          { trackId: track.id, timestamp: 10000, duration: 5000, dataType: 'video', mediaId: 'm3', url: 'url3' },
          { trackId: track.id, timestamp: 0, duration: 5000, dataType: 'video', mediaId: 'm1', url: 'url1' },
          { trackId: track.id, timestamp: 5000, duration: 5000, dataType: 'video', mediaId: 'm2', url: 'url2' },
        ],
      });

      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`);
      const response = await GET(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project.tracks[0].keyframes).toHaveLength(3);
      expect(data.project.tracks[0].keyframes[0].timestamp).toBe(0);
      expect(data.project.tracks[0].keyframes[1].timestamp).toBe(5000);
      expect(data.project.tracks[0].keyframes[2].timestamp).toBe(10000);
    });
  });

  describe('PATCH /api/video-projects/[id]', () => {
    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects/non-existent-id', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video project not found');
    });

    it('should update project title', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project.title).toBe('Updated Title');
      expect(data.project.description).toBe('Test Description'); // Unchanged
    });

    it('should update multiple fields', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'New Title',
          description: 'New Description',
          aspectRatio: '1:1',
          duration: 60000,
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project.title).toBe('New Title');
      expect(data.project.description).toBe('New Description');
      expect(data.project.aspectRatio).toBe('1:1');
      expect(data.project.duration).toBe(60000);
    });

    it('should return 400 for invalid aspectRatio', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ aspectRatio: '4:3' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('aspectRatio must be one of: 16:9, 9:16, 1:1');
    });

    it('should return 400 for invalid duration', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ duration: -1000 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be a positive number');
    });

    it('should allow partial updates', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: 'Only description updated' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project.title).toBe('Test Project'); // Unchanged
      expect(data.project.description).toBe('Only description updated');
    });
  });

  describe('DELETE /api/video-projects/[id]', () => {
    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects/non-existent-id', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Video project not found');
    });

    it('should delete project successfully', async () => {
      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: testProjectId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify project is deleted
      const deletedProject = await prisma.videoProject.findUnique({
        where: { id: testProjectId },
      });
      expect(deletedProject).toBeNull();
    });

    it('should cascade delete tracks and keyframes', async () => {
      // Create track with keyframes
      const track = await prisma.videoTrack.create({
        data: {
          projectId: testProjectId,
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
                mediaId: 'media-1',
                url: 'http://example.com/video.mp4',
              },
            ],
          },
        },
      });

      const request = new NextRequest(`http://localhost:3000/api/video-projects/${testProjectId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: testProjectId }) });

      expect(response.status).toBe(200);

      // Verify tracks are deleted
      const deletedTracks = await prisma.videoTrack.findMany({
        where: { projectId: testProjectId },
      });
      expect(deletedTracks).toHaveLength(0);

      // Verify keyframes are deleted
      const deletedKeyframes = await prisma.videoKeyFrame.findMany({
        where: { trackId: track.id },
      });
      expect(deletedKeyframes).toHaveLength(0);
    });
  });
});
