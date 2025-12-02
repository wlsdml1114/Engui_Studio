import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

describe.sequential('Video Projects API Routes', () => {
  // Clean up test data before and after each test
  beforeEach(async () => {
    await prisma.videoProject.deleteMany({});
  });

  afterEach(async () => {
    await prisma.videoProject.deleteMany({});
  });

  describe('GET /api/video-projects', () => {
    it('should return 400 if userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('userId is required');
    });

    it('should return empty array when no projects exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects?userId=test-user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toEqual([]);
    });

    it('should return all projects with tracks and keyframes', async () => {
      // Create test project with tracks and keyframes
      const project = await prisma.videoProject.create({
        data: {
          title: 'Test Project',
          description: 'Test Description',
          aspectRatio: '16:9',
          duration: 30000,
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
                      mediaId: 'media-1',
                      url: 'http://example.com/video.mp4',
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const request = new NextRequest('http://localhost:3000/api/video-projects?userId=test-user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toHaveLength(1);
      expect(data.projects[0].id).toBe(project.id);
      expect(data.projects[0].title).toBe('Test Project');
      expect(data.projects[0].tracks).toHaveLength(1);
      expect(data.projects[0].tracks[0].keyframes).toHaveLength(1);
    });

    it('should return projects ordered by updatedAt desc', async () => {
      // Create multiple projects
      const project1 = await prisma.videoProject.create({
        data: { title: 'Project 1', duration: 30000 },
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const project2 = await prisma.videoProject.create({
        data: { title: 'Project 2', duration: 30000 },
      });

      const request = new NextRequest('http://localhost:3000/api/video-projects?userId=test-user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.projects).toHaveLength(2);
      // Most recently updated should be first
      expect(data.projects[0].id).toBe(project2.id);
      expect(data.projects[1].id).toBe(project1.id);
    });
  });

  describe('POST /api/video-projects', () => {
    it('should return 400 if title is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('title is required');
    });

    it('should create project with minimal data', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Project' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project).toBeDefined();
      expect(data.project.title).toBe('New Project');
      expect(data.project.description).toBe('');
      expect(data.project.aspectRatio).toBe('16:9');
      expect(data.project.duration).toBe(30000);
      expect(data.project.id).toBeDefined();
    });

    it('should create project with all fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Full Project',
          description: 'A complete project',
          aspectRatio: '9:16',
          duration: 60000,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.project.title).toBe('Full Project');
      expect(data.project.description).toBe('A complete project');
      expect(data.project.aspectRatio).toBe('9:16');
      expect(data.project.duration).toBe(60000);
    });

    it('should return 400 for invalid aspectRatio', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Invalid Project',
          aspectRatio: '4:3',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('aspectRatio must be one of: 16:9, 9:16, 1:1');
    });

    it('should return 400 for invalid duration (negative)', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Invalid Project',
          duration: -1000,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be a positive number');
    });

    it('should return 400 for invalid duration (zero)', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Invalid Project',
          duration: 0,
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be a positive number');
    });

    it('should return 400 for non-numeric duration', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-projects', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Invalid Project',
          duration: 'not-a-number',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('duration must be a positive number');
    });
  });
});
