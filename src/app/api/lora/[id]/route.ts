// src/app/api/lora/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';
import { logger } from '@/lib/logger';

// DELETE /api/lora/[id] - Delete a LoRA file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let s3DeleteAttempted = false;
  let s3DeleteSucceeded = false;
  let dbDeleteSucceeded = false;

  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'LoRA ID is required' },
        { status: 400 }
      );
    }

    // Fetch the LoRA record to get S3 path
    const lora = await prisma.loRA.findUnique({
      where: { id },
    });

    if (!lora) {
      return NextResponse.json(
        { success: false, error: 'LoRA not found' },
        { status: 404 }
      );
    }

    logger.info(`Deleting LoRA: ${lora.fileName} (${id})`);

    // Get S3 settings from database (same as upload/sync routes)
    const settingsService = new SettingsService();
    const userId = 'user-with-settings'; // TODO: Get from auth
    const { settings } = await settingsService.getSettings(userId);

    if (!settings.s3) {
      return NextResponse.json(
        { success: false, error: 'S3 configuration not found. Please configure S3 settings first.' },
        { status: 400 }
      );
    }

    // Initialize S3 service with settings from database
    const s3Service = new S3Service({
      endpointUrl: settings.s3.endpointUrl,
      accessKeyId: settings.s3.accessKeyId,
      secretAccessKey: settings.s3.secretAccessKey,
      bucketName: settings.s3.bucketName,
      region: settings.s3.region,
      timeout: settings.s3.timeout,
      useGlobalNetworking: settings.s3.useGlobalNetworking,
    });

    // Delete from S3 first (must succeed before DB deletion)
    try {
      s3DeleteAttempted = true;
      // Extract the key from the path (remove /runpod-volume/ prefix)
      const s3Key = lora.s3Path.replace('/runpod-volume/', '');
      await s3Service.deleteFile(s3Key);
      s3DeleteSucceeded = true;
      logger.info(`Deleted LoRA from S3: ${s3Key}`);
    } catch (s3Error) {
      logger.error('Failed to delete LoRA from S3:', s3Error);
      
      // Check if it's a "not found" error (file already deleted)
      const errorMessage = s3Error instanceof Error ? s3Error.message : '';
      if (errorMessage.includes('NoSuchKey') || errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        logger.warn('S3 file not found, assuming already deleted. Proceeding with database deletion.');
        s3DeleteSucceeded = true; // Treat as success since file doesn't exist
      } else {
        // S3 deletion failed for other reasons - abort to prevent sync issues
        throw new Error(`Failed to delete LoRA from S3: ${errorMessage}. Database record not deleted to prevent sync issues.`);
      }
    }

    // Delete from database only if S3 deletion succeeded
    try {
      await prisma.loRA.delete({
        where: { id },
      });
      dbDeleteSucceeded = true;
      logger.info(`Deleted LoRA from database: ${id}`);
    } catch (dbError) {
      logger.error('Failed to delete LoRA from database:', dbError);
      
      // If S3 deletion succeeded but database deletion failed, this is a partial failure
      if (s3DeleteSucceeded) {
        logger.error('Partial deletion: S3 file deleted but database record remains');
      }
      
      throw dbError;
    }

    // Check for partial failures
    if (s3DeleteAttempted && !s3DeleteSucceeded && dbDeleteSucceeded) {
      logger.warn('Partial deletion: Database record deleted but S3 file may remain');
      return NextResponse.json({
        success: true,
        warning: 'LoRA deleted from database, but S3 deletion failed. The file may still exist in storage.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'LoRA deleted successfully',
    });
  } catch (error) {
    logger.error('LoRA deletion error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to delete LoRA';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Delete operation timed out. Please try again.';
        statusCode = 408; // Request Timeout
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Unable to connect to storage service. Please try again later.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('not found') || error.message.includes('does not exist')) {
        errorMessage = 'LoRA file not found. It may have already been deleted.';
        statusCode = 404; // Not Found
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        retryable: statusCode === 408 || statusCode === 503, // Indicate if retry is recommended
      },
      { status: statusCode }
    );
  }
}
