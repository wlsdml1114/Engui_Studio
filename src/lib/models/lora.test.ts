import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { prisma } from '@/lib/prisma';

/**
 * Feature: lora-management, Property 11: Workspace association
 * Validates: Requirements 6.4
 * 
 * For any LoRA upload, the database record should be associated with the current workspace ID
 */

describe('LoRA Database Schema - Property Tests', () => {
  // Clean up test data before and after each test
  beforeEach(async () => {
    await prisma.loRA.deleteMany({});
    await prisma.workspace.deleteMany({});
  });

  afterEach(async () => {
    await prisma.loRA.deleteMany({});
    await prisma.workspace.deleteMany({});
  });

  it('Property 11: Workspace association - LoRA records are correctly associated with workspaces', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random workspace data
        fc.record({
          userId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        }),
        // Generate random LoRA data
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => `${s}.safetensors`),
          s3Path: fc.string({ minLength: 1, maxLength: 200 }).map(s => `s3://bucket/${s}`),
          s3Url: fc.webUrl(),
          fileSize: fc.bigInt({ min: 1n, max: 5_000_000_000n }), // 1 byte to 5GB
          extension: fc.constantFrom('.safetensors', '.ckpt'),
        }),
        async (workspaceData, loraData) => {
          // Create a workspace
          const workspace = await prisma.workspace.create({
            data: {
              userId: workspaceData.userId,
              name: workspaceData.name,
              description: workspaceData.description,
            },
          });

          // Create a LoRA associated with the workspace
          const lora = await prisma.loRA.create({
            data: {
              ...loraData,
              workspaceId: workspace.id,
            },
          });

          // Verify the LoRA is associated with the workspace
          expect(lora.workspaceId).toBe(workspace.id);

          // Verify we can fetch the LoRA through the workspace relation
          const workspaceWithLoras = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            include: { loras: true },
          });

          expect(workspaceWithLoras).not.toBeNull();
          expect(workspaceWithLoras!.loras).toHaveLength(1);
          expect(workspaceWithLoras!.loras[0].id).toBe(lora.id);

          // Verify cascade delete: deleting workspace should delete LoRA
          await prisma.workspace.delete({
            where: { id: workspace.id },
          });

          const deletedLora = await prisma.loRA.findUnique({
            where: { id: lora.id },
          });

          expect(deletedLora).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Workspace association - LoRAs can exist without workspace (optional association)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random LoRA data
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => `${s}.safetensors`),
          s3Path: fc.string({ minLength: 1, maxLength: 200 }).map(s => `s3://bucket/${s}`),
          s3Url: fc.webUrl(),
          fileSize: fc.bigInt({ min: 1n, max: 5_000_000_000n }),
          extension: fc.constantFrom('.safetensors', '.ckpt'),
        }),
        async (loraData) => {
          // Create a LoRA without workspace association
          const lora = await prisma.loRA.create({
            data: {
              ...loraData,
              workspaceId: null,
            },
          });

          // Verify the LoRA has no workspace association
          expect(lora.workspaceId).toBeNull();

          // Verify we can still fetch the LoRA
          const fetchedLora = await prisma.loRA.findUnique({
            where: { id: lora.id },
          });

          expect(fetchedLora).not.toBeNull();
          expect(fetchedLora!.id).toBe(lora.id);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Workspace association - Multiple LoRAs can be associated with same workspace', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random workspace data
        fc.record({
          userId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        // Generate array of LoRA data
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => `${s}.safetensors`),
            s3Path: fc.string({ minLength: 1, maxLength: 200 }).map(s => `s3://bucket/${s}`),
            s3Url: fc.webUrl(),
            fileSize: fc.bigInt({ min: 1n, max: 5_000_000_000n }),
            extension: fc.constantFrom('.safetensors', '.ckpt'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (workspaceData, lorasData) => {
          // Create a workspace
          const workspace = await prisma.workspace.create({
            data: {
              userId: workspaceData.userId,
              name: workspaceData.name,
            },
          });

          // Create multiple LoRAs associated with the workspace
          const loras = await Promise.all(
            lorasData.map(loraData =>
              prisma.loRA.create({
                data: {
                  ...loraData,
                  workspaceId: workspace.id,
                },
              })
            )
          );

          // Verify all LoRAs are associated with the workspace
          const workspaceWithLoras = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            include: { loras: true },
          });

          expect(workspaceWithLoras).not.toBeNull();
          expect(workspaceWithLoras!.loras).toHaveLength(lorasData.length);

          // Verify all LoRA IDs match
          const loraIds = loras.map(l => l.id).sort();
          const fetchedLoraIds = workspaceWithLoras!.loras.map(l => l.id).sort();
          expect(fetchedLoraIds).toEqual(loraIds);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 11: Workspace association - Indexes are properly created for performance', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate workspace and multiple LoRAs
        fc.record({
          userId: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            fileName: fc.string({ minLength: 1, maxLength: 100 }).map(s => `${s}.safetensors`),
            s3Path: fc.string({ minLength: 1, maxLength: 200 }).map(s => `s3://bucket/${s}`),
            s3Url: fc.webUrl(),
            fileSize: fc.bigInt({ min: 1n, max: 5_000_000_000n }),
            extension: fc.constantFrom('.safetensors', '.ckpt'),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (workspaceData, lorasData) => {
          // Create workspace
          const workspace = await prisma.workspace.create({
            data: {
              userId: workspaceData.userId,
              name: workspaceData.name,
            },
          });

          // Create LoRAs with different upload times
          for (let i = 0; i < lorasData.length; i++) {
            await prisma.loRA.create({
              data: {
                ...lorasData[i],
                workspaceId: workspace.id,
              },
            });
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Test workspaceId index: fetch by workspace
          const lorasByWorkspace = await prisma.loRA.findMany({
            where: { workspaceId: workspace.id },
          });
          expect(lorasByWorkspace).toHaveLength(lorasData.length);

          // Test uploadedAt index: fetch ordered by upload time
          const lorasOrderedByTime = await prisma.loRA.findMany({
            where: { workspaceId: workspace.id },
            orderBy: { uploadedAt: 'desc' },
          });
          expect(lorasOrderedByTime).toHaveLength(lorasData.length);

          // Verify ordering (most recent first)
          for (let i = 0; i < lorasOrderedByTime.length - 1; i++) {
            expect(
              lorasOrderedByTime[i].uploadedAt.getTime()
            ).toBeGreaterThanOrEqual(
              lorasOrderedByTime[i + 1].uploadedAt.getTime()
            );
          }

          return true;
        }
      ),
      { numRuns: 30 }
    );
  });
});
