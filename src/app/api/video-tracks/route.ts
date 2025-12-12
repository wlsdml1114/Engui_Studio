import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Create new video track
export async function POST(request: NextRequest) {
  try {
    const { projectId, type, label, locked, order } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      );
    }

    // Validate track type
    if (!['video', 'music', 'voiceover'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: video, music, voiceover' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.videoProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Video project not found' },
        { status: 404 }
      );
    }

    // Create track
    const track = await prisma.videoTrack.create({
      data: {
        projectId,
        type,
        label: label || `${type} track`,
        locked: locked !== undefined ? locked : true,
        order: order !== undefined ? order : 0
      }
    });

    console.log(`✅ Video track created: ${track.id} (${track.type})`);

    return NextResponse.json({ track });
  } catch (error) {
    console.error('❌ Video track creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create video track' },
      { status: 500 }
    );
  }
}
