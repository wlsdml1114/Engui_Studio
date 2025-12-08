import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PATCH } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import * as fc from 'fast-check';

describe.sequential('Video Keyframes API - Property-Based Tests', () => {
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
            type: 'music',
            label: 'Test Track',
            locked: false,
            order: 0,
            volume: 100,
            muted: false,
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

  // Feature: video-resolution-audio-controls, Property 15: Keyframe volume persistence
  it('should persist keyframe volume changes to database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.integer({ min: 0, max: 200 }), { nil: null }), // keyframe volume (nullable)
        async (volume) => {
          // Create a keyframe
          const keyframe = await prisma.videoKeyFrame.create({
            data: {
              trackId: testTrackId,
              timestamp: 0,
              duration: 5000,
              dataType: 'music',
              mediaId: `media-${Date.now()}`,
              url: 'http://example.com/audio.mp3',
              volume: null, // Start with no custom volume
            },
          });

          // Update keyframe volume via API
          const request = new NextRequest(`http://localhost:3000/api/video-keyframes/${keyframe.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ volume }),
          });
          const response = await PATCH(request, { params: Promise.resolve({ id: keyframe.id }) });
          const data = await response.json();

          // Verify API response
          expect(response.status).toBe(200);
          expect(data.keyframe.volume).toBe(volume);

          // Verify persistence by loading from database
          const loadedKeyframe = await prisma.videoKeyFrame.findUnique({
            where: { id: keyframe.id },
          });

          expect(loadedKeyframe).not.toBeNull();
          expect(loadedKeyframe?.volume).toBe(volume);

          // Clean up for next iteration
          await prisma.videoKeyFrame.delete({ where: { id: keyframe.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});
