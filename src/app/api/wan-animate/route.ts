import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import S3Service from '@/lib/s3Service';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getApiMessage } from '@/lib/apiMessages';

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

// S3에 파일 업로드
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
    
    return result.filePath;
}

export async function POST(request: NextRequest) {
    let job: any = null; // job 변수를 함수 스코프에서 선언
    
    try {
        console.log('🎬 Processing WAN Animate video generation request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string || 'user-with-settings';
        const language = formData.get('language') as 'ko' | 'en' || 'ko';
        const prompt = formData.get('prompt') as string;
        const imageFile = formData.get('image') as File;
        const videoFile = formData.get('video') as File;

        // 추가 설정값들
        let seed = parseInt(formData.get('seed') as string) || -1;
        const cfg = parseFloat(formData.get('cfg') as string) || 1.0;
        const steps = parseInt(formData.get('steps') as string) || 4;
        const width = parseInt(formData.get('width') as string) || 512;
        const height = parseInt(formData.get('height') as string) || 512;
        const fps = parseInt(formData.get('fps') as string) || 30;
        const mode = (formData.get('mode') as string) || 'replace';
        console.log('🎬 수신된 FPS:', fps);
        console.log('🎭 수신된 Mode:', mode);
        const pointsStore = formData.get('points_store') as string;
        const coordinates = formData.get('coordinates') as string;
        const negCoordinates = formData.get('neg_coordinates') as string;

        // Seed가 -1이면 랜덤 시드로 변환 (0 이상의 값)
        if (seed === -1) {
            seed = Math.floor(Math.random() * 2147483647); // 32비트 정수 범위
            console.log(`🎲 Random seed generated: ${seed}`);
        }

        // Validate required data
        if (!prompt) {
            return NextResponse.json({
                error: 'Missing required field: prompt',
                requiresSetup: true,
            }, { status: 400 });
        }

        if (!imageFile && !videoFile) {
            return NextResponse.json({
                error: 'Missing required field: image or video',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Validate width and height are multiples of 64
        if (width % 64 !== 0) {
            return NextResponse.json({
                error: `Width must be a multiple of 64. Current value: ${width}. Suggested: ${Math.round(width / 64) * 64}`,
                requiresSetup: false,
            }, { status: 400 });
        }

        if (height % 64 !== 0) {
            return NextResponse.json({
                error: `Height must be a multiple of 64. Current value: ${height}. Suggested: ${Math.round(height / 64) * 64}`,
                requiresSetup: false,
            }, { status: 400 });
        }

        // Load user settings
        console.log('📖 Loading user settings...');
        const { settings } = await settingsService.getSettings(userId);
        
        // Validate RunPod configuration
        if (!settings.runpod || typeof settings.runpod === 'string' || typeof settings.runpod === 'number' || 
            !(settings.runpod as any).apiKey || !(settings.runpod as any).endpoints?.['wan-animate']) {
            return NextResponse.json({
                error: getApiMessage('RUNPOD_CONFIG', 'INCOMPLETE', language, 'WAN Animate'),
                requiresSetup: true,
            }, { status: 400 });
        }
        
        // Type assertion for settings
        const runpodSettings = settings.runpod as any;

        // 현재 워크스페이스 ID 가져오기
        const currentWorkspaceId = await settingsService.getCurrentWorkspaceId(userId);
        console.log('🏗️ Current workspace ID for job:', currentWorkspaceId);

        // Create job record in database
        job = await prisma.job.create({
            data: {
                id: Math.random().toString(36).substring(2, 15),
                userId,
                workspaceId: currentWorkspaceId, // 워크스페이스 ID 추가
                status: 'processing',
                type: 'wan-animate',
                prompt,
                options: JSON.stringify({
                    prompt,
                    hasImage: !!imageFile,
                    hasVideo: !!videoFile,
                    seed,
                    cfg,
                    steps,
                    width,
                    height,
                    fps,
                    mode,
                    pointsStore,
                    coordinates,
                    negCoordinates
                }),
                createdAt: new Date(),
            },
        });

        console.log(`📝 Created job record: ${job.id}`);
        console.log('📝 저장된 options JSON:', job.options);
        const savedOptions = JSON.parse(job.options || '{}');
        console.log('📝 저장된 options 파싱됨:', savedOptions);
        console.log('📝 저장된 mode:', savedOptions.mode);

        // Deduct credit
        await prisma.creditActivity.create({
            data: {
                userId,
                activity: `Generated WAN Animate video (Job ID: ${job.id})`,
                amount: -3, // WAN Animate costs more credits
            },
        });

        // 파일들을 S3에 업로드
        let s3ImagePath: string | null = null;
        let s3VideoPath: string | null = null;
        
        if (imageFile) {
            try {
                console.log('📤 Uploading image to S3...');
                const imageFileName = `input_image_${job.id}_${imageFile.name}`;
                s3ImagePath = await uploadToS3(imageFile, imageFileName, language);
                console.log('✅ Image uploaded to S3:', s3ImagePath);
                
                // 로컬에도 백업 저장
                const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
                const localImagePath = join(LOCAL_STORAGE_DIR, imageFileName);
                writeFileSync(localImagePath, imageBuffer);
                console.log('✅ Image saved locally (backup):', localImagePath);
            } catch (s3Error) {
                console.error('❌ Failed to upload image to S3:', s3Error);
                
                // Job 상태를 failed로 업데이트
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        options: JSON.stringify({
                            ...JSON.parse(job.options || '{}'),
                            error: `${getApiMessage('RUNPOD', 'S3_IMAGE_UPLOAD_FAILED', language)}: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`,
                            failedAt: new Date().toISOString(),
                            failureReason: 'S3_UPLOAD_ERROR'
                        })
                    },
                });
                
                return NextResponse.json({
                    error: s3Error instanceof Error ? s3Error.message : String(s3Error),
                    requiresSetup: true,
                    jobId: job.id,
                    status: 'failed'
                }, { status: 400 });
            }
        }

        if (videoFile) {
            try {
                console.log('📤 Uploading video to S3...');
                const videoFileName = `input_video_${job.id}_${videoFile.name}`;
                s3VideoPath = await uploadToS3(videoFile, videoFileName, language);
                console.log('✅ Video uploaded to S3:', s3VideoPath);
                
                // 로컬에도 백업 저장
                const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
                const localVideoPath = join(LOCAL_STORAGE_DIR, videoFileName);
                writeFileSync(localVideoPath, videoBuffer);
                console.log('✅ Video saved locally (backup):', localVideoPath);
            } catch (s3Error) {
                console.error('❌ Failed to upload video to S3:', s3Error);
                
                // Job 상태를 failed로 업데이트
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        options: JSON.stringify({
                            ...JSON.parse(job.options || '{}'),
                            error: `${getApiMessage('RUNPOD', 'S3_VIDEO_UPLOAD_FAILED', language)}: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`,
                            failedAt: new Date().toISOString(),
                            failureReason: 'S3_UPLOAD_ERROR'
                        })
                    },
                });
                
                return NextResponse.json({
                    error: s3Error instanceof Error ? s3Error.message : String(s3Error),
                    requiresSetup: true,
                    jobId: job.id,
                    status: 'failed'
                }, { status: 400 });
            }
        }

        // Prepare RunPod input with S3 paths
        const runpodInput: any = {
            prompt: prompt,
            image_path: s3ImagePath,
            video_path: s3VideoPath,
            // 사용자가 제공한 코드 구조에 맞춰 추가 설정들
            positive_prompt: prompt,
            seed: seed,
            cfg: cfg,
            steps: steps,
            width: width,
            height: height,
            fps: fps, // 비디오 FPS 추가
            mode: mode, // mode 추가
        };

        // 인물 선택이 있을 때만 포인트 관련 필드 추가
        if (pointsStore) {
            runpodInput.points_store = pointsStore;
        }
        if (coordinates) {
            runpodInput.coordinates = coordinates;
        }
        if (negCoordinates) {
            runpodInput.neg_coordinates = negCoordinates;
        }

        // Submit job to RunPod using user settings
        let runpodJobId: string;
        try {
            const runpodService = new RunPodService(
                runpodSettings.apiKey,
                runpodSettings.endpoints['wan-animate'],
                runpodSettings.generateTimeout || 3600
            );

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
                    options: JSON.stringify({
                        ...JSON.parse(job.options || '{}'),
                        error: `${getApiMessage('RUNPOD', 'SUBMISSION_FAILED', language)}: ${runpodError instanceof Error ? runpodError.message : String(runpodError)}`,
                        failedAt: new Date().toISOString(),
                        failureReason: 'RUNPOD_SUBMISSION_ERROR'
                    })
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
                    prompt,
                    hasImage: !!imageFile,
                    hasVideo: !!videoFile,
                    seed,
                    cfg,
                    steps,
                    width,
                    height,
                    fps,
                    mode,
                    pointsStore,
                    coordinates,
                    negCoordinates,
                    runpodJobId,
                    s3ImagePath,
                    s3VideoPath,
                    // 로컬 이미지 웹 경로 (이미지 표시용)
                    imageWebPath: imageFile ? `/results/input_image_${job.id}_${imageFile.name}` : null,
                    videoWebPath: videoFile ? `/results/input_video_${job.id}_${videoFile.name}` : null,
                }),
            },
        });

        console.log(`✅ WAN Animate job submitted: ${job.id} (RunPod: ${runpodJobId})`);

        // 백그라운드에서 작업 상태 확인 및 결과 처리 (비동기)
        processWanAnimateJob(job.id, runpodJobId, runpodSettings, prisma).catch(error => {
            console.error(`❌ Background processing failed for job ${job.id}:`, error);
        });

        return NextResponse.json({
            success: true,
            jobId: job.id,
            runpodJobId,
            status: 'processing',
            message: getApiMessage('JOB_STARTED', 'wanAnimate', language)
        });

    } catch (error) {
        console.error('❌ WAN Animate generation error:', error);
        
        // Job이 생성되었다면 상태를 failed로 업데이트
        if (job) {
            try {
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        options: JSON.stringify({
                            ...JSON.parse(job.options || '{}'),
                            error: `${getApiMessage('RUNPOD', 'WAN_ANIMATE_FAILED', language)}: ${error instanceof Error ? error.message : String(error)}`,
                            failedAt: new Date().toISOString(),
                            failureReason: 'GENERAL_ERROR'
                        })
                    },
                });
                console.log(`✅ Job ${job.id} marked as failed due to general error`);
            } catch (updateError) {
                console.error('❌ Failed to update job status:', updateError);
            }
        }
        
        return NextResponse.json(
            { 
                error: `WAN Animate generation failed: ${error}`,
                jobId: job ? job.id : null,
                status: 'failed'
            },
            { status: 500 }
        );
    }
}

// 백그라운드 작업 처리 함수
async function processWanAnimateJob(jobId: string, runpodJobId: string, runpodSettings: any, prisma: PrismaClient) {
    try {
        console.log(`🔄 Starting background processing for WAN Animate job: ${jobId} (RunPod: ${runpodJobId})`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
        
        const runpodService = new RunPodService(
            runpodSettings.apiKey,
            runpodSettings.endpoints['wan-animate'],
            runpodSettings.generateTimeout || 3600
        );

        console.log(`⏳ Waiting for RunPod job completion... (timeout: ${runpodSettings.generateTimeout || 3600}초)`);
        
        // RunPod 작업 완료 대기
        const result = await runpodService.waitForCompletion(runpodJobId);
        
        console.log(`✅ RunPod job ${runpodJobId} completed with status: ${result.status}`);
        console.log(`⏰ Completed at: ${new Date().toISOString()}`);
        
        if (result.status === 'COMPLETED' && result.output) {
            console.log(`✅ WAN Animate job ${jobId} completed successfully!`);
            
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
                resultUrl = `/api/results/${jobId}.mp4`;
                runpodResultUrl = 'unknown';
            }

            // RunPod에서 base64 인코딩된 비디오 데이터 처리
            let videoData: string | null = null;
            let videoFormat: string = 'mp4';
            
            if (result.output.video && typeof result.output.video === 'string' && 
                result.output.video.length > 100 && !result.output.video.startsWith('http')) {
                videoData = result.output.video;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 video data in video field, length: ${videoData?.length} characters`);
            } else if (result.output.mp4 && typeof result.output.mp4 === 'string' && 
                       result.output.mp4.length > 100 && !result.output.mp4.startsWith('http')) {
                videoData = result.output.mp4;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 MP4 data in mp4 field, length: ${videoData?.length} characters`);
            } else if (result.output.result && typeof result.output.result === 'string' && 
                       result.output.result.length > 100 && !result.output.result.startsWith('http')) {
                videoData = result.output.result;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 result data in result field, length: ${videoData?.length} characters`);
            }

            // base64 비디오 데이터를 디코딩하여 로컬에 저장
            if (videoData && typeof videoData === 'string' && videoData.length > 0) {
                try {
                    console.log(`🔓 Decoding base64 video data...`);
                    
                    const videoBuffer = Buffer.from(videoData, 'base64');
                    console.log(`✅ Decoded video buffer size: ${videoBuffer.length} bytes`);
                    
                    const videoFileName = `wan_animate_result_${jobId}.${videoFormat}`;
                    const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
                    
                    writeFileSync(videoPath, videoBuffer);
                    console.log(`✅ Video saved locally: ${videoPath}`);
                    
                    resultUrl = `/results/${videoFileName}`;
                    runpodResultUrl = `local:${videoPath}`;
                    
                    console.log(`🔄 Set resultUrl to local path: ${resultUrl}`);
                    
                } catch (decodeError) {
                    console.error(`❌ Error decoding base64 video data:`, decodeError);
                    console.log(`💡 Using original resultUrl: ${resultUrl}`);
                }
            } else {
                console.log(`💡 No base64 video data found, using original result handling`);
                
                if (resultUrl && (resultUrl.startsWith('http://') || resultUrl.startsWith('https://'))) {
                    console.log(`🌐 RunPod returned external URL: ${resultUrl}`);
                    console.log(`💡 Converting to local path for web access`);
                    
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
                            const videoFileName = `wan_animate_result_${jobId}.mp4`;
                            const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
                            
                            writeFileSync(videoPath, Buffer.from(videoBuffer));
                            console.log(`✅ Video downloaded and saved locally: ${videoPath}`);
                            
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
            console.log(`🎉 WAN Animate video generation completed successfully!`);

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
