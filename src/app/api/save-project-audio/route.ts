import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Processing project audio file save...');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📄 File received: ${file.name} (${file.size} bytes)`);

    // public/upload 디렉토리에 저장
    const uploadDir = join(process.cwd(), 'public', 'upload');

    // 디렉토리가 없으면 생성
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create upload directory:', err);
    }

    const sanitizedFileName = basename(file.name);
    const filePath = join(uploadDir, sanitizedFileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await writeFile(filePath, buffer);
    console.log(`✅ File saved to: ${filePath}`);

    // 클라이언트에 반환할 경로 (web accessible path)
    const webPath = `/upload/${sanitizedFileName}`;

    return NextResponse.json({
      success: true,
      filePath: webPath,
      fileName: file.name
    });

  } catch (error) {
    console.error('❌ Project audio save error:', error);
    return NextResponse.json(
      { error: `Failed to save audio: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
