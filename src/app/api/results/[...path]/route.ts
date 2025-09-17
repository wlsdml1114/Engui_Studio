import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filePath = path.join('/');
    
    console.log(`📁 Serving static file: /results/${filePath}`);
    
    // public/results 폴더에서 파일 찾기
    const fullPath = join(process.cwd(), 'public', 'results', filePath);
    
    // 파일 존재 확인
    if (!existsSync(fullPath)) {
      console.log(`❌ File not found: ${fullPath}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // 파일 읽기
    const fileBuffer = await readFile(fullPath);
    
    // MIME 타입 설정
    const mimeType = getMimeType(filePath);
    
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000', // 1년 캐시
      },
    });
  } catch (error) {
    console.error('❌ Error serving static file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'ogg':
      return 'audio/ogg';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}
