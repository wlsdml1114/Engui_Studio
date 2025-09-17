import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const settingsService = new SettingsService();

// 로컬 저장 디렉토리 생성
const LOCAL_STORAGE_DIR = join(process.cwd(), 'public', 'results');

// 디렉토리가 없으면 생성
try {
    mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
} catch (error) {
    console.log('📁 Results directory already exists or cannot be created');
}

export async function POST(request: NextRequest) {
    try {
        console.log('🎨 Processing Flux Krea image generation request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string;
        const prompt = formData.get('prompt') as string;
        const width = parseInt(formData.get('width') as string);
        const height = parseInt(formData.get('height') as string);
        const seed = parseInt(formData.get('seed') as string);
        const guidance = parseFloat(formData.get('guidance') as string);
        const model = formData.get('model') as string;
        
        // LoRA 파라미터 추가
        const lora = formData.get('lora') as string;
        const loraWeight = parseFloat(formData.get('loraWeight') as string) || 1.0;
        
        console.log(`🔍 Received LoRA data: lora="${lora}", loraWeight=${loraWeight}`);

        // Validate required data
        if (!prompt) {
            return NextResponse.json({
                error: 'Missing required fields: prompt',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Load user settings
        console.log('📖 Loading user settings...');
        const { settings } = await settingsService.getSettings(userId);
        
        // Validate RunPod configuration
        if (!settings.runpod || typeof settings.runpod === 'string' || typeof settings.runpod === 'number' || 
            !(settings.runpod as any).apiKey || !(settings.runpod as any).endpoints?.['flux-krea']) {
            return NextResponse.json({
                error: 'RunPod configuration incomplete. Please configure your API key and Flux Krea endpoint in Settings.',
                requiresSetup: true,
            }, { status: 400 });
        }
        
        // Type assertion for settings
        const runpodSettings = settings.runpod as any;

        // Create job record in database
        const job = await prisma.job.create({
            data: {
                id: Math.random().toString(36).substring(2, 15),
                userId,
                status: 'processing',
                type: 'flux-krea',
                prompt,
                options: JSON.stringify({ 
                    width, height, seed, guidance, model,
                    lora, loraWeight 
                }),
                createdAt: new Date(),
            },
        });

        console.log(`📝 Created job record: ${job.id}`);

        // Deduct credit
        await prisma.creditActivity.create({
            data: {
                userId,
                activity: `Generated Flux Krea image (Job ID: ${job.id})`,
                amount: -1, // Flux Krea costs 1 credit
            },
        });

        // Prepare RunPod input (서버 코드에 맞게 lora 배열 형태로 전송)
        const runpodInput = {
            prompt: prompt,
            width: width,
            height: height,
            seed: seed,
            guidance: guidance,
            ...(model && { model: model }),
            ...(lora && { lora: [[lora, loraWeight] as [string, number]] }) // [["filename.safetensors", weight]] 형태로 전송
        };

        console.log('🔧 Final RunPod input structure:');
        console.log('  - prompt:', runpodInput.prompt);
        console.log('  - width:', runpodInput.width);
        console.log('  - height:', runpodInput.height);
        console.log('  - seed:', runpodInput.seed);
        console.log('  - guidance:', runpodInput.guidance);
        if (runpodInput.model) {
            console.log('  - model:', runpodInput.model);
        }
        if (runpodInput.lora) {
            console.log('  - lora:', runpodInput.lora);
            console.log('  - lora count:', runpodInput.lora.length);
        }

        console.log('🚀 Submitting job to RunPod...');

        // Submit job to RunPod using user settings
        let runpodJobId: string;
        try {
            console.log('🔧 Creating RunPod service with user settings...');
            const runpodService = new RunPodService(
                runpodSettings.apiKey,
                runpodSettings.endpoints['flux-krea'],
                runpodSettings.generateTimeout || 1800
            );

            // base64 데이터를 제외한 로그만 출력
            console.log('🔧 Submitting to RunPod with input:', runpodInput);
            runpodJobId = await runpodService.submitJob(runpodInput);

            console.log(`✅ RunPod job submitted successfully: ${runpodJobId}`);
        } catch (runpodError) {
            console.error('❌ RunPod submission failed:', runpodError);

            // Update job status to failed
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                },
            });

            return NextResponse.json({
                error: `RunPod submission failed: ${runpodError}`,
                jobId: job.id,
                status: 'failed',
            }, { status: 500 });
        }

        // Update job with RunPod job ID
        await prisma.job.update({
            where: { id: job.id },
            data: {
                runpodJobId,
                options: JSON.stringify({
                    width,
                    height,
                    seed,
                    guidance,
                    model,
                    runpodJobId,
                }),
            },
        });

        console.log(`✅ Flux Krea job submitted: ${job.id} (RunPod: ${runpodJobId})`);

        // 백그라운드에서 작업 상태 확인 및 결과 처리 (비동기)
        // 사용자는 즉시 응답을 받고 다른 작업을 할 수 있음
        processFluxKreaJob(job.id, runpodJobId, runpodSettings, prisma).catch(error => {
            console.error(`❌ Background processing failed for job ${job.id}:`, error);
        });

        return NextResponse.json({
            success: true,
            jobId: job.id,
            runpodJobId,
            status: 'processing',
            message: 'Flux Krea 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.'
        });

    } catch (error) {
        console.error('❌ Flux Krea generation error:', error);
        return NextResponse.json(
            { error: `Flux Krea generation failed: ${error}` },
            { status: 500 }
        );
    }
}

// 백그라운드 작업 처리 함수
async function processFluxKreaJob(jobId: string, runpodJobId: string, runpodSettings: any, prisma: PrismaClient) {
    try {
        console.log(`🔄 Starting background processing for Flux Krea job: ${jobId} (RunPod: ${runpodJobId})`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
        
        const runpodService = new RunPodService(
            runpodSettings.apiKey,
            runpodSettings.endpoints['flux-krea'],
            runpodSettings.generateTimeout || 1800
        );

        console.log(`⏳ Waiting for RunPod job completion... (timeout: ${runpodSettings.generateTimeout || 1800}초)`);
        
        // RunPod 작업 완료 대기
        const result = await runpodService.waitForCompletion(runpodJobId);
        
        console.log(`✅ RunPod job ${runpodJobId} completed with status: ${result.status}`);
        console.log(`⏰ Completed at: ${new Date().toISOString()}`);
        
        if (result.status === 'COMPLETED' && result.output) {
            console.log(`✅ Flux Krea job ${jobId} completed successfully!`);
            
            let resultUrl: string;
            let runpodResultUrl: string = 'unknown';
            
            // 이미지 결과 찾기 (FLUX KONTEXT 방식 참조)
            console.log('🔍 Checking for image data in RunPod result...');
            console.log('🔍 Available output keys:', Object.keys(result.output));
            
            if (result.output.image) {
                console.log('🖼️ Image data received from RunPod');
                console.log('🖼️ Image data length:', result.output.image.length);
                
                try {
                    const imageBuffer = Buffer.from(result.output.image, 'base64');
                    console.log('🖼️ Decoded image buffer size:', imageBuffer.length);
                    
                    // 로컬에 결과 이미지 저장 (PNG 확장자 명시)
                    const resultImagePath = join(LOCAL_STORAGE_DIR, `result_${jobId}.png`);
                    writeFileSync(resultImagePath, imageBuffer);
                    
                    console.log('✅ Result image saved locally:', resultImagePath);
                    console.log('📁 File size:', imageBuffer.length, 'bytes');
                    
                    // 웹에서 접근 가능한 경로 설정
                    resultUrl = `/results/result_${jobId}.png`;
                    runpodResultUrl = resultImagePath;
                    
                } catch (saveError) {
                    console.error('❌ Failed to save result image locally:', saveError);
                    resultUrl = `/api/results/${jobId}.png`;
                    runpodResultUrl = 'failed_to_save';
                }
                
            } else if (result.output.image_base64) {
                // 기존 image_base64 지원 (하위 호환성)
                console.log('🖼️ Image base64 data received from RunPod (legacy)');
                console.log('🖼️ Base64 length:', result.output.image_base64.length, 'characters');
                
                try {
                    const imageBuffer = Buffer.from(result.output.image_base64, 'base64');
                    console.log('🖼️ Decoded image buffer size:', imageBuffer.length);
                    
                    // 로컬에 결과 이미지 저장 (PNG 확장자 명시)
                    const resultImagePath = join(LOCAL_STORAGE_DIR, `result_${jobId}.png`);
                    writeFileSync(resultImagePath, imageBuffer);
                    
                    console.log('✅ Result image saved locally:', resultImagePath);
                    console.log('📁 File size:', imageBuffer.length, 'bytes');
                    
                    // 웹에서 접근 가능한 경로 설정
                    resultUrl = `/results/result_${jobId}.png`;
                    runpodResultUrl = resultImagePath;
                    
                } catch (saveError) {
                    console.error('❌ Failed to save result image locally:', saveError);
                    resultUrl = `/api/results/${jobId}.png`;
                    runpodResultUrl = 'failed_to_save';
                }
                
            } else {
                console.warn('⚠️ No image data found in RunPod output');
                resultUrl = `/api/results/${jobId}.png`;
                runpodResultUrl = 'unknown';
            }

            // 작업 상태를 완료로 업데이트
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'completed',
                    resultUrl,
                    completedAt: new Date(),
                    options: JSON.stringify({
                        ...JSON.parse((await prisma.job.findUnique({ where: { id: jobId } }))?.options || '{}'),
                        runpodResultUrl,
                        runpodOutput: result.output,
                        completedAt: new Date().toISOString(),
                        processingTime: `${Math.round((Date.now() - new Date((await prisma.job.findUnique({ where: { id: jobId } }))?.createdAt || Date.now()).getTime()) / 1000)}초`
                    })
                },
            });

            console.log(`✅ Job ${jobId} marked as completed with result URL: ${resultUrl}`);
            console.log(`✅ RunPod result URL: ${runpodResultUrl}`);
            console.log(`🎉 Flux Krea image generation completed successfully!`);

        } else {
            console.error('❌ RunPod job failed or no output');
            console.error('Status:', result.status);
            console.error('Error:', result.error);
            console.error('Output:', result.output);
            
            // 작업 상태를 실패로 업데이트
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                    options: JSON.stringify({
                        ...JSON.parse((await prisma.job.findUnique({ where: { id: jobId } }))?.options || '{}'),
                        error: result.error,
                        failedAt: new Date().toISOString()
                    })
                },
            });
            
            throw new Error(`RunPod job failed: ${result.error}`);
        }

    } catch (error) {
        console.error(`❌ Background processing error for job ${jobId}:`, error);
        console.error(`⏰ Error occurred at: ${new Date().toISOString()}`);
        
        // 작업 상태를 실패로 업데이트
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'failed',
                completedAt: new Date(),
                options: JSON.stringify({
                    ...JSON.parse((await prisma.job.findUnique({ where: { id: jobId } }))?.options || '{}'),
                    error: error instanceof Error ? error.message : String(error),
                    failedAt: new Date().toISOString()
                })
            },
        });
        
        throw error;
    }
}
