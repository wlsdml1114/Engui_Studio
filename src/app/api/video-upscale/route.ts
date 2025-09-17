import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import S3Service from '@/lib/s3Service';
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

// S3에 파일 업로드 (infinite talk 방식 참고)
async function uploadToS3(file: File, fileName: string): Promise<string> {
  const { settings } = await settingsService.getSettings('user-with-settings');
  
  if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
    throw new Error('S3 설정이 완료되지 않았습니다.');
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
        console.log('🎬 Processing video upscale request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string;
        const taskType = formData.get('task_type') as string;
        const videoFile = formData.get('video') as File;

        // Validate required data
        if (!videoFile || !taskType) {
            return NextResponse.json({
                error: 'Missing required fields: video, task_type',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Load user settings
        console.log('📖 Loading user settings...');
        const { settings } = await settingsService.getSettings(userId);
        
        // Validate RunPod configuration
        if (!settings.runpod || typeof settings.runpod === 'string' || typeof settings.runpod === 'number' || 
            !(settings.runpod as any).apiKey || !(settings.runpod as any).endpoints?.['video-upscale']) {
            return NextResponse.json({
                error: 'RunPod configuration incomplete. Please configure your API key and video-upscale endpoint in Settings.',
                requiresSetup: true,
            }, { status: 400 });
        }

        // Validate S3 configuration
        if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
            return NextResponse.json({
                error: 'S3 configuration incomplete. Please configure S3 settings in Settings.',
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
                type: 'video-upscale',
                prompt: `Video upscale task: ${taskType}`,
                options: JSON.stringify({ 
                    taskType,
                    originalFileName: videoFile.name,
                    fileSize: videoFile.size
                }),
                createdAt: new Date(),
            },
        });

        console.log(`📝 Created job record: ${job.id}`);

        // Deduct credit
        await prisma.creditActivity.create({
            data: {
                userId,
                activity: `Video upscale (Job ID: ${job.id})`,
                amount: -1, // Video upscale costs 1 credit
            },
        });

        // S3에 비디오 업로드
        console.log('📤 Uploading video to S3...');
        const videoFileName = `input/video-upscale/input_${job.id}_${videoFile.name}`;
        const videoS3Path = await uploadToS3(videoFile, videoFileName);
        console.log('✅ Video uploaded to S3:', videoS3Path);

        // 로컬에 백업 저장
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        const videoUpscaleDir = join(LOCAL_STORAGE_DIR, 'input', 'video-upscale');
        mkdirSync(videoUpscaleDir, { recursive: true });
        
        const localVideoPath = join(videoUpscaleDir, `input_${job.id}_${videoFile.name}`);
        try {
            writeFileSync(localVideoPath, videoBuffer);
            console.log('✅ Video saved locally as backup:', localVideoPath);
        } catch (saveError) {
            console.error('❌ Failed to save video locally (backup):', saveError);
        }

        // Prepare RunPod input with S3 video path
        const runpodInput = {
            video_path: videoS3Path, // S3 경로 사용
            task_type: taskType
        };

        console.log('🔧 Final RunPod input structure:');
        console.log('  - video_path:', runpodInput.video_path);
        console.log('  - task_type:', runpodInput.task_type);

        // RunPod 입력 로그 출력
        console.log('🚀 Submitting job to RunPod...', runpodInput);

        // Submit job to RunPod using user settings
        let runpodJobId: string;
        try {
            console.log('🔧 Creating RunPod service with user settings...');
            const runpodService = new RunPodService(
                runpodSettings.apiKey,
                runpodSettings.endpoints['video-upscale'],
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
                    taskType,
                    runpodJobId,
                    originalFileName: videoFile.name,
                    fileSize: videoFile.size,
                    videoS3Path,
                    // 로컬 파일 경로들 (백업용)
                    localVideoPath,
                    // 로컬 비디오 웹 경로 (비디오 표시용)
                    videoWebPath: `/results/input/video-upscale/input_${job.id}_${videoFile.name}`,
                }),
            },
        });

        console.log(`✅ Video upscale job submitted: ${job.id} (RunPod: ${runpodJobId})`);

        // 백그라운드에서 작업 상태 확인 및 결과 처리 (비동기)
        // 사용자는 즉시 응답을 받고 다른 작업을 할 수 있음
        processVideoUpscaleJob(job.id, runpodJobId, runpodSettings, prisma).catch(error => {
            console.error(`❌ Background processing failed for job ${job.id}:`, error);
        });

        return NextResponse.json({
            success: true,
            jobId: job.id,
            runpodJobId,
            status: 'processing',
            message: '비디오 업스케일 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.'
        });

    } catch (error) {
        console.error('❌ Video upscale error:', error);
        return NextResponse.json(
            { error: `Video upscale failed: ${error}` },
            { status: 500 }
        );
    }
}

// 백그라운드 작업 처리 함수
async function processVideoUpscaleJob(jobId: string, runpodJobId: string, runpodSettings: any, prisma: PrismaClient) {
    try {
        console.log(`🔄 Starting background processing for video upscale job: ${jobId} (RunPod: ${runpodJobId})`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
        
        const runpodService = new RunPodService(
            runpodSettings.apiKey,
            runpodSettings.endpoints['video-upscale'],
            runpodSettings.generateTimeout || 3600
        );

        console.log(`⏳ Waiting for RunPod job completion... (timeout: ${runpodSettings.generateTimeout || 3600}초)`);
        
        // RunPod 작업 완료 대기
        const result = await runpodService.waitForCompletion(runpodJobId);
        
        console.log(`✅ RunPod job ${runpodJobId} completed with status: ${result.status}`);
        console.log(`⏰ Completed at: ${new Date().toISOString()}`);
        
        if (result.status === 'COMPLETED' && result.output) {
            console.log(`✅ Video upscale job ${jobId} completed successfully!`);
            
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

            // RunPod 결과 처리 - S3 경로와 base64 모두 지원
            let videoData: string | null = null;
            let videoS3Path: string | null = null;
            let videoFormat: string = 'mp4';
            
            // 1. S3 경로 방식 확인 (우선순위 높음 - 용량이 큰 파일에 효율적)
            if (result.output.video_path && typeof result.output.video_path === 'string' && 
                result.output.video_path.startsWith('/runpod-volume/')) {
                videoS3Path = result.output.video_path;
                console.log(`🎬 Found S3 path in video_path field: ${videoS3Path}`);
            } else if (result.output.video && typeof result.output.video === 'string' && 
                       result.output.video.startsWith('/runpod-volume/')) {
                videoS3Path = result.output.video;
                console.log(`🎬 Found S3 path in video field: ${videoS3Path}`);
            } else if (result.output.mp4 && typeof result.output.mp4 === 'string' && 
                       result.output.mp4.startsWith('/runpod-volume/')) {
                videoS3Path = result.output.mp4;
                console.log(`🎬 Found S3 path in mp4 field: ${videoS3Path}`);
            } else if (result.output.result && typeof result.output.result === 'string' && 
                       result.output.result.startsWith('/runpod-volume/')) {
                videoS3Path = result.output.result;
                console.log(`🎬 Found S3 path in result field: ${videoS3Path}`);
            }
            // 2. base64 방식 확인 (fallback)
            else if (result.output.video_path && typeof result.output.video_path === 'string' && 
                     result.output.video_path.length > 100 && !result.output.video_path.startsWith('http') && !result.output.video_path.startsWith('/runpod-volume/')) {
                videoData = result.output.video_path;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 video data in video_path field, length: ${videoData?.length} characters`);
            } else if (result.output.video && typeof result.output.video === 'string' && 
                       result.output.video.length > 100 && !result.output.video.startsWith('http') && !result.output.video.startsWith('/runpod-volume/')) {
                videoData = result.output.video;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 video data in video field, length: ${videoData?.length} characters`);
            } else if (result.output.mp4 && typeof result.output.mp4 === 'string' && 
                       result.output.mp4.length > 100 && !result.output.mp4.startsWith('http') && !result.output.mp4.startsWith('/runpod-volume/')) {
                videoData = result.output.mp4;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 MP4 data in mp4 field, length: ${videoData?.length} characters`);
            } else if (result.output.result && typeof result.output.result === 'string' && 
                       result.output.result.length > 100 && !result.output.result.startsWith('http') && !result.output.result.startsWith('/runpod-volume/')) {
                videoData = result.output.result;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 result data in result field, length: ${videoData?.length} characters`);
            }

            // S3 경로에서 비디오 다운로드 (우선순위 높음)
            if (videoS3Path && typeof videoS3Path === 'string' && videoS3Path.length > 0) {
                try {
                    console.log(`📥 Downloading video from S3 path: ${videoS3Path}`);
                    
                    // S3 경로를 S3 키로 변환 (/runpod-volume/ 제거)
                    const s3Key = videoS3Path.replace('/runpod-volume/', '');
                    console.log(`🔧 Converted S3 key: ${s3Key}`);
                    
                    // S3에서 파일 다운로드
                    const { settings } = await settingsService.getSettings('user-with-settings');
                    
                    if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
                        throw new Error('S3 설정이 완료되지 않았습니다.');
                    }

                    const s3Service = new S3Service({
                        endpointUrl: settings.s3.endpointUrl,
                        accessKeyId: settings.s3.accessKeyId,
                        secretAccessKey: settings.s3.secretAccessKey,
                        bucketName: settings.s3.bucketName || 'my-bucket',
                        region: settings.s3.region || 'us-east-1',
                    });

                    const videoBuffer = await s3Service.downloadFile(s3Key);
                    console.log(`✅ Downloaded video buffer size: ${videoBuffer.length} bytes`);
                    
                    // 로컬에 비디오 파일 저장
                    const videoFileName = `upscale_result_${jobId}.${videoFormat}`;
                    const videoPath = join(LOCAL_STORAGE_DIR, videoFileName);
                    
                    writeFileSync(videoPath, videoBuffer);
                    console.log(`✅ Video downloaded and saved locally: ${videoPath}`);
                    
                    // resultUrl을 로컬 웹 경로로 설정
                    resultUrl = `/results/${videoFileName}`;
                    runpodResultUrl = videoS3Path;
                    
                    console.log(`🔄 Set resultUrl to local path: ${resultUrl}`);
                    
                } catch (downloadError) {
                    console.error(`❌ Error downloading video from S3 path:`, downloadError);
                    // S3 경로 다운로드 실패 시 base64 방식으로 fallback
                    videoData = null;
                }
            }
            
            // base64 비디오 데이터를 디코딩하여 로컬에 저장 (fallback)
            if (videoData && typeof videoData === 'string' && videoData.length > 0) {
                try {
                    console.log(`🔓 Decoding base64 video data...`);
                    
                    // base64 데이터를 Buffer로 변환
                    const videoBuffer = Buffer.from(videoData, 'base64');
                    console.log(`✅ Decoded video buffer size: ${videoBuffer.length} bytes`);
                    
                    // 로컬에 비디오 파일 저장
                    const videoFileName = `upscale_result_${jobId}.${videoFormat}`;
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
                // base64 데이터와 S3 URL 모두 없는 경우
                console.log(`💡 No video data found in RunPod output`);
                console.log(`💡 Using original resultUrl: ${resultUrl}`);
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

            // 썸네일 설정 (입력 비디오를 썸네일로 사용)
            try {
                const jobData = await prisma.job.findUnique({ where: { id: jobId } });
                if (jobData?.options) {
                    const options = JSON.parse(jobData.options);
                    
                    // 입력 비디오가 있으면 썸네일로 사용
                    if (options.videoWebPath) {
                        await prisma.job.update({
                            where: { id: jobId },
                            data: {
                                thumbnailUrl: options.videoWebPath,
                            },
                        });
                        console.log(`🎬 Video upscale thumbnail set to input video: ${options.videoWebPath}`);
                    }
                }
            } catch (thumbnailError) {
                console.error('❌ Failed to set thumbnail:', thumbnailError);
            }

            console.log(`✅ Job ${jobId} marked as completed with result URL: ${resultUrl}`);
            console.log(`✅ RunPod result URL: ${runpodResultUrl}`);
            console.log(`🎉 Video upscale completed successfully!`);

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
