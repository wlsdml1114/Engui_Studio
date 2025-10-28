import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';

export async function POST(request: NextRequest) {
  try {
    const { volume, key } = await request.json();

    if (!volume || !key) {
      return NextResponse.json(
        { error: '볼륨과 폴더 키가 필요합니다.' },
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
      useGlobalNetworking: settings.s3.useGlobalNetworking ?? false,
    });

    // 폴더 생성 전에 충돌 확인
    try {
      const existingFiles = await s3Service.listFiles(key);
      const conflictFile = existingFiles.find(f => f.key === key && f.type === 'file');
      if (conflictFile) {
        return NextResponse.json(
          { 
            error: `폴더 생성 실패: '${key}'는 이미 파일로 존재합니다. 기존 파일을 삭제하거나 다른 폴더명을 사용해주세요.`,
            conflictType: 'file_exists'
          },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error('Conflict check failed:', error);
      // 충돌 확인 실패해도 폴더 생성 시도
    }

    // 폴더 생성 (빈 파일을 업로드하여 폴더 생성)
    await s3Service.createFolder(key);

    return NextResponse.json({ 
      success: true, 
      message: '폴더가 성공적으로 생성되었습니다.' 
    });
  } catch (error) {
    console.error('Failed to create folder:', error);
    return NextResponse.json(
      { error: '폴더 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
