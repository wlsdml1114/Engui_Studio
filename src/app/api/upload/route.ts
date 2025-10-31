// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import { getApiMessage } from '@/lib/apiMessages';

export async function POST(request: NextRequest) {
  try {
    console.log('📁 Processing file upload request...');

    const formData = await request.formData();
    const s3Service = new S3Service();
    const fileMapping: Record<string, string> = {};

    // Process each file in the form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`📄 Processing file: ${key} - ${value.name} (${value.type})`);

        try {
          const arrayBuffer = await value.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Upload individual file to S3
          const uploadResult = await s3Service.uploadFile(
            buffer,
            value.name,
            value.type
          );

          fileMapping[key] = uploadResult.filePath;
          console.log(`✅ ${key} uploaded to: ${uploadResult.filePath}`);
        } catch (fileError) {
          console.error(`❌ Error uploading ${key}:`, fileError);
          throw fileError;
        }
      }
    }

    if (Object.keys(fileMapping).length === 0) {
      return NextResponse.json(
        { error: getApiMessage('FILE', 'NO_FILES_PROVIDED') },
        { status: 400 }
      );
    }

    console.log('✅ File upload completed:', fileMapping);

    return NextResponse.json({
      success: true,
      files: fileMapping,
    });

  } catch (error) {
    console.error('❌ File upload error:', error);
    return NextResponse.json(
      { error: `File upload failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}