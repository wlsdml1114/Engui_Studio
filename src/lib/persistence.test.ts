import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/prisma';
import type { AspectRatio, QualityPreset } from './resolutionConfig';
import { getResolutionConfig } from './resolutionConfig';

describe('Persistence Property Tests', () => {
  // Clean up test data before and after each test
  beforeEach(async () => {
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});
  });

  afterEach(async () => {
    await prisma.videoKeyFrame.deleteMany({});
    await prisma.videoTrack.deleteMany({});
    await prisma.videoProject.deleteMany({});
  });

  describe('Property 29: Resolution settings persistence', () => {
    // Feature: video-resolution-audio-controls, Property 29: Resolution settings persistence
    it('should persist resolution settings when creating a project', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom<AspectRatio>('16:9', '9:16'),
          fc.constantFrom<QualityPreset>('480p', '720p', '1080p'),
          async (title, aspectRatio, qualityPreset) => {
            const config = getResolutionConfig(aspectRatio, qualityPreset);

            // Create project with resolution settings
            const project = await prisma.videoProject.create({
              data: {
                title,
                aspectRatio,
                qualityPreset,
                width: config.width,
                height: config.height,
                duration: 30000,
              },
            });

            // Retrieve project from database
            const savedProject = await prisma.videoProject.findUnique({
              where: { id: project.id },
            });

            // Verify all resolution settings are persisted
            expect(savedProject).toBeDefined();
            expect(savedProject!.aspectRatio).toBe(aspectRatio);
            expect(savedProject!.qualityPreset).toBe(qualityPreset);
            expect(savedProject!.width).toBe(config.width);
            expect(savedProject!.height).toBe(config.height);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 30: Track volume persistence', () => {
    // Feature: video-resolution-audio-controls, Property 30: Track volume persistence
    it('should persist track volume settings when creating a track', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 200 }),
          fc.boolean(),
          fc.constantFrom('music', 'voiceover'),
          async (volume, muted, trackType) => {
            // Create a project first
            const project = await prisma.videoProject.create({
              data: {
                title: 'Test Project',
                duration: 30000,
              },
            });

            // Create track with volume settings
            const track = await prisma.videoTrack.create({
              data: {
                projectId: project.id,
                type: trackType,
                label: `${trackType} Track`,
                locked: false,
                order: 0,
                volume,
                muted,
              },
            });

            // Retrieve track from database
            const savedTrack = await prisma.videoTrack.findUnique({
              where: { id: track.id },
            });

            // Verify volume settings are persisted
            expect(savedTrack).toBeDefined();
            expect(savedTrack!.volume).toBe(volume);
            expect(savedTrack!.muted).toBe(muted);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 31: Keyframe settings persistence', () => {
    // Feature: video-resolution-audio-controls, Property 31: Keyframe settings persistence
    it('should persist keyframe volume and fit mode settings when creating a keyframe', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.integer({ min: 0, max: 200 })),
          fc.constantFrom('contain', 'cover', 'fill'),
          fc.constantFrom('image', 'video', 'music', 'voiceover'),
          async (volume, fitMode, dataType) => {
            // Create a project and track first
            const project = await prisma.videoProject.create({
              data: {
                title: 'Test Project',
                duration: 30000,
              },
            });

            const track = await prisma.videoTrack.create({
              data: {
                projectId: project.id,
                type: dataType === 'image' || dataType === 'video' ? 'video' : dataType,
                label: 'Test Track',
                locked: false,
                order: 0,
              },
            });

            // Create keyframe with settings
            const keyframe = await prisma.videoKeyFrame.create({
              data: {
                trackId: track.id,
                timestamp: 0,
                duration: 5000,
                dataType,
                mediaId: 'test-media-id',
                url: 'http://example.com/media.mp4',
                fitMode: dataType === 'image' || dataType === 'video' ? fitMode : null,
                volume: dataType === 'music' || dataType === 'voiceover' ? volume : null,
              },
            });

            // Retrieve keyframe from database
            const savedKeyframe = await prisma.videoKeyFrame.findUnique({
              where: { id: keyframe.id },
            });

            // Verify settings are persisted
            expect(savedKeyframe).toBeDefined();
            
            if (dataType === 'image' || dataType === 'video') {
              expect(savedKeyframe!.fitMode).toBe(fitMode);
            }
            
            if (dataType === 'music' || dataType === 'voiceover') {
              expect(savedKeyframe!.volume).toBe(volume);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 32: Settings immediate persistence', () => {
    // Feature: video-resolution-audio-controls, Property 32: Settings immediate persistence
    it('should persist setting changes immediately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 200 }),
          fc.integer({ min: 0, max: 200 }),
          async (initialVolume, newVolume) => {
            // Create a project and track
            const project = await prisma.videoProject.create({
              data: {
                title: 'Test Project',
                duration: 30000,
              },
            });

            const track = await prisma.videoTrack.create({
              data: {
                projectId: project.id,
                type: 'music',
                label: 'Music Track',
                locked: false,
                order: 0,
                volume: initialVolume,
              },
            });

            // Update the volume
            const startTime = Date.now();
            await prisma.videoTrack.update({
              where: { id: track.id },
              data: { volume: newVolume },
            });
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Retrieve track immediately
            const updatedTrack = await prisma.videoTrack.findUnique({
              where: { id: track.id },
            });

            // Verify change is persisted immediately (within reasonable time)
            expect(updatedTrack).toBeDefined();
            expect(updatedTrack!.volume).toBe(newVolume);
            // Verify it happened within a reasonable time (< 1 second)
            expect(duration).toBeLessThan(1000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 33: Settings round-trip consistency', () => {
    // Feature: video-resolution-audio-controls, Property 33: Settings round-trip consistency
    it('should maintain all settings through save and load cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ maxLength: 500 }),
            aspectRatio: fc.constantFrom<AspectRatio>('16:9', '9:16'),
            qualityPreset: fc.constantFrom<QualityPreset>('480p', '720p', '1080p'),
            duration: fc.integer({ min: 1000, max: 300000 }),
          }),
          fc.array(
            fc.record({
              type: fc.constantFrom('video', 'music', 'voiceover'),
              label: fc.string({ minLength: 1, maxLength: 50 }),
              volume: fc.integer({ min: 0, max: 200 }),
              muted: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (projectData, tracksData) => {
            const config = getResolutionConfig(projectData.aspectRatio, projectData.qualityPreset);

            // Create project with all settings
            const project = await prisma.videoProject.create({
              data: {
                title: projectData.title,
                description: projectData.description,
                aspectRatio: projectData.aspectRatio,
                qualityPreset: projectData.qualityPreset,
                width: config.width,
                height: config.height,
                duration: projectData.duration,
                tracks: {
                  create: tracksData.map((trackData, index) => ({
                    type: trackData.type,
                    label: trackData.label,
                    locked: false,
                    order: index,
                    volume: trackData.volume,
                    muted: trackData.muted,
                  })),
                },
              },
              include: {
                tracks: true,
              },
            });

            // Load project from database
            const loadedProject = await prisma.videoProject.findUnique({
              where: { id: project.id },
              include: {
                tracks: {
                  orderBy: { order: 'asc' },
                },
              },
            });

            // Verify all project settings match
            expect(loadedProject).toBeDefined();
            expect(loadedProject!.title).toBe(projectData.title);
            expect(loadedProject!.description).toBe(projectData.description);
            expect(loadedProject!.aspectRatio).toBe(projectData.aspectRatio);
            expect(loadedProject!.qualityPreset).toBe(projectData.qualityPreset);
            expect(loadedProject!.width).toBe(config.width);
            expect(loadedProject!.height).toBe(config.height);
            expect(loadedProject!.duration).toBe(projectData.duration);

            // Verify all track settings match
            expect(loadedProject!.tracks).toHaveLength(tracksData.length);
            loadedProject!.tracks.forEach((track, index) => {
              expect(track.type).toBe(tracksData[index].type);
              expect(track.label).toBe(tracksData[index].label);
              expect(track.volume).toBe(tracksData[index].volume);
              expect(track.muted).toBe(tracksData[index].muted);
              expect(track.order).toBe(index);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
