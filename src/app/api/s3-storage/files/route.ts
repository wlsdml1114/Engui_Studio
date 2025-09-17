import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volume = searchParams.get('volume');
    const path = searchParams.get('path') || '';

    if (!volume) {
      return NextResponse.json(
        { error: '볼륨이 지정되지 않았습니다.' },
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

    // RunPod S3 API를 사용하여 파일 목록 가져오기
    const s3Service = new S3Service({
      endpointUrl: settings.s3.endpointUrl,
      accessKeyId: settings.s3.accessKeyId,
      secretAccessKey: settings.s3.secretAccessKey,
      bucketName: volume, // 네트워크 볼륨 ID를 버킷명으로 사용
      region: settings.s3.region || 'us-east-1',
    });

    const files = await s3Service.listFiles(path);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return NextResponse.json(
      { error: '파일 목록을 가져올 수 없습니다.' },
      { status: 500 }
    );
  }
}
