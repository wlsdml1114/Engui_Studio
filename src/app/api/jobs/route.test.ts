import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { prisma } from '@/lib/prisma';

/**
 * Feature: job-input-reuse, Property 4: Media path storage
 * 
 * For any job created with media inputs, the system should store 
 * the file paths in the job record's options field
 * 
 * Validates: Requirements 2.1, 2.2, 2.3
 */
describe('Property 4: Media path storage', () => {
  // Clean up test data after each test
  afterEach(async () => {
    await prisma.job.deleteMany({
      where: {
        userId: { startsWith: 'test-user-' }
      }
    });
  });

  it('should store image, video, and audio input paths in job records', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random job data with media paths
        fc.record({
          userId: fc.string({ minLength: 5, maxLength: 20 }).map(s => `test-user-${s}`),
          type: fc.constantFrom('image', 'video', 'audio'),
          status: fc.constantFrom('queued', 'processing', 'completed', 'failed'),
          prompt: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: null }),
          modelId: fc.constantFrom('flux-krea', 'wan-animate', 'qwen-image-edit', 'infinite-talk'),
          imageInputPath: fc.option(
            fc.constantFrom(
              '/public/uploads/test-image-1.png',
              '/public/uploads/test-image-2.jpg',
              '/public/results/input-test.png'
            ),
            { nil: null }
          ),
          videoInputPath: fc.option(
            fc.constantFrom(
              '/public/uploads/test-video-1.mp4',
              '/public/uploads/test-video-2.mov',
              '/public/results/input-test.mp4'
            ),
            { nil: null }
          ),
          audioInputPath: fc.option(
            fc.constantFrom(
              '/public/uploads/test-audio-1.mp3',
              '/public/uploads/test-audio-2.wav',
              '/public/results/input-test.mp3'
            ),
            { nil: null }
          ),
        }),
        async (jobData) => {
          // Create a job with media input paths
          const createdJob = await prisma.job.create({
            data: {
              userId: jobData.userId,
              type: jobData.type,
              status: jobData.status,
              prompt: jobData.prompt,
              modelId: jobData.modelId,
              imageInputPath: jobData.imageInputPath,
              videoInputPath: jobData.videoInputPath,
              audioInputPath: jobData.audioInputPath,
            }
          });

          // Retrieve the job from the database
          const retrievedJob = await prisma.job.findUnique({
            where: { id: createdJob.id }
          });

          // Verify the job was created
          expect(retrievedJob).not.toBeNull();
          
          if (retrievedJob) {
            // Property: Media paths should be stored and retrievable
            expect(retrievedJob.imageInputPath).toBe(jobData.imageInputPath);
            expect(retrievedJob.videoInputPath).toBe(jobData.videoInputPath);
            expect(retrievedJob.audioInputPath).toBe(jobData.audioInputPath);
            
            // Additional verification: if a path was provided, it should be stored
            if (jobData.imageInputPath !== null) {
              expect(retrievedJob.imageInputPath).toBeTruthy();
              expect(retrievedJob.imageInputPath).toBe(jobData.imageInputPath);
            }
            
            if (jobData.videoInputPath !== null) {
              expect(retrievedJob.videoInputPath).toBeTruthy();
              expect(retrievedJob.videoInputPath).toBe(jobData.videoInputPath);
            }
            
            if (jobData.audioInputPath !== null) {
              expect(retrievedJob.audioInputPath).toBeTruthy();
              expect(retrievedJob.audioInputPath).toBe(jobData.audioInputPath);
            }
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in the design
    );
  });
});
