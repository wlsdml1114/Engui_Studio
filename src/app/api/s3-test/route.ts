// src/app/api/s3-test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import SettingsService from '@/lib/settingsService';
import S3Service from '@/lib/s3Service';

const settingsService = new SettingsService();

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();
        
        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        console.log('🔍 Testing S3 connection for user:', userId);

        // Load user settings
        const { settings } = await settingsService.getSettings(userId);
        
        if (!settings.s3) {
            return NextResponse.json({ 
                error: 'S3 configuration not found',
                requiresSetup: true 
            }, { status: 400 });
        }

        // Validate S3 configuration
        const requiredFields = ['endpointUrl', 'accessKeyId', 'secretAccessKey', 'bucketName', 'region'];
        const missingFields = requiredFields.filter(field => !settings.s3[field]);
        
        if (missingFields.length > 0) {
            return NextResponse.json({ 
                error: `Missing S3 configuration: ${missingFields.join(', ')}`,
                requiresSetup: true 
            }, { status: 400 });
        }

        console.log('🔧 S3 Configuration found:', {
            endpointUrl: settings.s3.endpointUrl,
            bucketName: settings.s3.bucketName,
            region: settings.s3.region,
            accessKeyId: settings.s3.accessKeyId ? `***${settings.s3.accessKeyId.slice(-4)}` : 'missing'
        });

        // Test S3 connection
        try {
            const s3Service = new S3Service({
                endpointUrl: settings.s3.endpointUrl,
                accessKeyId: settings.s3.accessKeyId,
                secretAccessKey: settings.s3.secretAccessKey,
                bucketName: settings.s3.bucketName,
                region: settings.s3.region,
                timeout: settings.s3.timeout || 3600,
            });

            // 간단한 테스트 파일 업로드
            const testData = Buffer.from('Hello S3 Test');
            const testFileName = `test-${Date.now()}.txt`;
            
            console.log('📤 Testing S3 upload...');
            
            const uploadResult = await s3Service.uploadFile(
                testData,
                testFileName,
                'text/plain'
            );

            console.log('✅ S3 upload test successful:', uploadResult);

            // 테스트 파일 삭제 (선택사항)
            // await s3Service.deleteFile(testFileName);

            return NextResponse.json({
                success: true,
                message: 'S3 connection test successful',
                uploadResult,
                config: {
                    endpointUrl: settings.s3.endpointUrl,
                    bucketName: settings.s3.bucketName,
                    region: settings.s3.region,
                    accessKeyId: `***${settings.s3.accessKeyId.slice(-4)}`
                }
            });

        } catch (s3Error) {
            console.error('❌ S3 connection test failed:', s3Error);
            
            return NextResponse.json({
                success: false,
                error: `S3 connection test failed: ${s3Error}`,
                details: s3Error instanceof Error ? s3Error.message : String(s3Error),
                config: {
                    endpointUrl: settings.s3.endpointUrl,
                    bucketName: settings.s3.bucketName,
                    region: settings.s3.region,
                    accessKeyId: `***${settings.s3.accessKeyId.slice(-4)}`
                }
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ S3 test error:', error);
        return NextResponse.json(
            { error: `S3 test failed: ${error}` },
            { status: 500 }
        );
    }
}

