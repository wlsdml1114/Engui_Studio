import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { videoPath } = await request.json();

    if (!videoPath) {
      return NextResponse.json(
        { error: 'Video path is required' },
        { status: 400 }
      );
    }

    // Resolve file path
    let resolvedPath = videoPath;
    if (videoPath.startsWith('/')) {
      resolvedPath = path.join(process.cwd(), 'public', videoPath);
    } else if (!path.isAbsolute(videoPath)) {
      resolvedPath = path.join(process.cwd(), 'public', videoPath);
    }

    // Verify file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Use FFprobe to detect audio streams
    const command = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${resolvedPath}"`;

    try {
      const { stdout } = await execAsync(command, {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      });

      // If stdout contains 'audio', the video has an audio track
      const hasAudio = stdout.trim() === 'audio';
      
      console.log(`[Audio Detection] ${videoPath}: ${hasAudio ? 'has audio' : 'no audio'}`);
      
      return NextResponse.json({ hasAudio });
    } catch (error) {
      // If ffprobe fails or finds no audio stream, assume no audio
      console.log(`[Audio Detection] ${videoPath}: no audio (ffprobe failed or no stream)`);
      return NextResponse.json({ hasAudio: false });
    }
  } catch (error) {
    console.error('Error detecting audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to detect audio' },
      { status: 500 }
    );
  }
}
