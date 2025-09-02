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
        console.log('🎬 Processing WAN 2.2 video generation request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string;
        const prompt = formData.get('prompt') as string;
        const width = parseInt(formData.get('width') as string);
        const height = parseInt(formData.get('height') as string);
        const seed = parseInt(formData.get('seed') as string);
        const cfg = parseFloat(formData.get('cfg') as string);
        
        const imageFile = formData.get('image') as File;

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

        // Create job record in database
        const job = await prisma.job.create({
            data: {
                id: Math.random().toString(36).substring(2, 15),
                userId,
                status: 'processing',
                type: 'wan22',
                prompt,
                options: JSON.stringify({ width, height, seed, cfg }),
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

        // 파일을 로컬에 저장 (백업용)
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const safeFileName = `input_${job.id}_${Date.now()}.jpg`; // 안전한 파일명 사용
        const imagePath = join(LOCAL_STORAGE_DIR, safeFileName);
        
        try {
            writeFileSync(imagePath, imageBuffer);
            console.log('✅ Image saved locally (backup):', imagePath);
        } catch (saveError) {
            console.error('❌ Failed to save image locally (backup):', saveError);
            // 로컬 저장 실패해도 계속 진행
        }

        // Prepare RunPod input with base64 image data
        const runpodInput = {
            prompt: prompt,
            image_path: imageBuffer.toString('base64'), // base64 인코딩된 이미지 데이터 (키는 image_path)
            width: width,
            height: height,
            seed: seed,
            cfg: cfg
        };

        console.log('🔧 Final RunPod input structure:');
        console.log('  - prompt:', runpodInput.prompt);
        console.log('  - image_path:', `${runpodInput.image_path.substring(0, 50)}... (${runpodInput.image_path.length} characters)`);
        console.log('  - width:', runpodInput.width);
        console.log('  - height:', runpodInput.height);
        console.log('  - seed:', runpodInput.seed);
        console.log('  - cfg:', runpodInput.cfg);

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
                    runpodJobId,
                    // 로컬 파일 경로들 (백업용)
                    imagePath,
                    // 로컬 이미지 웹 경로 (이미지 표시용)
                    imageWebPath: `/results/${safeFileName}`,
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
            message: 'WAN 2.2 작업이 백그라운드에서 처리되고 있습니다. Library에서 진행 상황을 확인하세요.'
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
            console.log('🔍 RunPod output structure:', Object.keys(result.output));
            
            let resultUrl: string;
            let runpodResultUrl: string = 'unknown';
            
            // 비디오 결과 찾기
            if (result.output.video) {
                resultUrl = result.output.video;
                runpodResultUrl = result.output.video;
                console.log(`🎬 Found video result: ${resultUrl}`);
            } else if (result.output.mp4) {
                resultUrl = result.output.mp4;
                runpodResultUrl = result.output.mp4;
                console.log(`🎬 Found MP4 result: ${resultUrl}`);
            } else if (result.output.result) {
                resultUrl = result.output.result;
                runpodResultUrl = result.output.result;
                console.log(`🎬 Found result: ${resultUrl}`);
            } else {
                console.warn('⚠️ No video data found in RunPod output');
                console.log('🔍 Checking for alternative video fields...');
                
                // 추가적인 비디오 관련 필드 확인
                const videoFields = ['video', 'mp4', 'avi', 'mov', 'result', 'output', 'file'];
                for (const field of videoFields) {
                    if (result.output[field]) {
                        console.log(`🔍 Found potential video field: ${field} =`, result.output[field]);
                    }
                }
                
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
                console.log(`🎬 Found base64 video data in video field, length: ${videoData.length} characters`);
            } else if (result.output.mp4 && typeof result.output.mp4 === 'string' && 
                       result.output.mp4.length > 100 && !result.output.mp4.startsWith('http')) {
                // mp4 필드에 base64 데이터가 있는 경우
                videoData = result.output.mp4;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 MP4 data in mp4 field, length: ${videoData.length} characters`);
            } else if (result.output.result && typeof result.output.result === 'string' && 
                       result.output.result.length > 100 && !result.output.result.startsWith('http')) {
                // result 필드에 base64 데이터가 있는 경우
                videoData = result.output.result;
                videoFormat = 'mp4';
                console.log(`🎬 Found base64 result data in result field, length: ${videoData.length} characters`);
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
