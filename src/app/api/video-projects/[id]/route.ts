import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get single video project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const project = await prisma.videoProject.findUnique({
      where: { id: projectId },
      include: {
        tracks: {
          orderBy: { order: 'asc' },
          include: {
            keyframes: {
              orderBy: { timestamp: 'asc' }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Video project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('❌ Video project fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video project' },
      { status: 500 }
    );
  }
}

// Update video project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { title, description, aspectRatio, duration } = await request.json();

    const project = await prisma.videoProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Video project not found' }, { status: 404 });
    }

    // Validate aspectRatio if provided
    if (aspectRatio && !['16:9', '9:16', '1:1'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: 'aspectRatio must be one of: 16:9, 9:16, 1:1' },
        { status: 400 }
      );
    }

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== 'number' || duration <= 0)) {
      return NextResponse.json(
        { error: 'duration must be a positive number' },
        { status: 400 }
      );
    }

    const updatedProject = await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(aspectRatio !== undefined && { aspectRatio }),
        ...(duration !== undefined && { duration })
      }
    });

    console.log(`✅ Video project updated: ${updatedProject.id}`);
    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('❌ Video project update error:', error);
    return NextResponse.json(
      { error: 'Failed to update video project' },
      { status: 500 }
    );
  }
}

// Delete video project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const project = await prisma.videoProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Video project not found' }, { status: 404 });
    }

    // Delete project (cascade will handle tracks and keyframes)
    await prisma.videoProject.delete({
      where: { id: projectId }
    });

    console.log(`✅ Video project deleted: ${projectId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Video project deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video project' },
      { status: 500 }
    );
  }
}
