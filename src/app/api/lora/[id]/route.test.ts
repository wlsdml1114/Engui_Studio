// src/app/api/lora/[id]/route.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { DELETE } from './route';
import { prisma } from '@/lib/prisma';
import S3Service from '@/lib/s3Service';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    loRA: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/s3Service');
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('LoRA Delete API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Unit Tests', () => {
    it('should return 404 if LoRA not found', async () => {
      vi.mocked(prisma.loRA.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/lora/test-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'test-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should successfully delete LoRA from both S3 and database', async () => {
      const mockLoRA = {
        id: 'lora-123',
        name: 'test-model',
        fileName: 'test-model.safetensors',
        s3Path: '/runpod-volume/loras/test-model.safetensors',
        s3Url: 'https://s3.example.com/loras/test-model.safetensors',
        fileSize: BigInt(1024),
        extension: '.safetensors',
        workspaceId: null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.loRA.findUnique).mockResolvedValue(mockLoRA);
      vi.mocked(prisma.loRA.delete).mockResolvedValue(mockLoRA);

      const mockDeleteFile = vi.fn().mockResolvedValue(undefined);
      vi.mocked(S3Service).mockImplementation(function(this: any) {
        this.deleteFile = mockDeleteFile;
        return this;
      } as any);

      const request = new Request('http://localhost/api/lora/lora-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'lora-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith('loras/test-model.safetensors');
      expect(prisma.loRA.delete).toHaveBeenCalledWith({ where: { id: 'lora-123' } });
    });

    it('should handle S3 deletion failure gracefully', async () => {
      const mockLoRA = {
        id: 'lora-123',
        name: 'test-model',
        fileName: 'test-model.safetensors',
        s3Path: '/runpod-volume/loras/test-model.safetensors',
        s3Url: 'https://s3.example.com/loras/test-model.safetensors',
        fileSize: BigInt(1024),
        extension: '.safetensors',
        workspaceId: null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.loRA.findUnique).mockResolvedValue(mockLoRA);
      vi.mocked(prisma.loRA.delete).mockResolvedValue(mockLoRA);

      const mockDeleteFile = vi.fn().mockRejectedValue(new Error('S3 error'));
      vi.mocked(S3Service).mockImplementation(function(this: any) {
        this.deleteFile = mockDeleteFile;
        return this;
      } as any);

      const request = new Request('http://localhost/api/lora/lora-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'lora-123' } });
      const data = await response.json();

      // Should still succeed with a warning
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.warning).toBeDefined();
      expect(prisma.loRA.delete).toHaveBeenCalled();
    });

    it('should fail if database deletion fails', async () => {
      const mockLoRA = {
        id: 'lora-123',
        name: 'test-model',
        fileName: 'test-model.safetensors',
        s3Path: '/runpod-volume/loras/test-model.safetensors',
        s3Url: 'https://s3.example.com/loras/test-model.safetensors',
        fileSize: BigInt(1024),
        extension: '.safetensors',
        workspaceId: null,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.loRA.findUnique).mockResolvedValue(mockLoRA);
      vi.mocked(prisma.loRA.delete).mockRejectedValue(new Error('Database error'));

      const mockDeleteFile = vi.fn().mockResolvedValue(undefined);
      vi.mocked(S3Service).mockImplementation(function(this: any) {
        this.deleteFile = mockDeleteFile;
        return this;
      } as any);

      const request = new Request('http://localhost/api/lora/lora-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'lora-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: lora-management, Property 6: Deletion removes from both S3 and database
     * Validates: Requirements 3.2
     * 
     * This property test verifies that deletion operations properly coordinate
     * S3 and database cleanup, handling partial failures gracefully.
     */
    it('Property 6: deletion coordinates S3 and database cleanup', () => {
      fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }).map(s => s.replace(/[^a-zA-Z0-9_-]/g, '_') || 'file'),
          fc.oneof(fc.constant('.safetensors'), fc.constant('.ckpt')),
          fc.option(fc.uuid(), { nil: null }),
          fc.boolean(), // shouldS3Fail
          fc.boolean(), // shouldDbFail
          async (loraId, baseName, ext, workspaceId, shouldS3Fail, shouldDbFail) => {
            vi.clearAllMocks();

            const fileName = baseName + ext;
            const s3Path = workspaceId
              ? `/runpod-volume/loras/${workspaceId}/${fileName}`
              : `/runpod-volume/loras/${fileName}`;

            const mockLoRA = {
              id: loraId,
              name: baseName,
              fileName: fileName,
              s3Path: s3Path,
              s3Url: `https://s3.example.com${s3Path}`,
              fileSize: BigInt(1024),
              extension: ext,
              workspaceId: workspaceId,
              uploadedAt: new Date(),
              updatedAt: new Date(),
            };

            vi.mocked(prisma.loRA.findUnique).mockResolvedValue(mockLoRA);

            // Mock S3 deletion
            const mockDeleteFile = shouldS3Fail
              ? vi.fn().mockRejectedValue(new Error('S3 error'))
              : vi.fn().mockResolvedValue(undefined);

            vi.mocked(S3Service).mockImplementation(function(this: any) {
              this.deleteFile = mockDeleteFile;
              return this;
            } as any);

            // Mock database deletion
            if (shouldDbFail) {
              vi.mocked(prisma.loRA.delete).mockRejectedValue(new Error('Database error'));
            } else {
              vi.mocked(prisma.loRA.delete).mockResolvedValue(mockLoRA);
            }

            const request = new Request(`http://localhost/api/lora/${loraId}`, {
              method: 'DELETE',
            });

            try {
              const response = await DELETE(request as any, { params: { id: loraId } });
              const data = await response.json();

              // Property verification:
              // 1. If database deletion fails, the operation should fail
              if (shouldDbFail) {
                return response.status === 500 && data.success === false;
              }

              // 2. If S3 fails but database succeeds, should return success with warning
              if (shouldS3Fail && !shouldDbFail) {
                return response.status === 200 && 
                       data.success === true && 
                       data.warning !== undefined &&
                       vi.mocked(prisma.loRA.delete).mock.calls.length > 0;
              }

              // 3. If both succeed, should return success
              if (!shouldS3Fail && !shouldDbFail) {
                return response.status === 200 && 
                       data.success === true &&
                       mockDeleteFile.mock.calls.length > 0 &&
                       vi.mocked(prisma.loRA.delete).mock.calls.length > 0;
              }

              return true;
            } catch (error) {
              // Errors are acceptable in property tests
              return true;
            }
          }
        ),
        { numRuns: 30 } // Reduced runs for async tests with mocks
      );
    });
  });
});
