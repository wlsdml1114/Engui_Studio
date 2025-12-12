// src/app/api/lora/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import S3Service from '@/lib/s3Service';

// GET /api/lora - Fetch all LoRAs for a workspace
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const generatePresignedUrls = searchParams.get('presigned') === 'true';

    // Build where clause
    const where = workspaceId ? { workspaceId } : {};

    const loras = await prisma.loRA.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });

    // Initialize S3 service if presigned URLs are requested
    let s3Service: S3Service | null = null;
    if (generatePresignedUrls) {
      try {
        s3Service = new S3Service();
      } catch (error) {
        logger.error('Failed to initialize S3 service for presigned URLs:', error);
        // Continue without presigned URLs
      }
    }

    // Convert BigInt to string for JSON serialization and optionally generate presigned URLs
    const serializedLoras = await Promise.all(
      loras.map(async (lora) => {
        let presignedUrl: string | undefined;

        // Generate presigned URL if requested and S3 service is available
        if (s3Service && generatePresignedUrls) {
          try {
            // Extract S3 key from path (remove /runpod-volume/ prefix)
            const s3Key = lora.s3Path.replace('/runpod-volume/', '');
            presignedUrl = await s3Service.generatePresignedUrl(s3Key, 3600); // 1 hour expiration
            logger.info(`Generated presigned URL for LoRA: ${lora.id}`);
          } catch (error) {
            logger.error(`Failed to generate presigned URL for LoRA ${lora.id}:`, error);
            // Continue without presigned URL for this LoRA
          }
        }

        return {
          id: lora.id,
          name: lora.name,
          fileName: lora.fileName,
          s3Path: lora.s3Path,
          s3Url: lora.s3Url,
          presignedUrl, // Include presigned URL if generated
          fileSize: lora.fileSize.toString(),
          extension: lora.extension,
          uploadedAt: lora.uploadedAt.toISOString(),
          workspaceId: lora.workspaceId,
        };
      })
    );

    logger.info(`Fetched ${serializedLoras.length} LoRAs for workspace: ${workspaceId || 'all'}`);

    return NextResponse.json({
      success: true,
      loras: serializedLoras,
    });
  } catch (error) {
    logger.error('Failed to fetch LoRAs:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch LoRAs';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Database query timed out. Please try again.';
        statusCode = 408; // Request Timeout
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
        errorMessage = 'Unable to connect to database. Please try again later.';
        statusCode = 503; // Service Unavailable
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
