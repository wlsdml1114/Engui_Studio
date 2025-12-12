import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Create new video keyframe
export async function POST(request: NextRequest) {
  try {
    const { trackId, timestamp, duration, dataType, mediaId, url, prompt } = await request.json();

    if (!trackId) {
      return NextResponse.json(
        { error: 'trackId is required' },
        { status: 400 }
      );
    }

    if (timestamp === undefined || timestamp === null) {
      return NextResponse.json(
        { error: 'timestamp is required' },
        { status: 400 }
      );
    }

    if (duration === undefined || duration === null) {
      return NextResponse.json(
        { error: 'duration is required' },
        { status: 400 }
      );
    }

    if (!dataType) {
      return NextResponse.json(
        { error: 'dataType is required' },
        { status: 400 }
      );
    }

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId is required' },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: 'url is required' },
        { status: 400 }
      );
    }

    // Validate dataType
    if (!['image', 'video', 'music', 'voiceover'].includes(dataType)) {
      return NextResponse.json(
        { error: 'dataType must be one of: image, video, music, voiceover' },
        { status: 400 }
      );
    }

    // Validate timestamp and duration are non-negative
    if (timestamp < 0) {
      return NextResponse.json(
        { error: 'timestamp must be non-negative' },
        { status: 400 }
      );
    }

    if (duration <= 0) {
      return NextResponse.json(
        { error: 'duration must be positive' },
        { status: 400 }
      );
    }

    // Verify track exists
    const track = await prisma.videoTrack.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return NextResponse.json(
        { error: 'Video track not found' },
        { status: 404 }
      );
    }

    // Create keyframe
    const keyframe = await prisma.videoKeyFrame.create({
      data: {
        trackId,
        timestamp,
        duration,
        dataType,
        mediaId,
        url,
        prompt: prompt || null
      }
    });

    console.log(`✅ Video keyframe created: ${keyframe.id} (${keyframe.dataType})`);

    return NextResponse.json({ keyframe });
  } catch (error) {
    console.error('❌ Video keyframe creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create video keyframe' },
      { status: 500 }
    );
  }
}
