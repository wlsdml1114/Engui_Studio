import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  handleNotFoundError,
  handleDatabaseError,
  createSuccessResponse,
  validateEnum,
  validatePositiveNumber,
  withErrorHandling,
} from '@/lib/apiErrorHandler';

// Get single video project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
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
      return handleNotFoundError('Video project', projectId);
    }

    return createSuccessResponse({ project });
  });
}

// Update video project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id: projectId } = await params;
    const { title, description, aspectRatio, qualityPreset, width, height, duration } = await request.json();

    const project = await prisma.videoProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return handleNotFoundError('Video project', projectId);
    }

    // Validate aspectRatio if provided
    if (aspectRatio !== undefined) {
      const error = validateEnum(aspectRatio, ['16:9', '9:16'] as const, 'aspectRatio');
      if (error) return error;
    }

    // Validate qualityPreset if provided
    if (qualityPreset !== undefined) {
      const error = validateEnum(qualityPreset, ['480p', '720p', '1080p'] as const, 'qualityPreset');
      if (error) return error;
    }

    // Validate width if provided
    if (width !== undefined) {
      const error = validatePositiveNumber(width, 'width');
      if (error) return error;
    }

    // Validate height if provided
    if (height !== undefined) {
      const error = validatePositiveNumber(height, 'height');
      if (error) return error;
    }

    // Validate duration if provided
    if (duration !== undefined) {
      const error = validatePositiveNumber(duration, 'duration');
      if (error) return error;
    }

    const updatedProject = await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(aspectRatio !== undefined && { aspectRatio }),
        ...(qualityPreset !== undefined && { qualityPreset }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(duration !== undefined && { duration })
      }
    });

    console.log(`✅ Video project updated: ${updatedProject.id}`);
    return createSuccessResponse({ project: updatedProject });
  });
}

// Delete video project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id: projectId } = await params;

    const project = await prisma.videoProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return handleNotFoundError('Video project', projectId);
    }

    // Delete project (cascade will handle tracks and keyframes)
    await prisma.videoProject.delete({
      where: { id: projectId }
    });

    console.log(`✅ Video project deleted: ${projectId}`);
    return createSuccessResponse({ success: true });
  });
}
