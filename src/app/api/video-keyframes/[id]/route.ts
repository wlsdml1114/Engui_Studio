import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Update video keyframe
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyframeId } = await params;
    const { timestamp, duration, dataType, mediaId, url, prompt } = await request.json();

    const keyframe = await prisma.videoKeyFrame.findUnique({
      where: { id: keyframeId }
    });

    if (!keyframe) {
      return NextResponse.json({ error: 'Video keyframe not found' }, { status: 404 });
    }

    // Validate dataType if provided
    if (dataType && !['image', 'video', 'music', 'voiceover'].includes(dataType)) {
      return NextResponse.json(
        { error: 'dataType must be one of: image, video, music, voiceover' },
        { status: 400 }
      );
    }

    // Validate timestamp if provided
    if (timestamp !== undefined && timestamp < 0) {
      return NextResponse.json(
        { error: 'timestamp must be non-negative' },
        { status: 400 }
      );
    }

    // Validate duration if provided
    if (duration !== undefined && duration <= 0) {
      return NextResponse.json(
        { error: 'duration must be positive' },
        { status: 400 }
      );
    }

    const updatedKeyframe = await prisma.videoKeyFrame.update({
      where: { id: keyframeId },
      data: {
        ...(timestamp !== undefined && { timestamp }),
        ...(duration !== undefined && { duration }),
        ...(dataType !== undefined && { dataType }),
        ...(mediaId !== undefined && { mediaId }),
        ...(url !== undefined && { url }),
        ...(prompt !== undefined && { prompt })
      }
    });

    console.log(`✅ Video keyframe updated: ${updatedKeyframe.id}`);
    return NextResponse.json({ keyframe: updatedKeyframe });
  } catch (error) {
    console.error('❌ Video keyframe update error:', error);
    return NextResponse.json(
      { error: 'Failed to update video keyframe' },
      { status: 500 }
    );
  }
}

// Delete video keyframe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyframeId } = await params;

    const keyframe = await prisma.videoKeyFrame.findUnique({
      where: { id: keyframeId }
    });

    if (!keyframe) {
      return NextResponse.json({ error: 'Video keyframe not found' }, { status: 404 });
    }

    await prisma.videoKeyFrame.delete({
      where: { id: keyframeId }
    });

    console.log(`✅ Video keyframe deleted: ${keyframeId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Video keyframe deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video keyframe' },
      { status: 500 }
    );
  }
}
