import { NextRequest, NextResponse } from 'next/server';
import { ffmpegService } from '@/lib/ffmpegService';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getApiMessage } from '@/lib/apiMessages';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const width = parseInt(formData.get('width') as string) || 320;
    const height = parseInt(formData.get('height') as string) || 240;
    const quality = parseInt(formData.get('quality') as string) || 80;

    if (!file) {
      return NextResponse.json(
        { error: getApiMessage('FILE', 'NO_FILES_PROVIDED') },
        { status: 400 }
      );
    }

    // 지원되는 비디오 형식 확인
    const supportedFormats = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'];
    const fileExtension = path.extname(file.name).toLowerCase();
    
    if (!supportedFormats.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Unsupported video format: ${fileExtension}` },
        { status: 400 }
      );
    }

    // FFmpeg 사용 가능 여부 확인
    const isFFmpegAvailable = await ffmpegService.isFFmpegAvailable();
    if (!isFFmpegAvailable) {
      return NextResponse.json(
        { error: getApiMessage('FILE', 'FAILED_TO_GENERATE_THUMBNAIL') },
        { status: 500 }
      );
    }

    // 임시 파일 경로 생성
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempVideoPath = path.join(tempDir, `temp_${uuidv4()}${fileExtension}`);
    const thumbnailPath = path.join(tempDir, `thumb_${uuidv4()}.jpg`);

    try {
      // 파일을 임시 디렉토리에 저장
      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(tempVideoPath, Buffer.from(arrayBuffer));

      // 비디오 파일 유효성 검사
      const isValidVideo = await ffmpegService.validateVideo(tempVideoPath);
      if (!isValidVideo) {
        return NextResponse.json(
          { error: getApiMessage('FILE', 'INVALID_VIDEO_FILE') },
          { status: 400 }
        );
      }

      // 썸네일 생성
      await ffmpegService.extractThumbnail(tempVideoPath, thumbnailPath, {
        width,
        height,
        quality,
        format: 'jpg'
      });

      // 썸네일 파일 읽기
      const thumbnailBuffer = fs.readFileSync(thumbnailPath);
      const thumbnailBase64 = thumbnailBuffer.toString('base64');

      // 임시 파일 정리
      fs.unlinkSync(tempVideoPath);
      fs.unlinkSync(thumbnailPath);

      return NextResponse.json({
        success: true,
        thumbnail: `data:image/jpeg;base64,${thumbnailBase64}`,
        width,
        height,
        quality
      });

    } catch (error) {
      // 임시 파일 정리
      if (fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }

      console.error('Thumbnail generation error:', error);
      return NextResponse.json(
        { error: getApiMessage('FILE', 'FAILED_TO_GENERATE_THUMBNAIL') },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Thumbnail API error:', error);
    return NextResponse.json(
      { error: getApiMessage('FILE', 'INTERNAL_SERVER_ERROR') },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // FFmpeg 사용 가능 여부 확인
    const isFFmpegAvailable = await ffmpegService.isFFmpegAvailable();
    
    return NextResponse.json({
      ffmpegAvailable: isFFmpegAvailable,
      supportedFormats: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'],
      defaultOptions: {
        width: 320,
        height: 240,
        quality: 80,
        format: 'jpg'
      }
    });

  } catch (error) {
    console.error('Thumbnail status error:', error);
    return NextResponse.json(
      { error: getApiMessage('FILE', 'INTERNAL_SERVER_ERROR') },
      { status: 500 }
    );
  }
}
