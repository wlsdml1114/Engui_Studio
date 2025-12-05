import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import * as fc from 'fast-check';

describe('Generate API Route - Media Path Storage', () => {
  afterEach(async () => {
    // Clean up test jobs
    await prisma.job.deleteMany({
      where: {
        userId: { startsWith: 'test-user-' }
      }
    });
  });

  describe('Job creation with media paths', () => {
    it('should store image input path in job record', async () => {
      // Create a job directly with image input path
      const job = await prisma.job.create({
        data: {
          userId: 'test-user-image',
          type: 'image',
          status: 'processing',
          modelId: 'flux-krea',
          prompt: 'A beautiful sunset',
          imageInputPath: '/results/image_test-uuid_test-image.png',
          videoInputPath: null,
          audioInputPath: null,
        }
      });

      // Verify job was created with image input path
      const retrievedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(retrievedJob).not.toBeNull();
      expect(retrievedJob?.imageInputPath).toBe('/results/image_test-uuid_test-image.png');
      expect(retrievedJob?.videoInputPath).toBeNull();
      expect(retrievedJob?.audioInputPath).toBeNull();
    });

    it('should store video input path in job record', async () => {
      // Create a job directly with video input path
      const job = await prisma.job.create({
        data: {
          userId: 'test-user-video',
          type: 'video',
          status: 'processing',
          modelId: 'wan-animate',
          prompt: 'Animate this video',
          imageInputPath: null,
          videoInputPath: '/results/video_test-uuid_test-video.mp4',
          audioInputPath: null,
        }
      });

      // Verify job was created with video input path
      const retrievedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(retrievedJob).not.toBeNull();
      expect(retrievedJob?.videoInputPath).toBe('/results/video_test-uuid_test-video.mp4');
      expect(retrievedJob?.imageInputPath).toBeNull();
      expect(retrievedJob?.audioInputPath).toBeNull();
    });

    it('should store audio input path in job record', async () => {
      // Create a job directly with audio input path
      const job = await prisma.job.create({
        data: {
          userId: 'test-user-audio',
          type: 'audio',
          status: 'processing',
          modelId: 'infinite-talk',
          prompt: 'Generate speech',
          imageInputPath: null,
          videoInputPath: null,
          audioInputPath: '/results/audio_test-uuid_test-audio.mp3',
        }
      });

      // Verify job was created with audio input path
      const retrievedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(retrievedJob).not.toBeNull();
      expect(retrievedJob?.audioInputPath).toBe('/results/audio_test-uuid_test-audio.mp3');
      expect(retrievedJob?.imageInputPath).toBeNull();
      expect(retrievedJob?.videoInputPath).toBeNull();
    });

    it('should store multiple media input paths in job record', async () => {
      // Create a job directly with multiple media input paths
      const job = await prisma.job.create({
        data: {
          userId: 'test-user-multi',
          type: 'image',
          status: 'processing',
          modelId: 'qwen-image-edit',
          prompt: 'Edit this image',
          imageInputPath: '/results/image_test-uuid_test.png',
          videoInputPath: '/results/video_test-uuid_test.mp4',
          audioInputPath: null,
        }
      });

      // Verify job was created with both media input paths
      const retrievedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(retrievedJob).not.toBeNull();
      expect(retrievedJob?.imageInputPath).toBe('/results/image_test-uuid_test.png');
      expect(retrievedJob?.videoInputPath).toBe('/results/video_test-uuid_test.mp4');
      expect(retrievedJob?.audioInputPath).toBeNull();
    });

    it('should handle jobs without media inputs (text-only)', async () => {
      // Create a job directly without media input paths
      const job = await prisma.job.create({
        data: {
          userId: 'test-user-text-only',
          type: 'image',
          status: 'processing',
          modelId: 'flux-krea',
          prompt: 'Generate an image from text',
          imageInputPath: null,
          videoInputPath: null,
          audioInputPath: null,
        }
      });

      // Verify job was created without media input paths
      const retrievedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(retrievedJob).not.toBeNull();
      expect(retrievedJob?.imageInputPath).toBeNull();
      expect(retrievedJob?.videoInputPath).toBeNull();
      expect(retrievedJob?.audioInputPath).toBeNull();
    });

    it('should store all three media input paths when all are provided', async () => {
      // Create a job with all three media input paths
      const job = await prisma.job.create({
        data: {
          userId: 'test-user-all-media',
          type: 'video',
          status: 'processing',
          modelId: 'test-model',
          prompt: 'Test with all media types',
          imageInputPath: '/results/image_test.png',
          videoInputPath: '/results/video_test.mp4',
          audioInputPath: '/results/audio_test.mp3',
        }
      });

      // Verify all paths are stored correctly
      const retrievedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });

      expect(retrievedJob).not.toBeNull();
      expect(retrievedJob?.imageInputPath).toBe('/results/image_test.png');
      expect(retrievedJob?.videoInputPath).toBe('/results/video_test.mp4');
      expect(retrievedJob?.audioInputPath).toBe('/results/audio_test.mp3');
    });
  });
});

describe('Property-Based Tests for Conditional Input Storage', () => {
  afterEach(async () => {
    // Clean up test jobs
    await prisma.job.deleteMany({
      where: {
        userId: { startsWith: 'pbt-user-' }
      }
    });
  });

  /**
   * **Feature: job-input-reuse, Property 8: Conditional input storage**
   * 
   * Property: For any job created with a model that has conditional inputs,
   * all conditional input values should be stored in the job record's options field.
   * 
   * **Validates: Requirements 5.1**
   */
  it('Property 8: should store all conditional input values in job options', async () => {
    // Generator for conditional parameter values
    const conditionalParamsGen = fc.record({
      // Parent parameter that controls visibility
      input_type: fc.constantFrom('image', 'video'),
      person_count: fc.constantFrom('single', 'multi'),
      mode: fc.constantFrom('replace', 'animate'),
      
      // Conditional parameters that depend on parent values
      audio2_start: fc.string({ minLength: 0, maxLength: 10 }),
      audio2_end: fc.string({ minLength: 0, maxLength: 10 }),
      points_store: fc.string({ minLength: 0, maxLength: 50 }),
      coordinates: fc.string({ minLength: 0, maxLength: 100 }),
      neg_coordinates: fc.string({ minLength: 0, maxLength: 100 }),
      
      // Other parameters
      width: fc.integer({ min: 256, max: 2048 }),
      height: fc.integer({ min: 256, max: 2048 }),
      steps: fc.integer({ min: 1, max: 50 }),
      seed: fc.integer({ min: 0, max: 999999 }),
    });

    await fc.assert(
      fc.asyncProperty(conditionalParamsGen, async (params) => {
        // Create a job with conditional parameters
        const job = await prisma.job.create({
          data: {
            userId: 'pbt-user-conditional',
            type: 'video',
            status: 'processing',
            modelId: 'infinite-talk',
            prompt: 'Test conditional inputs',
            options: JSON.stringify(params),
            imageInputPath: null,
            videoInputPath: null,
            audioInputPath: null,
          }
        });

        // Retrieve the job
        const retrievedJob = await prisma.job.findUnique({
          where: { id: job.id },
        });

        // Verify job exists
        expect(retrievedJob).not.toBeNull();
        
        // Parse options
        const storedOptions = JSON.parse(retrievedJob!.options || '{}');

        // Verify ALL conditional parameters are stored, regardless of visibility
        expect(storedOptions.input_type).toBe(params.input_type);
        expect(storedOptions.person_count).toBe(params.person_count);
        expect(storedOptions.mode).toBe(params.mode);
        
        // Verify dependent parameters are stored
        expect(storedOptions.audio2_start).toBe(params.audio2_start);
        expect(storedOptions.audio2_end).toBe(params.audio2_end);
        expect(storedOptions.points_store).toBe(params.points_store);
        expect(storedOptions.coordinates).toBe(params.coordinates);
        expect(storedOptions.neg_coordinates).toBe(params.neg_coordinates);
        
        // Verify other parameters
        expect(storedOptions.width).toBe(params.width);
        expect(storedOptions.height).toBe(params.height);
        expect(storedOptions.steps).toBe(params.steps);
        expect(storedOptions.seed).toBe(params.seed);

        // Clean up
        await prisma.job.delete({ where: { id: job.id } });
      }),
      { numRuns: 100 }
    );
  });
});
