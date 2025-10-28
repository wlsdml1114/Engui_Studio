import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volume = searchParams.get('volume');
    const key = searchParams.get('key');

    if (!volume || !key) {
      return NextResponse.json(
        { error: '볼륨과 파일 키가 필요합니다.' },
        { status: 400 }
      );
    }

    const settingsService = new SettingsService();
    const { settings } = await settingsService.getSettings('user-with-settings');
    
    if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 설정이 완료되지 않았습니다.' },
        { status: 400 }
      );
    }

    const s3Service = new S3Service({
      endpointUrl: settings.s3.endpointUrl,
      accessKeyId: settings.s3.accessKeyId,
      secretAccessKey: settings.s3.secretAccessKey,
      bucketName: settings.s3.bucketName || volume,
      region: settings.s3.region || 'us-east-1',
      useGlobalNetworking: settings.s3.useGlobalNetworking ?? false,
    });

    // 파일 다운로드
    const fileBuffer = await s3Service.downloadFile(key);
    
    // 파일명 추출
    const fileName = key.split('/').pop() || 'download';
    
    // MIME 타입 설정
    const mimeType = getMimeType(fileName);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Failed to download file:', error);
    return NextResponse.json(
      { error: '파일 다운로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'pt':
    case 'pth':
    case 'ckpt':
      return 'application/octet-stream';
    case 'safetensors':
      return 'application/octet-stream';
    case 'lora':
      return 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}
