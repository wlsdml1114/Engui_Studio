import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { loadFileFromPath } from './fileUtils';

describe('File Utils - Media File Loading', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.resetAllMocks();
  });

  // **Feature: job-input-reuse, Property 3: Media file loading**
  // **Validates: Requirements 1.5, 2.4, 2.5, 2.6**
  it('should load all media file types (image, video, audio) from paths', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          path: fc.constantFrom(
            '/public/uploads/test-image.png',
            '/public/uploads/test-image.jpg',
            '/public/uploads/test-video.mp4',
            '/public/uploads/test-video.webm',
            '/public/uploads/test-audio.mp3',
            '/public/uploads/test-audio.wav'
          ),
          content: fc.uint8Array({ minLength: 100, maxLength: 1000 }),
        }),
        async ({ path, content }) => {
          // Mock successful fetch response
          const mockBlob = new Blob([content], { type: getMimeTypeFromExtension(path) });
          global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => mockBlob,
          });

          // Load file from path
          const file = await loadFileFromPath(path);

          // Verify file was loaded successfully
          expect(file).not.toBeNull();
          expect(file).toBeInstanceOf(File);
          
          if (file) {
            // Verify file properties
            expect(file.name).toBe(path.split('/').pop());
            expect(file.size).toBeGreaterThan(0);
            expect(file.type).toBe(getMimeTypeFromExtension(path));
          }

          // Verify fetch was called with correct path
          expect(global.fetch).toHaveBeenCalledWith(path);
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Feature: job-input-reuse, Property 6: Async file loading**
  // **Validates: Requirements 4.3**
  it('should load files asynchronously without blocking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            path: fc.constantFrom(
              '/public/uploads/image1.png',
              '/public/uploads/image2.jpg',
              '/public/uploads/video1.mp4'
            ),
            content: fc.uint8Array({ minLength: 100, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (files) => {
          // Mock fetch with delay to simulate async loading
          global.fetch = vi.fn().mockImplementation(async (path) => {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const file = files.find(f => f.path === path);
            if (!file) {
              return { ok: false, status: 404 };
            }

            const mockBlob = new Blob([file.content], { 
              type: getMimeTypeFromExtension(path as string) 
            });
            
            return {
              ok: true,
              blob: async () => mockBlob,
            };
          });

          // Load all files concurrently
          const startTime = Date.now();
          const loadPromises = files.map(f => loadFileFromPath(f.path));
          const loadedFiles = await Promise.all(loadPromises);
          const endTime = Date.now();

          // Verify all files were loaded
          expect(loadedFiles).toHaveLength(files.length);
          loadedFiles.forEach((file, index) => {
            expect(file).not.toBeNull();
            if (file) {
              expect(file.name).toBe(files[index].path.split('/').pop());
            }
          });

          // Verify loading was async (concurrent loading should be faster than sequential)
          // With 10ms delay per file, concurrent should be ~10ms, sequential would be ~10ms * count
          const maxExpectedTime = 50 + (files.length * 5); // Allow some overhead
          expect(endTime - startTime).toBeLessThan(maxExpectedTime);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle file loading errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/public/uploads/nonexistent.png',
          '/public/uploads/invalid.mp4',
          '/invalid/path/file.jpg'
        ),
        async (path) => {
          // Mock failed fetch response
          global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });

          // Load file from path
          const file = await loadFileFromPath(path);

          // Verify null is returned on error
          expect(file).toBeNull();

          // Verify fetch was called
          expect(global.fetch).toHaveBeenCalledWith(path);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle network errors gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }),
        async (path) => {
          // Mock network error
          global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

          // Load file from path
          const file = await loadFileFromPath(path);

          // Verify null is returned on error
          expect(file).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Helper function to get MIME type from file extension
function getMimeTypeFromExtension(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}
