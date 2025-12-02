import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

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
        console.log('🎨 Processing FLUX KONTEXT image generation request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string;
        const imageFile = formData.get('image') as File;
        const prompt = formData.get('prompt') as string;
        const width = parseInt(formData.get('width') as string);
        const height = parseInt(formData.get('height') as string);
        const seed = parseInt(formData.get('seed') as string);
        const cfg = parseFloat(formData.get('cfg') as string);

        // Validate required data
        if (!imageFile || !prompt || !width || !height) {
            return NextResponse.json({
                error: 'Missing required fields: image, prompt, width, height',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Load user settings
        console.log('📖 Loading user settings...');
        const { settings } = await settingsService.getSettings(userId);
        
        // Validate RunPod configuration
        if (!settings.runpod?.apiKey || !settings.runpod?.endpoints?.['flux-kontext']) {
            return NextResponse.json({
                error: 'RunPod configuration incomplete. Please configure your API key and FLUX KONTEXT endpoint in Settings.',
                requiresSetup: true,
            }, { status: 400 });
        }

        // 현재 워크스페이스 ID 가져오기
        const currentWorkspaceId = await settingsService.getCurrentWorkspaceId(userId);
        console.log('🏗️ Current workspace ID for job:', currentWorkspaceId);

        // Create job record in database
        const job = await prisma.job.create({
            data: {
                id: uuidv4(),
                userId,
                workspaceId: currentWorkspaceId, // 워크스페이드 ID 추가
                status: 'processing',
                type: 'image',
                modelId: 'flux-kontext',
                prompt,
                runpodJobId: '', // 초기값으로 빈 문자열 설정
                options: JSON.stringify({ width, height, seed, cfg }),
                createdAt: new Date(),
            },
        });

        console.log(`📝 Created job record: ${job.id}`);

        // Deduct credit
        await prisma.creditActivity.create({
            data: {
                userId,
                activity: `Generated FLUX KONTEXT image (Job ID: ${job.id})`,
                amount: -1, // FLUX KONTEXT costs 1 credit
            },
        });

        // 입력 이미지를 로컬에 저장
        const inputImageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const inputImagePath = join(LOCAL_STORAGE_DIR, `input_${job.id}_${imageFile.name}`);
        
        try {
            writeFileSync(inputImagePath, inputImageBuffer);
            console.log('✅ Input image saved locally:', inputImagePath);
        } catch (saveError) {
            console.error('❌ Failed to save input image locally:', saveError);
            
            // Update job status to failed
            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                },
            });

            return NextResponse.json({
                error: `Failed to save input image locally: ${saveError}`,
                jobId: job.id,
                status: 'failed',
            }, { status: 500 });
        }

        // RunPod 입력 준비
        const runpodInput = {
            prompt: prompt,
            image_path: inputImageBuffer.toString('base64'), // base64 데이터로 전송
            width: width,
            height: height,
            seed: seed === -1 ? 42 : seed, // -1일 때 기본값 42 사용
            guidance: cfg // cfg 값을 guidance 필드로 전달
        };

        console.log('🚀 RunPod input:', runpodInput);

        // Submit job to RunPod
        let runpodJobId: string;
        try {
            console.log('🔧 Creating RunPod service with user settings...');
            const runpodService = new RunPodService(
                settings.runpod.apiKey,
                settings.runpod.endpoints['flux-kontext'],
                settings.runpod.generateTimeout || 3600
            );

            console.log('🔧 Submitting to RunPod with input:', JSON.stringify(runpodInput, null, 2));
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

        // Update job with RunPod job ID and input image info
        await prisma.job.update({
            where: { id: job.id },
            data: {
                runpodJobId, // 실제 RunPod job ID로 업데이트
                options: JSON.stringify({
                    width,
                    height,
                    seed,
                    cfg,
                    runpodJobId,
                    inputImagePath: inputImagePath, // 로컬 입력 이미지 경로
                    inputImageName: `input_${job.id}_${imageFile.name}`, // 실제 저장된 파일명
                }),
            },
        });

        console.log(`✅ FLUX KONTEXT job submitted: ${job.id} (RunPod: ${runpodJobId})`);

        // Start background processing
        processFluxKontextJob(job.id).catch(error => {
            console.error(`❌ Background processing error for job ${job.id}:`, error);
            console.error(`❌ Error details:`, {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'No stack trace',
                jobId: job.id
            });
        });

        return NextResponse.json({
            success: true,
            jobId: job.id,
            runpodJobId,
            status: 'processing',
        });

    } catch (error) {
        console.error('❌ FLUX KONTEXT generation error:', error);
        return NextResponse.json(
            { error: `FLUX KONTEXT generation failed: ${error}` },
            { status: 500 }
        );
    }
}

// Background processing function
async function processFluxKontextJob(jobId: string) {
    let job: any = null; // job 변수를 함수 스코프에서 선언
    
    try {
        console.log(`🔄 Starting background processing for job ${jobId}`);
        
        // Get job details
        job = await prisma.job.findUnique({
            where: { id: jobId },
        });
        
        if (!job) {
            console.error(`❌ Job ${jobId} not found`);
            return;
        }
        
        // Get user settings
        const settingsResult = await settingsService.getSettings('user-with-settings');
        
        // SettingsService는 { settings, status } 형태로 반환
        if (!settingsResult.settings || !settingsResult.settings.runpod) {
            throw new Error('RunPod configuration not found');
        }
        
        const settings = settingsResult.settings;
        
        // Initialize RunPod service
        const runpodService = new RunPodService(
            settings.runpod!.apiKey,
            settings.runpod!.endpoints['flux-kontext'],
            settings.runpod!.generateTimeout || 3600
        );
        
        // Wait for RunPod job completion
        console.log('⏳ Waiting for RunPod job completion...');
        const result = await runpodService.waitForCompletion(job.runpodJobId!);
        
        console.log('✅ RunPod job completed!');
        console.log('📊 RunPod result structure:', Object.keys(result));
        console.log('📊 RunPod result output keys:', result.output ? Object.keys(result.output) : 'No output');
        
        let resultUrl = null;
        let localFilePath = null;
        
        if (result.output) {
            console.log('�� Checking for image data in RunPod result...');
            console.log('🔍 Available output keys:', Object.keys(result.output));
            console.log('🔍 Full output structure:', JSON.stringify(result.output, null, 2));
            
            // RunPod 응답에서 image 필드 찾기 (image_base64가 아님!)
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
                    localFilePath = resultImagePath;
                    
                } catch (saveError) {
                    console.error('❌ Failed to save result image locally:', saveError);
                    console.error('❌ Save error details:', saveError);
                    resultUrl = `/api/results/${jobId}.png`;
                    localFilePath = 'failed_to_save';
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
                    localFilePath = resultImagePath;
                    
                } catch (saveError) {
                    console.error('❌ Failed to save result image locally:', saveError);
                    console.error('❌ Save error details:', saveError);
                    resultUrl = `/api/results/${jobId}.png`;
                    localFilePath = 'failed_to_save';
                }
                
            } else if (result.output.image_url) {
                console.log('🖼️ Image URL received:', result.output.image_url);
                resultUrl = result.output.image_url;
                localFilePath = 'url_result';
                
            } else if (result.output.output_url) {
                console.log('🖼️ Output URL received:', result.output.output_url);
                resultUrl = result.output.output_url;
                localFilePath = 'url_result';
                
            } else {
                console.log('⚠️ No image data found in RunPod result');
                console.log('🔍 Available output keys:', Object.keys(result.output));
                resultUrl = `/api/results/${jobId}.png`;
                localFilePath = 'no_image_data';
            }
        } else {
            console.log('⚠️ No output in RunPod result');
            resultUrl = `/api/results/${jobId}.png`;
            localFilePath = 'no_output';
        }
        
        // Update job status to completed with result URL
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'completed',
                resultUrl,
                completedAt: new Date(),
                options: JSON.stringify({
                    ...JSON.parse(job.options || '{}'),
                    localFilePath, // 로컬 파일 경로 저장
                    runpodOutput: Object.keys(result.output || {}).reduce((acc: any, key: string) => {
                        const value = result.output[key];
                        if (typeof value === 'string' && value.length > 1000) {
                            acc[key] = `${value.substring(0, 100)}... (${value.length} characters)`;
                        } else {
                            acc[key] = value;
                        }
                        return acc;
                    }, {}),
                    completedAt: new Date().toISOString()
                })
            },
        });
        
        console.log(`✅ Job ${jobId} marked as completed with result URL: ${resultUrl}`);
        console.log(`✅ Local file path: ${localFilePath}`);
        
    } catch (error) {
        console.error(`❌ Background processing failed for job ${jobId}:`, error);
        
        // Update job status to failed - job 변수가 정의된 경우에만 사용
        if (job) {
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                    options: JSON.stringify({
                        ...JSON.parse(job.options || '{}'),
                        error: error instanceof Error ? error.message : String(error),
                        completedAt: new Date().toISOString()
                    })
                },
            });
        } else {
            // job을 찾을 수 없는 경우 기본 정보로 업데이트
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                    options: JSON.stringify({
                        error: error instanceof Error ? error.message : String(error),
                        completedAt: new Date().toISOString()
                    })
                },
            });
        }
    }
}
