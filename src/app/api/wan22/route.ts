import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import S3Service from '@/lib/s3Service';
import { processFileUpload } from '@/lib/serverFileUtils';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getApiMessage } from '@/lib/apiMessages';
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

// S3에 파일 업로드 (Infinite Talk 방식과 동일)
async function uploadToS3(file: File, fileName: string, language: 'ko' | 'en' = 'ko'): Promise<string> {
    const { settings } = await settingsService.getSettings('user-with-settings');
    
    if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
        throw new Error(getApiMessage('S3', 'SETTINGS_NOT_CONFIGURED', language));
    }

    const s3Service = new S3Service({
        endpointUrl: settings.s3.endpointUrl,
        accessKeyId: settings.s3.accessKeyId,
        secretAccessKey: settings.s3.secretAccessKey,
        bucketName: settings.s3.bucketName || 'my-bucket',
        region: settings.s3.region || 'us-east-1',
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const result = await s3Service.uploadFile(fileBuffer, fileName, file.type);
    
    // RunPod에서 사용할 경로 반환 (runpod-volume 형식)
    return result.filePath;
}

export async function POST(request: NextRequest) {
    try {
        console.log('🎬 Processing WAN 2.2 video generation request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string;
        const language = formData.get('language') as 'ko' | 'en' || 'ko';
        const prompt = formData.get('prompt') as string;
        const width = parseInt(formData.get('width') as string);
        const height = parseInt(formData.get('height') as string);
        const seed = parseInt(formData.get('seed') as string);
        const cfg = parseFloat(formData.get('cfg') as string) || 1; // 기본값: 1
        const length = parseInt(formData.get('length') as string) || 81; // 기본값: 81
        const step = parseInt(formData.get('step') as string) || 10; // 기본값: 10
        const contextOverlap = parseInt(formData.get('contextOverlap') as string) || 48; // 기본값: 48
        
        // LoRA pair 파라미터 추가 (최대 4개)
        const loraCount = Math.min(parseInt(formData.get('loraCount') as string) || 0, 4);
        console.log(`🔍 Received loraCount: ${loraCount} (max 4)`);

        const loraPairs: Array<{high: string, low: string, high_weight: number, low_weight: number}> = [];

        for (let i = 0; i < loraCount; i++) {
            const loraHigh = formData.get(`loraHigh_${i}`) as string;
            const loraLow = formData.get(`loraLow_${i}`) as string;
            const loraHighWeight = parseFloat(formData.get(`loraHighWeight_${i}`) as string) || 1.0;
            const loraLowWeight = parseFloat(formData.get(`loraLowWeight_${i}`) as string) || 1.0;

            console.log(`🔍 LoRA ${i}: high="${loraHigh}", low="${loraLow}", high_weight=${loraHighWeight}, low_weight=${loraLowWeight}`);

            if (loraHigh && loraLow) {
                loraPairs.push({
                    high: loraHigh, // 파일명만 사용
                    low: loraLow, // 파일명만 사용
                    high_weight: loraHighWeight,
                    low_weight: loraLowWeight
                });
                console.log(`✅ LoRA pair ${i} added: high="${loraHigh}", low="${loraLow}"`);
            } else {
                console.log(`❌ LoRA pair ${i} skipped: missing high or low file`);
            }
        }

        console.log(`📊 Final loraPairs array:`, loraPairs);
        
        const imageFile = formData.get('image') as File;
        const endImageFile = formData.get('endImage') as File | null;

        // Debug: End frame file reception
        console.log('🔍 End frame file debug:');
        console.log('  - endImageFile exists:', !!endImageFile);
        console.log('  - endImageFile type:', typeof endImageFile);
        if (endImageFile) {
            console.log('  - endImageFile name:', endImageFile.name);
            console.log('  - endImageFile size:', endImageFile.size);
            console.log('  - endImageFile type:', endImageFile.type);
        }

        // Validate required data
        if (!imageFile || !prompt) {
            return NextResponse.json({
                error: 'Missing required fields: image, prompt',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Load user settings
        console.log('📖 Loading user settings...');
        const { settings } = await settingsService.getSettings(userId);
        
        // Validate RunPod configuration
        if (!settings.runpod || typeof settings.runpod === 'string' || typeof settings.runpod === 'number' || 
            !(settings.runpod as any).apiKey || !(settings.runpod as any).endpoints?.wan22) {
            return NextResponse.json({
                error: 'RunPod configuration incomplete. Please configure your API key and WAN 2.2 endpoint in Settings.',
                requiresSetup: true,
            }, { status: 400 });
        }
        
        // Type assertion for settings
        const runpodSettings = settings.runpod as any;

        // 자격 로그(마스킹)
        try {
            console.log('🔐 RunPod credentials (masked):', {
                endpointId: runpodSettings?.endpoints?.wan22,
                apiKeyTail: runpodSettings?.apiKey ? String(runpodSettings.apiKey).slice(-6) : 'none',
                apiKeyLen: runpodSettings?.apiKey ? String(runpodSettings.apiKey).length : 0,
            });
        } catch {}

        // 사전 헬스 체크로 인증 상태 확인
        try {
            const healthUrl = `https://api.runpod.ai/v2/${runpodSettings.endpoints.wan22}/health`;
            const healthResp = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${runpodSettings.apiKey}`,
                    'accept': 'application/json',
                },
            });
            console.log('🩺 RunPod health preflight:', healthResp.status);
            if (healthResp.status === 401) {
                return NextResponse.json({
                    error: getApiMessage('RUNPOD', 'AUTH_FAILED', language),
                    details: 'Preflight /health returned 401 with current credentials.'
                }, { status: 400 });
            }
        } catch (preErr) {
            console.warn('⚠️ RunPod health preflight failed:', preErr);
        }

        // 현재 워크스페이스 ID 가져오기
        let currentWorkspaceId = await settingsService.getCurrentWorkspaceId(userId);
        console.log('🏗️ Current workspace ID for job:', currentWorkspaceId);

        // currentWorkspaceId가 없다면 기본 워크스페이스 찾기
        if (!currentWorkspaceId) {
            console.log('🔍 No current workspace set, finding default workspace...');
            const defaultWorkspace = await prisma.workspace.findFirst({
                where: {
                    userId,
                    isDefault: true
                }
            });

            if (defaultWorkspace) {
                currentWorkspaceId = defaultWorkspace.id;
                console.log('✅ Found default workspace:', currentWorkspaceId);

                // 이 워크스페이스를 현재 워크스페이스로 설정
                await settingsService.setCurrentWorkspaceId(userId, currentWorkspaceId);
            } else {
                console.log('⚠️ No default workspace found, creating one...');

                // workspace 초기화 API 호출
                try {
                    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/workspaces/initialize`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ userId })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        currentWorkspaceId = data.workspace.id;
                        console.log('✅ Created and initialized default workspace:', currentWorkspaceId);
                    } else {
                        console.error('❌ Failed to initialize workspace');
                    }
                } catch (initError) {
                    console.error('❌ Error initializing workspace:', initError);
                }
            }
        }

        // Create job record in database
        const job = await prisma.job.create({
            data: {
                id: uuidv4(),
                userId,
                workspaceId: currentWorkspaceId, // 워크스페이스 ID 추가
                status: 'processing',
                type: 'wan22',
                prompt,
                options: JSON.stringify({
                    width, height, seed, cfg, length, step, contextOverlap,
                    loraCount, loraPairs
                }),
                createdAt: new Date(),
            },
        });

        console.log(`📝 Created job record: ${job.id}`);

        // Deduct credit
        await prisma.creditActivity.create({
            data: {
                userId,
                activity: `Generated WAN 2.2 video (Job ID: ${job.id})`,
                amount: -2, // WAN 2.2 costs more credits
            },
        });

        // 이미지를 S3에 업로드
        const imageFileName = `input_${job.id}_${imageFile.name}`;
        let s3ImagePath: string;

        try {
            console.log('📤 Uploading image to S3...');
            s3ImagePath = await uploadToS3(imageFile, imageFileName, language);
            console.log('✅ Image uploaded to S3:', s3ImagePath);
        } catch (s3Error) {
            console.error('❌ Failed to upload image to S3:', s3Error);
            return NextResponse.json({
                error: getApiMessage('RUNPOD', 'S3_UPLOAD_FAILED', language),
                requiresSetup: true,
            }, { status: 400 });
        }

        // 로컬에도 백업 저장 (웹 접근용)
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const localImagePath = join(LOCAL_STORAGE_DIR, imageFileName);

        try {
            writeFileSync(localImagePath, imageBuffer);
            console.log('✅ Image saved locally (backup):', localImagePath);
        } catch (saveError) {
            console.error('❌ Failed to save image locally (backup):', saveError);
            // 로컬 저장 실패해도 계속 진행
        }

        // End frame 처리 (있는 경우) - 헬퍼 함수 사용
        let endImagePath: string | undefined;
        let endImageWebPath: string | undefined;

        if (endImageFile) {
            console.log('🎯 End frame provided, processing...');
            const endImageFileName = `end_${job.id}_${endImageFile.name}`;

            try {
                const uploadResult = await processFileUpload(
                    endImageFile,
                    endImageFileName,
                    uploadToS3,
                    LOCAL_STORAGE_DIR
                );

                endImagePath = uploadResult.s3Path;
                endImageWebPath = uploadResult.webPath;
                console.log('✅ End frame upload completed:', { s3Path: endImagePath, webPath: endImageWebPath });
            } catch (s3Error) {
                console.error('❌ Failed to upload end frame to S3:', s3Error);
                console.error('❌ S3 Error details:', {
                    message: s3Error instanceof Error ? s3Error.message : String(s3Error),
                    stack: s3Error instanceof Error ? s3Error.stack : undefined,
                    fileName: endImageFileName
                });
                // End frame 업로드 실패해도 계속 진행 (optional이므로)
                console.log('⚠️ Continuing without end frame due to upload failure');
                endImagePath = undefined;
                endImageWebPath = undefined;
            }
        } else {
            console.log('ℹ️ No end frame provided');
        }

        // Prepare RunPod input with S3 image path
        const runpodInput: any = {
            prompt: prompt,
            image_path: s3ImagePath, // S3 경로 사용
            width: width,
            height: height,
            seed: seed,
            cfg: cfg,
            length: length,
            steps: step, // steps로 변경
            context_overlap: contextOverlap, // context overlap 설정 추가
            // LoRA pair 설정 추가
            lora_pairs: loraPairs
        };

        // End frame이 있는 경우 runpodInput에 추가
        console.log('🔍 Checking endImagePath before adding to payload:', endImagePath);
        if (endImagePath) {
            runpodInput.end_image_path = endImagePath;
            console.log('🎯 End frame added to RunPod input:', endImagePath);
        } else {
            console.log('❌ No endImagePath to add to payload. Possible reasons:');
            console.log('  - No end frame file provided');
            console.log('  - End frame S3 upload failed');
            console.log('  - endImagePath variable was undefined/null');
        }

        console.log('🔧 Final RunPod input structure:');
        console.log('  - prompt:', runpodInput.prompt);
        console.log('  - image_path:', runpodInput.image_path);
        console.log('  - width:', runpodInput.width);
        console.log('  - height:', runpodInput.height);
        console.log('  - seed:', runpodInput.seed);
        console.log('  - cfg:', runpodInput.cfg);
        console.log('  - length:', runpodInput.length);
        console.log('  - steps:', runpodInput.steps);
        console.log('  - context_overlap:', runpodInput.context_overlap);
        console.log('  - lora_pairs:', runpodInput.lora_pairs);
        if (runpodInput.end_image_path) {
            console.log('  - end_image_path:', runpodInput.end_image_path);
        }
        console.log('📁 S3 이미지 경로 전달 완료: serverless에서 S3 경로 사용');

        // RunPod 입력 로그 출력
        console.log('🚀 Submitting job to RunPod...', runpodInput);

        // Submit job to RunPod using user settings
        let runpodJobId: string;
        try {
            console.log('🔧 Creating RunPod service with user settings...');
            const runpodService = new RunPodService(
                runpodSettings.apiKey,
                runpodSettings.endpoints.wan22,
                runpodSettings.generateTimeout || 3600
            );

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

        // Update job with RunPod job ID and S3 paths
        await prisma.job.update({
            where: { id: job.id },
            data: {
                runpodJobId,
                options: JSON.stringify({
                    width,
                    height,
                    seed,
                    cfg,
                    length,
                    step,
                    contextOverlap,
                    loraCount,
                    loraPairs,
                    runpodJobId,
                    // S3 이미지 경로
                    s3ImagePath,
                    // 로컬 이미지 경로 (백업용)
                    localImagePath,
                    // 로컬 이미지 웹 경로 (이미지 표시용)
                    imageWebPath: `/results/${imageFileName}`,
                    // End frame 정보 (있는 경우)
                    ...(endImagePath && {
                        endImagePath,
                        endImageWebPath
                    }),
                }),
            },
        });

        console.log(`✅ WAN 2.2 job submitted: ${job.id} (RunPod: ${runpodJobId})`);

        // 백그라운드에서 작업 상태 확인 및 결과 처리 (비동기)
        // 사용자는 즉시 응답을 받고 다른 작업을 할 수 있음
        processWan22Job(job.id, runpodJobId, runpodSettings, prisma).catch(error => {
            console.error(`❌ Background processing failed for job ${job.id}:`, error);
        });

        return NextResponse.json({
            success: true,
            jobId: job.id,
            runpodJobId,
            status: 'processing',
            message: getApiMessage('JOB_STARTED', 'wan22', language)
        });

    } catch (error) {
        console.error('❌ WAN 2.2 generation error:', error);
        return NextResponse.json(
            { error: `WAN 2.2 generation failed: ${error}` },
            { status: 500 }
        );
    }
}

// 백그라운드 작업 처리 함수
async function processWan22Job(jobId: string, runpodJobId: string, runpodSettings: any, prisma: PrismaClient) {
    try {
        console.log(`🔄 Starting background processing for WAN 2.2 job: ${jobId} (RunPod: ${runpodJobId})`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
        
        const runpodService = new RunPodService(
            runpodSettings.apiKey,
            runpodSettings.endpoints.wan22,
            runpodSettings.generateTimeout || 3600
        );

        console.log(`⏳ Waiting for RunPod job completion... (timeout: ${runpodSettings.generateTimeout || 3600}초)`);
        
        // RunPod 작업 완료 대기
        const result = await runpodService.waitForCompletion(runpodJobId);
        
        console.log(`✅ RunPod job ${runpodJobId} completed with status: ${result.status}`);
        console.log(`⏰ Completed at: ${new Date().toISOString()}`);
        
        if (result.status === 'COMPLETED' && result.output) {
            console.log(`✅ WAN 2.2 job ${jobId} completed successfully!`);
            
            let resultUrl: string;
            let runpodResultUrl: string = 'unknown';
            
            // 비디오 결과 찾기
            if (result.output.video) {
                resultUrl = result.output.video;
                runpodResultUrl = result.output.video;
                console.log(`🎬 Found video result`);
            } else if (result.output.mp4) {
                resultUrl = result.output.mp4;
                runpodResultUrl = result.output.mp4;
                console.log(`🎬 Found MP4 result`);
            } else if (result.output.result) {
                resultUrl = result.output.result;
                runpodResultUrl = result.output.result;
                console.log(`🎬 Found result`);
            } else {
                console.warn('⚠️ No video data found in RunPod output');
                
                // 폴백: 기본 경로 설정
                resultUrl = `/api/results/${jobId}.mp4`;
                runpodResultUrl = 'unknown';
            }

            // RunPod에서 base64 인코딩된 비디오 데이터 처리
            let videoData: string | null = null;
            let videoFormat: string = 'mp4';
            
            // video 필드에 base64 데이터가 있는지 확인
            if (result.output.video && typeof result.output.video === 'string' && 
                result.output.video.length > 100 && !result.output.video.startsWith('http')) {
                // video 필드가 base64 데이터로 보이는 경우 (길이가 길고 URL이 아닌 경우)
                videoData = result.output.video;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 video data in video field, length: ${videoData?.length} characters`);
            } else if (result.output.mp4 && typeof result.output.mp4 === 'string' && 
                       result.output.mp4.length > 100 && !result.output.mp4.startsWith('http')) {
                // mp4 필드에 base64 데이터가 있는 경우
                videoData = result.output.mp4;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 MP4 data in mp4 field, length: ${videoData?.length} characters`);
            } else if (result.output.result && typeof result.output.result === 'string' && 
                       result.output.result.length > 100 && !result.output.result.startsWith('http')) {
                // result 필드에 base64 데이터가 있는 경우
                videoData = result.output.result;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 result data in result field, length: ${videoData?.length} characters`);
            }

            // base64 비디오 데이터를 디코딩하여 로컬에 저장
            if (videoData && typeof videoData === 'string' && videoData.length > 0) {
                try {
                    console.log(`🔓 Decoding base64 video data...`);
                    
                    // base64 데이터를 Buffer로 변환
                    const videoBuffer = Buffer.from(videoData, 'base64');
                    console.log(`✅ Decoded video buffer size: ${videoBuffer.length} bytes`);
                    
                    // 로컬에 비디오 파일 저장
                    const videoFileName = `wan22_result_${jobId}.${videoFormat}`;
                    const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
                    
                    writeFileSync(videoPath, videoBuffer);
                    console.log(`✅ Video saved locally: ${videoPath}`);
                    
                    // resultUrl을 로컬 웹 경로로 설정
                    resultUrl = `/results/${videoFileName}`;
                    runpodResultUrl = `local:${videoPath}`;
                    
                    console.log(`🔄 Set resultUrl to local path: ${resultUrl}`);
                    
                } catch (decodeError) {
                    console.error(`❌ Error decoding base64 video data:`, decodeError);
                    console.log(`💡 Using original resultUrl: ${resultUrl}`);
                }
            } else {
                // base64 데이터가 없는 경우 기존 로직 사용
                console.log(`💡 No base64 video data found, using original result handling`);
                
                // RunPod URL이 외부 URL인 경우 로컬 경로로 변환 시도
                if (resultUrl && (resultUrl.startsWith('http://') || resultUrl.startsWith('https://'))) {
                    console.log(`🌐 RunPod returned external URL: ${resultUrl}`);
                    console.log(`💡 Converting to local path for web access`);
                    
                    // 외부 URL을 로컬 파일명으로 변환
                    const urlParts = resultUrl.split('/');
                    const fileName = urlParts[urlParts.length - 1] || `${jobId}.mp4`;
                    resultUrl = `/results/${fileName}`;
                    
                    console.log(`🔄 Converted to local path: ${resultUrl}`);
                }

                // RunPod 결과 비디오를 로컬에 다운로드
                if (runpodResultUrl && runpodResultUrl !== 'unknown' && 
                    (runpodResultUrl.startsWith('http://') || runpodResultUrl.startsWith('https://'))) {
                    try {
                        console.log(`📥 Downloading video from RunPod: ${runpodResultUrl}`);
                        
                        const videoResponse = await fetch(runpodResultUrl);
                        if (videoResponse.ok) {
                            const videoBuffer = await videoResponse.arrayBuffer();
                            const videoFileName = `wan22_result_${jobId}.mp4`;
                            const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
                            
                            writeFileSync(videoPath, Buffer.from(videoBuffer));
                            console.log(`✅ Video downloaded and saved locally: ${videoPath}`);
                            
                            // resultUrl을 로컬 웹 경로로 설정
                            resultUrl = `/results/${videoFileName}`;
                            console.log(`🔄 Updated resultUrl to local path: ${resultUrl}`);
                        } else {
                            console.warn(`⚠️ Failed to download video from RunPod: ${videoResponse.status}`);
                        }
                    } catch (downloadError) {
                        console.error(`❌ Error downloading video from RunPod:`, downloadError);
                        console.log(`💡 Using original resultUrl: ${resultUrl}`);
                    }
                }
            }

            // 작업 상태를 완료로 업데이트
            // runpodOutput에서 base64 데이터 제외 (DB 크기 절약)
            const sanitizedOutput = result.output ? Object.keys(result.output).reduce((acc: any, key: string) => {
                const value = result.output[key];
                // base64 데이터가 있으면 처음 100자만 저장
                if (typeof value === 'string' && value.length > 1000) {
                    acc[key] = `${value.substring(0, 100)}... (${value.length} characters)`;
                } else {
                    acc[key] = value;
                }
                return acc;
            }, {}) : {};

            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'completed',
                    resultUrl,
                    completedAt: new Date(),
                    options: JSON.stringify({
                        ...JSON.parse((await prisma.job.findUnique({ where: { id: jobId } }))?.options || '{}'),
                        runpodResultUrl,
                        runpodOutput: sanitizedOutput,
                        completedAt: new Date().toISOString(),
                        processingTime: `${Math.round((Date.now() - new Date((await prisma.job.findUnique({ where: { id: jobId } }))?.createdAt || Date.now()).getTime()) / 1000)}초`
                    })
                },
            });

            console.log(`✅ Job ${jobId} marked as completed with result URL: ${resultUrl}`);
            console.log(`✅ RunPod result URL: ${runpodResultUrl}`);
            console.log(`🎉 WAN 2.2 video generation completed successfully!`);

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
