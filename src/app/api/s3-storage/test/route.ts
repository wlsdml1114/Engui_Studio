import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const volume = searchParams.get('volume');

    const settingsService = new SettingsService();
    const { settings } = await settingsService.getSettings('user-with-settings');

    if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
      return NextResponse.json(
        { error: 'S3 설정이 완료되지 않았습니다.' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing S3 Connection with:');
    console.log('  Endpoint:', settings.s3.endpointUrl);
    console.log('  Bucket:', volume || settings.s3.bucketName);
    console.log('  Region:', settings.s3.region);
    console.log('  Access Key:', settings.s3.accessKeyId?.substring(0, 4) + '***');

    const s3Service = new S3Service({
      endpointUrl: settings.s3.endpointUrl,
      accessKeyId: settings.s3.accessKeyId,
      secretAccessKey: settings.s3.secretAccessKey,
      bucketName: volume || settings.s3.bucketName,
      region: settings.s3.region || 'us-east-1',
      useGlobalNetworking: settings.s3.useGlobalNetworking ?? false,
    });

    console.log('✅ S3Service initialized successfully');

    // 간단한 파일 목록 요청 (매우 짧은 타임아웃)
    try {
      const files = await s3Service.listFiles();
      console.log('✅ S3 Connection Test Passed');
      console.log('  Files found:', files.length);

      return NextResponse.json({
        success: true,
        message: 'S3 연결 성공',
        filesCount: files.length,
        config: {
          endpoint: settings.s3.endpointUrl,
          bucket: volume || settings.s3.bucketName,
          region: settings.s3.region,
        },
      });
    } catch (listError: any) {
      console.error('❌ S3 Connection Test Failed:', listError.message);

      return NextResponse.json({
        success: false,
        message: 'S3 연결 실패',
        error: listError.message,
        code: listError.Code,
        config: {
          endpoint: settings.s3.endpointUrl,
          bucket: volume || settings.s3.bucketName,
          region: settings.s3.region,
        },
      });
    }
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: '테스트 중 오류가 발생했습니다.', details: String(error) },
      { status: 500 }
    );
  }
}
