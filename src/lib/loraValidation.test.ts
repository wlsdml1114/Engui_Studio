// src/lib/loraValidation.test.ts

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateLoRAFile, validateLoRAFileClient, validateLoRAFileServer } from './loraValidation';

describe('LoRA File Validation', () => {
  describe('Unit Tests', () => {
    it('should accept .safetensors files', () => {
      const file = { name: 'model.safetensors', size: 1024 };
      expect(validateLoRAFile(file).valid).toBe(true);
    });

    it('should accept .ckpt files', () => {
      const file = { name: 'model.ckpt', size: 1024 };
      expect(validateLoRAFile(file).valid).toBe(true);
    });

    it('should reject files with invalid extensions', () => {
      const file = { name: 'model.txt', size: 1024 };
      const result = validateLoRAFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject files over 5GB', () => {
      const file = { name: 'model.safetensors', size: 6 * 1024 * 1024 * 1024 };
      const result = validateLoRAFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should accept files exactly at 5GB', () => {
      const file = { name: 'model.safetensors', size: 5 * 1024 * 1024 * 1024 };
      expect(validateLoRAFile(file).valid).toBe(true);
    });

    it('should handle case-insensitive extensions', () => {
      const file1 = { name: 'model.SAFETENSORS', size: 1024 };
      const file2 = { name: 'model.CkPt', size: 1024 };
      expect(validateLoRAFile(file1).valid).toBe(true);
      expect(validateLoRAFile(file2).valid).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: lora-management, Property 1: File extension validation
     * Validates: Requirements 1.2, 6.1
     */
    it('Property 1: should only accept .safetensors or .ckpt extensions', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.oneof(
            fc.constant('.safetensors'),
            fc.constant('.ckpt'),
            fc.constant('.SAFETENSORS'),
            fc.constant('.CKPT'),
            fc.string({ minLength: 1, maxLength: 10 }).map(s => '.' + s)
          ),
          fc.integer({ min: 1, max: 5 * 1024 * 1024 * 1024 }),
          (name, ext, size) => {
            const fileName = name + ext;
            const result = validateLoRAFile({ name: fileName, size });

            const normalizedExt = ext.toLowerCase();
            const isValidExt = normalizedExt === '.safetensors' || normalizedExt === '.ckpt';

            if (isValidExt) {
              // Valid extensions should pass (unless size is too large)
              return result.valid || (result.error?.includes('exceeds') ?? false);
            } else {
              // Invalid extensions should fail with extension error
              return !result.valid && (result.error?.includes('Invalid file extension') ?? false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: lora-management, Property 2: File size validation
     * Validates: Requirements 1.2, 6.2
     */
    it('Property 2: should reject files exceeding 5GB', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.oneof(fc.constant('.safetensors'), fc.constant('.ckpt')),
          fc.integer({ min: 0, max: 10 * 1024 * 1024 * 1024 }), // 0 to 10GB
          (name, ext, size) => {
            const fileName = name + ext;
            const result = validateLoRAFile({ name: fileName, size });

            const MAX_SIZE = 5 * 1024 * 1024 * 1024;

            if (size > MAX_SIZE) {
              // Files over 5GB should be rejected
              return !result.valid && (result.error?.includes('exceeds') ?? false);
            } else {
              // Files at or under 5GB should be accepted
              return result.valid;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Client-side validation', () => {
    it('should validate File objects', () => {
      const file = new File(['content'], 'model.safetensors', { type: 'application/octet-stream' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = validateLoRAFileClient(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('Server-side validation', () => {
    it('should add server context to error messages', () => {
      const result = validateLoRAFileServer('model.txt', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Server validation failed');
    });

    it('should validate valid files', () => {
      const result = validateLoRAFileServer('model.safetensors', 1024);
      expect(result.valid).toBe(true);
    });
  });
});
