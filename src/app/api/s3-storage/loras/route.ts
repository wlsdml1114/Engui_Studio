import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';
import SettingsService from '@/lib/settingsService';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Fetching LoRA files from S3...');
        
        // URL 파라미터에서 볼륨 정보 가져오기
        const { searchParams } = new URL(request.url);
        const volume = searchParams.get('volume');
        
        if (!volume) {
            console.log('⚠️ No volume specified. Returning empty LoRA list.');
            return NextResponse.json({
                success: true,
                files: [],
                highFiles: [],
                lowFiles: [],
                message: '볼륨이 지정되지 않았습니다. S3 Storage 페이지에서 볼륨을 선택해주세요.'
            });
        }
        
        // 설정 서비스에서 S3 설정 가져오기
        const settingsService = new SettingsService();
        const { settings } = await settingsService.getSettings('user-with-settings');
        
        // S3 설정 확인
        if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
            console.log('⚠️ S3 configuration is incomplete. Returning empty LoRA list.');
            return NextResponse.json({
                success: true,
                files: [],
                highFiles: [],
                lowFiles: [],
                message: 'S3 configuration is required to load LoRA files. Please configure S3 settings in the Settings page.'
            });
        }
        
        const s3Service = new S3Service({
            endpointUrl: settings.s3.endpointUrl,
            accessKeyId: settings.s3.accessKeyId,
            secretAccessKey: settings.s3.secretAccessKey,
            bucketName: volume, // 동적으로 선택된 볼륨 사용
            region: settings.s3.region || 'us-east-1',
            timeout: settings.s3.timeout || 3600
        });
        
        // loras/ 폴더에서 .safetensors 파일만 가져오기
        const files = await s3Service.listFiles('loras/');
        
        // .safetensors 확장자만 필터링
        const loraFiles = files.filter(file => 
            file.key.endsWith('.safetensors') && 
            (!file.key.includes('/') || file.key.split('/').length === 2) // loras/ 폴더의 직접 하위 파일만
        );
        
        // high/low 파일들을 구분
        const highFiles = loraFiles.filter(file => 
            file.key.toLowerCase().includes('high')
        );
        const lowFiles = loraFiles.filter(file => 
            file.key.toLowerCase().includes('low')
        );
        
        console.log(`📁 Found ${loraFiles.length} LoRA files:`, loraFiles.map(f => f.key));
        console.log(`🔺 High files: ${highFiles.length}`, highFiles.map(f => f.key));
        console.log(`🔻 Low files: ${lowFiles.length}`, lowFiles.map(f => f.key));
        
        return NextResponse.json({
            success: true,
            files: loraFiles.map(file => ({
                key: file.key,
                name: file.key.replace('loras/', ''), // loras/ 접두사 제거
                size: file.size,
                lastModified: file.lastModified
            })),
            highFiles: highFiles.map(file => ({
                key: file.key,
                name: file.key.replace('loras/', ''),
                size: file.size,
                lastModified: file.lastModified
            })),
            lowFiles: lowFiles.map(file => ({
                key: file.key,
                name: file.key.replace('loras/', ''),
                size: file.size,
                lastModified: file.lastModified
            }))
        });
        
    } catch (error) {
        console.error('❌ Error fetching LoRA files:', error);
        return NextResponse.json(
            { 
                success: false,
                error: `Failed to fetch LoRA files: ${error}`,
                files: [],
                highFiles: [],
                lowFiles: [],
                message: 'S3 configuration error. Please check your S3 settings.'
            },
            { status: 500 }
        );
    }
}
