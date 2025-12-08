import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  handleNotFoundError,
  createSuccessResponse,
  validateEnum,
  validateRange,
  validateNonNegativeNumber,
  validatePositiveNumber,
  withErrorHandling,
} from '@/lib/apiErrorHandler';

// Update video keyframe
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id: keyframeId } = await params;
    const { timestamp, duration, dataType, mediaId, url, prompt, fitMode, volume } = await request.json();

    const keyframe = await prisma.videoKeyFrame.findUnique({
      where: { id: keyframeId }
    });

    if (!keyframe) {
      return handleNotFoundError('Video keyframe', keyframeId);
    }

    // Validate dataType if provided
    if (dataType !== undefined) {
      const error = validateEnum(dataType, ['image', 'video', 'music', 'voiceover'] as const, 'dataType');
      if (error) return error;
    }

    // Validate timestamp if provided
    if (timestamp !== undefined) {
      const error = validateNonNegativeNumber(timestamp, 'timestamp');
      if (error) return error;
    }

    // Validate duration if provided
    if (duration !== undefined) {
      const error = validatePositiveNumber(duration, 'duration');
      if (error) return error;
    }

    // Validate fitMode if provided (null is allowed)
    if (fitMode !== undefined && fitMode !== null) {
      const error = validateEnum(fitMode, ['contain', 'cover', 'fill'] as const, 'fitMode');
      if (error) return error;
    }

    // Validate volume if provided (null is allowed)
    if (volume !== undefined && volume !== null) {
      const error = validateRange(volume, 0, 200, 'volume');
      if (error) return error;
    }

    const updatedKeyframe = await prisma.videoKeyFrame.update({
      where: { id: keyframeId },
      data: {
        ...(timestamp !== undefined && { timestamp }),
        ...(duration !== undefined && { duration }),
        ...(dataType !== undefined && { dataType }),
        ...(mediaId !== undefined && { mediaId }),
        ...(url !== undefined && { url }),
        ...(prompt !== undefined && { prompt }),
        ...(fitMode !== undefined && { fitMode }),
        ...(volume !== undefined && { volume })
      }
    });

    console.log(`✅ Video keyframe updated: ${updatedKeyframe.id}`);
    return createSuccessResponse({ keyframe: updatedKeyframe });
  });
}

// Delete video keyframe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    const { id: keyframeId } = await params;

    const keyframe = await prisma.videoKeyFrame.findUnique({
      where: { id: keyframeId }
    });

    if (!keyframe) {
      return handleNotFoundError('Video keyframe', keyframeId);
    }

    await prisma.videoKeyFrame.delete({
      where: { id: keyframeId }
    });

    console.log(`✅ Video keyframe deleted: ${keyframeId}`);
    return createSuccessResponse({ success: true });
  });
}
