// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import { getApiMessage } from '@/lib/apiMessages';

export async function POST(request: NextRequest) {
  try {
    console.log('📁 Processing file upload request...');
    
    const formData = await request.formData();
    const files: { buffer: Buffer; fileName: string; contentType: string }[] = [];
    
    // Process each file in the form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`📄 Processing file: ${key} - ${value.name} (${value.type})`);
        
        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        files.push({
          buffer,
          fileName: value.name,
          contentType: value.type,
        });
      }
    }
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: getApiMessage('FILE', 'NO_FILES_PROVIDED') },
        { status: 400 }
      );
    }
    
    // Upload files to S3
    const s3Service = new S3Service();
    const uploadedPaths = await s3Service.uploadMultipleFiles(files);
    
    // Create response mapping file names to S3 paths
    const fileMapping: Record<string, string> = {};
    let index = 0;
    
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        fileMapping[key] = uploadedPaths[index].filePath;
        index++;
      }
    }
    
    console.log('✅ File upload completed:', fileMapping);
    
    return NextResponse.json({
      success: true,
      files: fileMapping,
    });
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    return NextResponse.json(
      { error: `File upload failed: ${error}` },
      { status: 500 }
    );
  }
}