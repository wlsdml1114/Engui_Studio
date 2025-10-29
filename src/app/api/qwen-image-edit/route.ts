import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface QwenImageEditPayload {
  prompt: string;
  image_base64: string;
  image_base64_2?: string;
  seed: number;
  width: number;
  height: number;
  steps?: number;
  guidance_scale: number;
}

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

// Handler 노드 매핑 설정
interface HandlerNodeMapping {
    imageNode: number;
    imageNode2?: number;
    promptNode: number;
    seedNode: number;
    widthNode: number;
    heightNode: number;
    stepsNode?: number;
    guidanceNode?: number;
    workflowSingleImage?: string;
    workflowDualImage?: string;
}

// 기본 Handler 노드 설정
const DEFAULT_HANDLER_NODES: HandlerNodeMapping = {
    imageNode: 78,
    imageNode2: 123,
    promptNode: 111,
    seedNode: 3,
    widthNode: 128,
    heightNode: 129,
    stepsNode: 130,
    guidanceNode: 131,
    workflowSingleImage: '/qwen_image_edit_1.json',
    workflowDualImage: '/qwen_image_edit_2.json'
};

export async function POST(request: NextRequest) {
    try {
        console.log('🎨 Processing Qwen Image Edit request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string;
        const imageBase64 = formData.get('image') as string; // Base64 encoded image
        const image2Base64 = formData.get('image2') as string | null; // Optional second image
        const imageName = formData.get('imageName') as string; // First image filename
        const imageName2 = formData.get('imageName2') as string | null; // Optional second image filename
        const prompt = formData.get('prompt') as string;
        const width = parseInt(formData.get('width') as string);
        const height = parseInt(formData.get('height') as string);
        const seed = parseInt(formData.get('seed') as string);
        const steps = parseInt(formData.get('steps') as string);
        const guidance = parseFloat(formData.get('guidance') as string);

        // Validate required data
        if (!imageBase64 || !prompt || !width || !height) {
            return NextResponse.json({
                error: 'Missing required fields: image (base64), prompt, width, height',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Load user settings
        console.log('📖 Loading user settings...');
        const { settings } = await settingsService.getSettings(userId);

        // Validate RunPod configuration
        if (!settings.runpod?.apiKey || !settings.runpod?.endpoints?.['qwen-image-edit']) {
            return NextResponse.json({
                error: 'RunPod configuration incomplete. Please configure your API key and Qwen Image Edit endpoint in Settings.',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Get Handler node mapping from settings or use defaults
        const handlerNodes: HandlerNodeMapping = {
            ...DEFAULT_HANDLER_NODES,
            ...((settings as any).qwenImageEditHandler || {})
        };

        console.log('🔧 Handler node mapping:', handlerNodes);

        // 현재 워크스페이스 ID 가져오기
        const currentWorkspaceId = await settingsService.getCurrentWorkspaceId(userId);
        console.log('🏗️ Current workspace ID for job:', currentWorkspaceId);

        // Create job record in database
        const job = await prisma.job.create({
            data: {
                id: Math.random().toString(36).substring(2, 15),
                userId,
                workspaceId: currentWorkspaceId,
                status: 'processing',
                type: 'qwen-image-edit',
                prompt,
                runpodJobId: '',
                options: JSON.stringify({
                    width,
                    height,
                    seed,
                    steps,
                    guidance,
                    hasSecondImage: !!image2Base64,
                    imageName,
                    imageName2: imageName2 || null
                }),
                createdAt: new Date(),
            },
        });

        console.log(`📝 Created job record: ${job.id}`);

        // Deduct credit
        await prisma.creditActivity.create({
            data: {
                userId,
                activity: `Generated Qwen Image Edit (Job ID: ${job.id})`,
                amount: -1,
            },
        });

        // 입력 이미지를 base64로 변환 (File 객체에서)
        const imageFileBuffer = Buffer.from(imageBase64, 'base64');

        // 두 번째 이미지도 처리
        let image2FileBuffer: Buffer | null = null;
        if (image2Base64) {
            image2FileBuffer = Buffer.from(image2Base64, 'base64');
        }

        // 입력 이미지를 로컬에 저장 (input reuse를 위해)
        let imageWebPath = null;
        let imageWebPath2 = null;
        try {
            const inputImagePath = join(LOCAL_STORAGE_DIR, `input_${job.id}.png`);
            writeFileSync(inputImagePath, imageFileBuffer);
            imageWebPath = `/results/input_${job.id}.png`;
            console.log('✅ Input image saved locally:', inputImagePath);

            // 두 번째 이미지도 저장
            if (image2FileBuffer) {
                const inputImagePath2 = join(LOCAL_STORAGE_DIR, `input_${job.id}_2.png`);
                writeFileSync(inputImagePath2, image2FileBuffer);
                imageWebPath2 = `/results/input_${job.id}_2.png`;
                console.log('✅ Second input image saved locally:', inputImagePath2);
            }
        } catch (saveError) {
            console.error('❌ Failed to save input image locally:', saveError);
        }

        // RunPod 입력 준비 - Handler 형식
        const runpodInput = {
            prompt: prompt,
            image_base64: imageFileBuffer.toString('base64'), // base64로 인코딩된 첫 번째 이미지
            ...(image2FileBuffer && { image_base64_2: image2FileBuffer.toString('base64') }), // 두 번째 이미지
            seed: seed === -1 ? 42 : seed,
            width: width,
            height: height,
            ...(steps && { steps: steps }),
            ...(guidance && { guidance_scale: guidance })
        } as QwenImageEditPayload;

        console.log('🚀 RunPod input (Handler format):', {
            prompt: runpodInput.prompt,
            image_base64: `[base64 data - ${imageFileBuffer.length} bytes]`,
            image_base64_2: image2FileBuffer ? `[base64 data - ${image2FileBuffer.length} bytes]` : undefined,
            seed: runpodInput.seed,
            width: runpodInput.width,
            height: runpodInput.height,
            steps: runpodInput.steps,
            guidance_scale: runpodInput.guidance_scale
        });

        // Submit job to RunPod
        let runpodJobId: string;
        try {
            console.log('🔧 Creating RunPod service with user settings...');
            const runpodService = new RunPodService(
                settings.runpod.apiKey,
                settings.runpod.endpoints['qwen-image-edit'],
                settings.runpod.generateTimeout || 3600
            );

            console.log('🔧 Submitting to RunPod with base64 encoded image...');
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

        // Update job with RunPod job ID and input image paths
        await prisma.job.update({
            where: { id: job.id },
            data: {
                runpodJobId,
                options: JSON.stringify({
                    width,
                    height,
                    seed,
                    steps,
                    guidance,
                    hasSecondImage: !!image2Base64,
                    runpodJobId,
                    imageWebPath,
                    imageWebPath2,
                    imageName,
                    imageName2: imageName2 || null,
                }),
            },
        });

        console.log(`✅ Qwen Image Edit job submitted: ${job.id} (RunPod: ${runpodJobId})`);

        // Start background processing
        processQwenImageEditJob(job.id).catch(error => {
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
        console.error('❌ Qwen Image Edit generation error:', error);
        return NextResponse.json(
            { error: `Qwen Image Edit generation failed: ${error}` },
            { status: 500 }
        );
    }
}

// Background processing function
async function processQwenImageEditJob(jobId: string) {
    let job: any = null;

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

        if (!settingsResult.settings || !settingsResult.settings.runpod) {
            throw new Error('RunPod configuration not found');
        }

        const settings = settingsResult.settings;

        // Initialize RunPod service
        const runpodService = new RunPodService(
            settings.runpod!.apiKey,
            settings.runpod!.endpoints['qwen-image-edit'],
            settings.runpod!.generateTimeout || 3600
        );

        // Wait for RunPod job completion
        console.log('⏳ Waiting for RunPod job completion...');
        const result = await runpodService.waitForCompletion(job.runpodJobId!);

        console.log('✅ RunPod job completed!');
        console.log('📊 RunPod result structure:', Object.keys(result));
        console.log('📊 RunPod result output keys:', result.output ? Object.keys(result.output) : 'No output');

        let resultUrl = null;
        let resultBase64 = null;
        let localFilePath = null;

        if (result.output) {
            console.log('🖼️ Checking for image data in RunPod result...');
            console.log('🔍 Available output keys:', Object.keys(result.output));

            // Handler에서 base64로 반환된 이미지 처리
            if (result.output.image) {
                console.log('🖼️ Image data (base64) received from Handler');
                resultBase64 = result.output.image; // Handler에서 base64 문자열로 반환

                try {
                    const imageBuffer = Buffer.from(resultBase64, 'base64');
                    console.log('🖼️ Decoded image buffer size:', imageBuffer.length);

                    const resultImagePath = join(LOCAL_STORAGE_DIR, `result_${jobId}.png`);
                    writeFileSync(resultImagePath, imageBuffer);

                    console.log('✅ Result image saved locally:', resultImagePath);
                    console.log('📁 File size:', imageBuffer.length, 'bytes');

                    resultUrl = `/results/result_${jobId}.png`;
                    localFilePath = resultImagePath;

                } catch (saveError) {
                    console.error('❌ Failed to save result image locally:', saveError);
                    resultUrl = `/api/results/${jobId}.png`;
                    localFilePath = 'failed_to_save';
                }

            } else if (result.output.image_base64) {
                console.log('🖼️ Image base64 data received from Handler');
                resultBase64 = result.output.image_base64;

                try {
                    const imageBuffer = Buffer.from(resultBase64, 'base64');
                    console.log('🖼️ Decoded image buffer size:', imageBuffer.length);

                    const resultImagePath = join(LOCAL_STORAGE_DIR, `result_${jobId}.png`);
                    writeFileSync(resultImagePath, imageBuffer);

                    console.log('✅ Result image saved locally:', resultImagePath);
                    console.log('📁 File size:', imageBuffer.length, 'bytes');

                    resultUrl = `/results/result_${jobId}.png`;
                    localFilePath = resultImagePath;

                } catch (saveError) {
                    console.error('❌ Failed to save result image locally:', saveError);
                    resultUrl = `/api/results/${jobId}.png`;
                    localFilePath = 'failed_to_save';
                }

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
                    localFilePath,
                    resultBase64: resultBase64 ? `[base64 data - ${resultBase64.length} characters]` : null,
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
