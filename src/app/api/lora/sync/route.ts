// src/app/api/lora/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';
import path from 'path';

// POST /api/lora/sync - Sync LoRAs from S3 to database
export async function POST(request: NextRequest) {
  try {
    const { workspaceId, userId = 'user-with-settings' } = await request.json();

    logger.info('Starting LoRA sync from S3...');

    // Get S3 settings from database
    const settingsService = new SettingsService();
    const { settings } = await settingsService.getSettings(userId);

    logger.info('Retrieved settings:', {
      hasS3: !!settings.s3,
      s3Keys: settings.s3 ? Object.keys(settings.s3) : [],
      endpointUrl: settings.s3?.endpointUrl ? 'present' : 'missing',
      accessKeyId: settings.s3?.accessKeyId ? 'present' : 'missing',
      secretAccessKey: settings.s3?.secretAccessKey ? 'present' : 'missing',
      bucketName: settings.s3?.bucketName ? 'present' : 'missing',
      region: settings.s3?.region ? 'present' : 'missing',
    });

    if (!settings.s3) {
      throw new Error('S3 configuration not found. Please configure S3 settings first.');
    }

    // Validate required S3 fields
    const missingFields = [];
    if (!settings.s3.endpointUrl) missingFields.push('endpointUrl');
    if (!settings.s3.accessKeyId) missingFields.push('accessKeyId');
    if (!settings.s3.secretAccessKey) missingFields.push('secretAccessKey');
    if (!settings.s3.bucketName) missingFields.push('bucketName');
    if (!settings.s3.region) missingFields.push('region');

    if (missingFields.length > 0) {
      throw new Error(
        `S3 configuration incomplete. Missing fields: ${missingFields.join(', ')}. Please configure S3 settings in the Settings page.`
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

    // List all files in the loras/ folder
    const files = await s3Service.listFiles('loras/');

    logger.info(`Found ${files.length} items in S3 loras/ folder`);

    // Filter for LoRA files (.safetensors or .ckpt)
    const loraFiles = files.filter(
      (file) =>
        file.type === 'file' &&
        (file.extension === '.safetensors' || file.extension === '.ckpt')
    );

    logger.info(`Found ${loraFiles.length} LoRA files to sync`);

    const syncedLoras = [];
    const skippedLoras = [];

    for (const file of loraFiles) {
      try {
        // Check if LoRA already exists in database
        const existingLora = await prisma.loRA.findFirst({
          where: {
            s3Path: `/runpod-volume/${file.key}`,
          },
        });

        if (existingLora) {
          logger.info(`LoRA already exists in database: ${file.key}`);
          skippedLoras.push({
            fileName: path.basename(file.key),
            reason: 'Already exists in database',
          });
          continue;
        }

        // Extract file name without extension for the name
        const fileName = path.basename(file.key);
        const nameWithoutExt = path.basename(file.key, file.extension || '');

        // Create S3 URL
        const s3Url = `${settings.s3!.endpointUrl.replace(/\/$/, '')}/${settings.s3!.bucketName}/${file.key}`;

        // Create LoRA record in database
        const newLora = await prisma.loRA.create({
          data: {
            name: nameWithoutExt,
            fileName: fileName,
            s3Path: `/runpod-volume/${file.key}`,
            s3Url: s3Url,
            fileSize: BigInt(file.size),
            extension: file.extension || '',
            workspaceId: workspaceId || null,
            uploadedAt: file.lastModified,
          },
        });

        logger.info(`Synced LoRA to database: ${fileName}`);
        syncedLoras.push({
          id: newLora.id,
          name: newLora.name,
          fileName: newLora.fileName,
          fileSize: newLora.fileSize.toString(),
        });
      } catch (error) {
        logger.error(`Failed to sync LoRA ${file.key}:`, error);
        skippedLoras.push({
          fileName: path.basename(file.key),
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info(
      `LoRA sync completed: ${syncedLoras.length} synced, ${skippedLoras.length} skipped`
    );

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedLoras.length} LoRAs from S3`,
      synced: syncedLoras,
      skipped: skippedLoras,
      total: loraFiles.length,
    });
  } catch (error) {
    logger.error('Failed to sync LoRAs from S3:', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to sync LoRAs from S3',
      },
      { status: 500 }
    );
  }
}
