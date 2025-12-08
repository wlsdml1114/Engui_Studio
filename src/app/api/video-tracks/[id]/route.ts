import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  handleNotFoundError,
  createSuccessResponse,
  validateRange,
  validateFieldType,
  withErrorHandling,
} from '@/lib/apiErrorHandler';

// Update video track
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id: trackId } = await params;
    const { volume, muted } = await request.json();

    const track = await prisma.videoTrack.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return handleNotFoundError('Video track', trackId);
    }

    // Validate volume if provided
    if (volume !== undefined) {
      const error = validateRange(volume, 0, 200, 'volume');
      if (error) return error;
    }

    // Validate muted if provided
    if (muted !== undefined) {
      const error = validateFieldType(muted, 'boolean', 'muted');
      if (error) return error;
    }

    const updatedTrack = await prisma.videoTrack.update({
      where: { id: trackId },
      data: {
        ...(volume !== undefined && { volume }),
        ...(muted !== undefined && { muted })
      }
    });

    console.log(`✅ Video track updated: ${updatedTrack.id}`);
    return createSuccessResponse({ track: updatedTrack });
  });
}

// Delete video track
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id: trackId } = await params;

    const track = await prisma.videoTrack.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return handleNotFoundError('Video track', trackId);
    }

    // Delete track (cascade will handle keyframes)
    await prisma.videoTrack.delete({
      where: { id: trackId }
    });

    console.log(`✅ Video track deleted: ${trackId}`);
    return createSuccessResponse({ success: true });
  });
}
