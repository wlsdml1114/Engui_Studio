import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/video-tracks/detect-audio', () => {
  it('should detect audio in video files', async () => {
    const request = new NextRequest('http://localhost:3000/api/video-tracks/detect-audio', {
      method: 'POST',
      body: JSON.stringify({
        videoPath: '/generations/test-video.mp4'
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBeLessThan(500);
    expect(data).toHaveProperty('hasAudio');
    expect(typeof data.hasAudio).toBe('boolean');
  });

  it('should return 400 if videoPath is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/video-tracks/detect-audio', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
