import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const volume = formData.get('volume') as string;
    const path = formData.get('path') as string;

    if (!file || !volume) {
      return NextResponse.json(
        { error: '파일과 볼륨이 필요합니다.' },
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
      bucketName: volume,
      region: settings.s3.region || 'us-east-1',
    });

    // 파일 업로드
    console.log('🔍 Upload API - received path:', path);
    console.log('🔍 Upload API - file name:', file.name);
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const result = await s3Service.uploadFile(fileBuffer, file.name, file.type, path || '');

    return NextResponse.json({ 
      success: true, 
      message: '파일이 성공적으로 업로드되었습니다.',
      key: result.filePath,
      s3Url: result.s3Url
    });
  } catch (error) {
    console.error('Failed to upload file:', error);
    return NextResponse.json(
      { error: '파일 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
