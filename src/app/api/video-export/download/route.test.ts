import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import * as fsPromises from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {},
  access: vi.fn(),
  readFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
  unlink: vi.fn(),
}));

describe('Video Export Download API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/video-export/download', () => {
    it('should return 400 if filename is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export/download');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('filename is required');
    });

    it('should return 400 for filename with directory traversal', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=../../../etc/passwd');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid filename');
    });

    it('should return 400 for filename with forward slash', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=subdir/file.mp4');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid filename');
    });

    it('should return 400 for filename with backslash', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=subdir\\file.mp4');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid filename');
    });

    it('should return 404 if file does not exist', async () => {
      vi.mocked(fsPromises.access).mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=nonexistent.mp4');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('File not found');
    });

    it('should successfully download mp4 file', async () => {
      const mockBuffer = Buffer.from('fake video data');
      vi.mocked(fsPromises.access).mockResolvedValue(undefined);
      vi.mocked(fsPromises.readFile).mockResolvedValue(mockBuffer);

      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=export_123.mp4');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('video/mp4');
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="export_123.mp4"');
      expect(response.headers.get('Content-Length')).toBe(mockBuffer.length.toString());

      const responseBuffer = await response.arrayBuffer();
      expect(Buffer.from(responseBuffer)).toEqual(mockBuffer);
    });

    it('should successfully download webm file', async () => {
      const mockBuffer = Buffer.from('fake webm data');
      vi.mocked(fsPromises.access).mockResolvedValue(undefined);
      vi.mocked(fsPromises.readFile).mockResolvedValue(mockBuffer);

      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=export_456.webm');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('video/webm');
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="export_456.webm"');
    });

    it('should use generic content type for unknown extensions', async () => {
      const mockBuffer = Buffer.from('fake data');
      vi.mocked(fsPromises.access).mockResolvedValue(undefined);
      vi.mocked(fsPromises.readFile).mockResolvedValue(mockBuffer);

      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=export_789.unknown');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
    });

    it('should handle file read errors gracefully', async () => {
      vi.mocked(fsPromises.access).mockResolvedValue(undefined);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Read error'));

      const request = new NextRequest('http://localhost:3000/api/video-export/download?file=export_error.mp4');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to download video');
    });
  });
});
