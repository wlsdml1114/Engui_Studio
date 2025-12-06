// src/app/api/lora/[id]/route.error.test.ts
// Unit tests for error scenarios in LoRA delete API

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('LoRA Delete API - Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Deletion Failure Handling', () => {
    it('should handle S3 deletion failure but continue with database deletion', async () => {
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

      // Mock S3 deletion failure
      const mockDeleteFile = vi.fn().mockRejectedValue(new Error('S3 connection error'));
      vi.mocked(S3Service).mockImplementation(function(this: any) {
        this.deleteFile = mockDeleteFile;
        return this;
      } as any);

      const request = new Request('http://localhost/api/lora/lora-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'lora-123' } });
      const data = await response.json();

      // Should succeed with warning
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.warning).toBeDefined();
      expect(data.warning).toContain('S3 deletion failed');

      // Database deletion should still have been called
      expect(prisma.loRA.delete).toHaveBeenCalledWith({ where: { id: 'lora-123' } });
    });

    it('should fail when database deletion fails', async () => {
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
      vi.mocked(prisma.loRA.delete).mockRejectedValue(new Error('Database constraint violation'));

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

      // Should fail
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle both S3 and database deletion failures', async () => {
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

      // Should fail with database error (primary failure)
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle LoRA not found', async () => {
      vi.mocked(prisma.loRA.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/lora/nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');

      // S3 and database delete should not have been called
      expect(S3Service).not.toHaveBeenCalled();
      expect(prisma.loRA.delete).not.toHaveBeenCalled();
    });

    it('should handle missing ID parameter', async () => {
      const request = new Request('http://localhost/api/lora/', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('LoRA ID is required');
    });
  });

  describe('Network Error Handling', () => {
    it('should handle S3 network timeout', async () => {
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

      const mockDeleteFile = vi.fn().mockRejectedValue(new Error('Request timeout'));
      vi.mocked(S3Service).mockImplementation(function(this: any) {
        this.deleteFile = mockDeleteFile;
        return this;
      } as any);

      const request = new Request('http://localhost/api/lora/lora-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'lora-123' } });
      const data = await response.json();

      // Should succeed with warning (database deletion succeeded)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.warning).toBeDefined();
    });

    it('should handle database connection timeout', async () => {
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
      vi.mocked(prisma.loRA.delete).mockRejectedValue(
        new Error('Connection to database timed out')
      );

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

      // Should fail
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle database query error when finding LoRA', async () => {
      vi.mocked(prisma.loRA.findUnique).mockRejectedValue(
        new Error('Database query failed')
      );

      const request = new Request('http://localhost/api/lora/lora-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request as any, { params: { id: 'lora-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Partial Failure Scenarios', () => {
    it('should log warning when S3 succeeds but database fails', async () => {
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

      // Should fail (database is primary)
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      // S3 deletion should have been attempted
      expect(mockDeleteFile).toHaveBeenCalled();
    });

    it('should succeed with warning when database succeeds but S3 fails', async () => {
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

      // Should succeed with warning
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.warning).toBeDefined();
      expect(data.warning).toContain('S3 deletion failed');
    });
  });
});
