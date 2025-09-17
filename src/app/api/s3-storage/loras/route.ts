import { NextRequest, NextResponse } from 'next/server';
import S3Service from '@/lib/s3Service';

const s3Service = new S3Service();

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Fetching LoRA files from S3...');
        
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
            { error: `Failed to fetch LoRA files: ${error}` },
            { status: 500 }
        );
    }
}
