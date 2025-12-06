// src/app/api/lora/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';
import { validateLoRAFileServer } from '@/lib/loraValidation';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const uploadedFiles: string[] = [];
  let s3Service: S3Service | null = null;

  try {
    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('file') as File[]; // Support multiple files
    const workspaceId = formData.get('workspaceId') as string | null;
    const userId = formData.get('userId') as string || 'user-with-settings';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Get S3 settings from database (same as sync route)
    const settingsService = new SettingsService();
    const { settings } = await settingsService.getSettings(userId);

    if (!settings.s3) {
      return NextResponse.json(
        { success: false, error: 'S3 configuration not found. Please configure S3 settings first.' },
        { status: 400 }
      );
    }

    // Validate required S3 fields
    const missingFields = [];
    if (!settings.s3.endpointUrl) missingFields.push('endpointUrl');
    if (!settings.s3.accessKeyId) missingFields.push('accessKeyId');
    if (!settings.s3.secretAccessKey) missingFields.push('secretAccessKey');
    if (!settings.s3.bucketName) missingFields.push('bucketName');
    if (!settings.s3.region) missingFields.push('region');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `S3 configuration incomplete. Missing fields: ${missingFields.join(', ')}. Please configure S3 settings.` 
        },
        { status: 400 }
      );
    }

    // Initialize S3 service with settings from database
    s3Service = new S3Service({
      endpointUrl: settings.s3.endpointUrl,
      accessKeyId: settings.s3.accessKeyId,
      secretAccessKey: settings.s3.secretAccessKey,
      bucketName: settings.s3.bucketName,
      region: settings.s3.region,
      timeout: settings.s3.timeout,
      useGlobalNetworking: settings.s3.useGlobalNetworking,
    });

    const results = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      try {
        // Validate file
        const validation = validateLoRAFileServer(file.name, file.size);
        if (!validation.valid) {
          errors.push({ fileName: file.name, error: validation.error });
          continue;
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to S3 in loras/ folder (not loras/workspaceId)
        const uploadPath = 'loras';
        logger.info(`Uploading LoRA file: ${file.name} to ${uploadPath}/`);
        
        const { s3Url, filePath } = await s3Service.uploadFile(
          buffer,
          file.name,
          file.type || 'application/octet-stream',
          uploadPath
        );

        uploadedFiles.push(filePath);
        logger.info(`LoRA uploaded to S3: ${s3Url}`);

        // Extract file extension
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        // Create database record
        try {
          const lora = await prisma.loRA.create({
            data: {
              name: file.name.substring(0, file.name.lastIndexOf('.')), // Name without extension
              fileName: file.name,
              s3Path: filePath,
              s3Url: s3Url,
              fileSize: BigInt(file.size),
              extension: extension,
              workspaceId: workspaceId || null,
            },
          });

          logger.info(`LoRA record created in database: ${lora.id}`);

          results.push({
            id: lora.id,
            name: lora.name,
            fileName: lora.fileName,
            s3Path: lora.s3Path,
            s3Url: lora.s3Url,
            fileSize: lora.fileSize.toString(),
            extension: lora.extension,
            uploadedAt: lora.uploadedAt.toISOString(),
            workspaceId: lora.workspaceId,
          });
        } catch (dbError) {
          // Rollback: Delete S3 file if database save fails
          logger.error('Database save failed, rolling back S3 upload:', dbError);
          
          if (s3Service && filePath) {
            try {
              // Extract the key from the path (remove /runpod-volume/ prefix)
              const s3Key = filePath.replace('/runpod-volume/', '');
              await s3Service.deleteFile(s3Key);
              logger.info('Successfully rolled back S3 upload');
            } catch (deleteError) {
              logger.error('Failed to rollback S3 upload:', deleteError);
            }
          }

          errors.push({ fileName: file.name, error: dbError instanceof Error ? dbError.message : 'Database error' });
        }
      } catch (fileError) {
        logger.error(`Failed to upload ${file.name}:`, fileError);
        errors.push({ 
          fileName: file.name, 
          error: fileError instanceof Error ? fileError.message : 'Upload failed' 
        });
      }
    }

    // Return results
    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'All uploads failed', errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${results.length} of ${files.length} files`,
      loras: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('LoRA upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload LoRA file';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = 'Upload timed out. Please check your connection and try again.';
        statusCode = 408; // Request Timeout
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Unable to connect to storage service. Please try again later.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('No space left')) {
        errorMessage = 'Storage is full. Please contact support.';
        statusCode = 507; // Insufficient Storage
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
