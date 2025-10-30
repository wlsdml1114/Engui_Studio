import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Processing audio save request...');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📄 File received: ${file.name} (${file.size} bytes)`);

    // public/results 디렉토리에 저장
    const resultsDir = join(process.cwd(), 'public', 'results');

    // 디렉토리가 없으면 생성
    try {
      await mkdir(resultsDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create results directory:', err);
    }

    const filePath = join(resultsDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await writeFile(filePath, buffer);
    console.log(`✅ File saved to: ${filePath}`);

    // 클라이언트에 반환할 경로 (web accessible path)
    const webPath = `/results/${file.name}`;

    return NextResponse.json({
      success: true,
      filePath: webPath,
      fileName: file.name
    });

  } catch (error) {
    console.error('❌ Audio save error:', error);
    return NextResponse.json(
      { error: `Failed to save audio: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
