import { NextRequest, NextResponse } from 'next/server';
import { ffmpegService } from '@/lib/ffmpegService';

/**
 * POST /api/video-tracks/extract-audio
 * Extract audio from a video file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoPath } = body;

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    // Extract audio using FFmpeg service
    const audioPath = await ffmpegService.extractAudioFromVideo(videoPath);

    return NextResponse.json({ audioPath });
  } catch (error) {
    console.error('Error extracting audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract audio' },
      { status: 500 }
    );
  }
}
