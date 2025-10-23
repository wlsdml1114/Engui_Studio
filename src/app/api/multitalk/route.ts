// src/app/api/multitalk/route.ts

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

export async function POST(request: NextRequest) {
    try {
        console.log('🎭 Processing MultiTalk generation request...');

        const formData = await request.formData();

        // Extract form data
        const userId = formData.get('userId') as string;
        const audioMode = formData.get('audioMode') as string;
        const prompt = formData.get('prompt') as string || 'a person talking';
        
        console.log('📋 FormData extracted values:');
        console.log('  - userId:', userId);
        console.log('  - audioMode:', audioMode, '(type:', typeof audioMode, ')');
        console.log('  - prompt:', prompt);
        
        // Load user settings
        console.log('📖 Loading user settings...');
        const { settings } = await settingsService.getSettings(userId);

        // Get current workspace ID
        const currentWorkspaceId = await settingsService.getCurrentWorkspaceId(userId);
        
        // Validate RunPod configuration
        if (!settings.runpod || typeof settings.runpod === 'string' || typeof settings.runpod === 'number' || 
            !(settings.runpod as any).apiKey || !(settings.runpod as any).endpoints?.multitalk) {
            return NextResponse.json({
                error: 'RunPod configuration incomplete. Please configure your API key and MultiTalk endpoint in Settings.',
                requiresSetup: true,
            }, { status: 400 });
        }
        
        // Type assertion for settings
        const runpodSettings = settings.runpod as any;

        const imageFile = formData.get('image') as File;
        const audio1File = formData.get('audio1') as File;
        const audio2File = formData.get('audio2') as File | null;

        // Validate required files
        if (!imageFile || !audio1File) {
            return NextResponse.json(
                { error: 'Image and at least one audio file are required' },
                { status: 400 }
            );
        }

        if (audioMode === 'dual' && !audio2File) {
            return NextResponse.json(
                { error: 'Second audio file is required for dual mode' },
                { status: 400 }
            );
        }

        // 로컬 파일 정보 저장 (썸네일용)
        const localFileInfo = {
            image: {
                name: imageFile.name,
                size: imageFile.size,
                type: imageFile.type,
                lastModified: imageFile.lastModified
            },
            audio1: {
                name: audio1File.name,
                size: audio1File.size,
                type: audio1File.type,
                lastModified: audio1File.lastModified
            },
            ...(audio2File && {
                audio2: {
                    name: audio2File.name,
                    size: audio2File.size,
                    type: audio2File.type,
                    lastModified: audio2File.lastModified
                }
            })
        };

        console.log('📁 Local file info:', localFileInfo);

        // Create job record in database
        const job = await prisma.job.create({
            data: {
                id: Math.random().toString(36).substring(2, 15),
                userId,
                workspaceId: currentWorkspaceId,
                status: 'processing',
                type: 'multitalk',
                prompt,
                options: JSON.stringify({ audioMode }),
                createdAt: new Date(),
            },
        });

        console.log(`📝 Created job record: ${job.id}`);

        // Deduct credit
        await prisma.creditActivity.create({
            data: {
                userId,
                activity: `Generated MultiTalk content (Job ID: ${job.id})`,
                amount: -2, // MultiTalk costs more credits
            },
        });

        // 파일들을 S3에 업로드
        console.log('📤 Uploading files to S3...');
        const s3Service = new S3Service();
        
        const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
        const audio1Buffer = Buffer.from(await audio1File.arrayBuffer());
        
        // 이미지 파일 S3 업로드
        const imageUpload = await s3Service.uploadFile(imageBuffer, imageFile.name, imageFile.type);
        console.log('✅ Image uploaded to S3:', imageUpload);
        
        // 오디오1 파일 S3 업로드
        const audio1Upload = await s3Service.uploadFile(audio1Buffer, audio1File.name, audio1File.type);
        console.log('✅ Audio1 uploaded to S3:', audio1Upload);
        
        let audio2Upload: { s3Url: string; filePath: string } | undefined;
        if (audio2File) {
            const audio2Buffer = Buffer.from(await audio2File.arrayBuffer());
            audio2Upload = await s3Service.uploadFile(audio2Buffer, audio2File.name, audio2File.type);
            console.log('✅ Audio2 uploaded to S3:', audio2Upload);
        }

        // 파일들을 로컬에도 저장 (백업용)
        const imagePath = join(LOCAL_STORAGE_DIR, `input_${job.id}_${imageFile.name}`);
        const audio1Path = join(LOCAL_STORAGE_DIR, `input_${job.id}_${audio1File.name}`);
        
        let audio2Path: string | undefined;
        if (audio2File) {
            audio2Path = join(LOCAL_STORAGE_DIR, `input_${job.id}_${audio2File.name}`);
            
            try {
                const audio2Buffer = Buffer.from(await audio2File.arrayBuffer());
                writeFileSync(audio2Path, audio2Buffer);
                console.log('✅ Audio2 saved locally:', audio2Path);
            } catch (saveError) {
                console.error('❌ Failed to save audio2 locally:', saveError);
                // S3 업로드는 성공했으므로 계속 진행
            }
        }

        try {
            writeFileSync(imagePath, imageBuffer);
            writeFileSync(audio1Path, audio1Buffer);
            console.log('✅ Files saved locally (backup):', { imagePath, audio1Path });
        } catch (saveError) {
            console.error('❌ Failed to save files locally (backup):', saveError);
            // S3 업로드는 성공했으므로 계속 진행
        }

        // Prepare RunPod input - S3 경로 사용
        console.log('🔧 Preparing RunPod input...');
        console.log('  - audioMode:', audioMode);
        console.log('  - audio2File exists:', !!audio2File);
        console.log('  - audio2Upload exists:', !!audio2Upload);
        console.log('  - Will set audio_type to "para":', audioMode === 'dual');
        
        // S3 경로 사용 (runpod-volume 형식)
        const runpodInput = {
            prompt: prompt || "a man talking",
            image_path: imageUpload.filePath, // S3 경로 (/runpod-volume/...)
            audio_paths: {
                person1: audio1Upload.filePath, // S3 경로 (/runpod-volume/...)
                ...(audioMode === 'dual' && audio2Upload && { person2: audio2Upload.filePath }), // 듀얼 모드일 때만 person2 추가
            },
        };

        // 듀얼 오디오 모드일 때 audio_type을 para로 설정
        if (audioMode === 'dual') {
            (runpodInput as any).audio_type = 'para';
            console.log('✅ audio_type set to "para" for dual mode');
        }

        console.log('🔧 Final RunPod input structure (S3 paths):');
        console.log('  - prompt:', runpodInput.prompt);
        console.log('  - image_path:', runpodInput.image_path);
        console.log('  - audio_paths:', runpodInput.audio_paths);
        console.log('  - audioMode:', audioMode);
        console.log('  - audio2File exists:', !!audio2File);
        console.log('  - audio2Upload exists:', !!audio2Upload);
        console.log('  - audio_type:', (runpodInput as any).audio_type);
        console.log('  - Full RunPod input:', JSON.stringify(runpodInput, null, 2));

        console.log('🚀 Submitting job to RunPod...', runpodInput);

        // Submit job to RunPod using user settings
        let runpodJobId: string;
        try {
            console.log('🔧 Creating RunPod service with user settings...');
            const runpodService = new RunPodService(
                runpodSettings.apiKey,
                runpodSettings.endpoints.multitalk,
                runpodSettings.generateTimeout || 3600 // Generate 타임아웃 설정 전달
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
                options: JSON.stringify({
                    audioMode,
                    runpodJobId,
                    // S3 업로드 정보
                    imageS3Url: imageUpload.s3Url,
                    imageS3Path: imageUpload.filePath,
                    audio1S3Url: audio1Upload.s3Url,
                    audio1S3Path: audio1Upload.filePath,
                    ...(audio2Upload && {
                        audio2S3Url: audio2Upload.s3Url,
                        audio2S3Path: audio2Upload.filePath,
                    }),
                    // 로컬 파일 경로들 (백업용)
                    imagePath,
                    audio1Path,
                    audio2Path,
                    // 로컬 이미지 웹 경로 (이미지 표시용)
                    imageWebPath: `/results/input_${job.id}_${imageFile.name}`,
                    // 로컬 파일 정보
                    localFileInfo,
                }),
            },
        });

        console.log(`✅ MultiTalk job submitted: ${job.id} (RunPod: ${runpodJobId})`);

        // Start background processing (don't await it)
        processMultiTalkJob(job.id, runpodJobId).catch(error => {
            console.error(`❌ Background processing error for job ${job.id}:`, error);
        });

        return NextResponse.json({
            jobId: job.id,
            runpodJobId,
            status: 'processing',
        });

    } catch (error) {
        console.error('❌ MultiTalk generation error:', error);
        return NextResponse.json(
            { error: `MultiTalk generation failed: ${error}` },
            { status: 500 }
        );
    }
}

// Background processing function
async function processMultiTalkJob(jobId: string, runpodJobId: string) {
    try {
        console.log(`🔄 Starting background processing for job ${jobId}`);
        
        // Get job details to find user ID
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });
        
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        
        // Load user settings for background processing
        const { settings } = await settingsService.getSettings(job.userId);
        
        if (!settings.runpod || typeof settings.runpod === 'string' || typeof settings.runpod === 'number' || 
            !(settings.runpod as any).apiKey || !(settings.runpod as any).endpoints?.multitalk) {
            throw new Error('RunPod configuration missing for background processing');
        }
        
        const runpodSettings = settings.runpod as any;

        const runpodService = new RunPodService(
            runpodSettings.apiKey,
            runpodSettings.endpoints.multitalk
        );

        // Wait for RunPod job completion
        const result = await runpodService.waitForCompletion(runpodJobId);

        if (result.status === 'COMPLETED' && result.output) {
            console.log(`✅ RunPod job completed: ${runpodJobId}`);
            console.log('🎬 RunPod output structure:', JSON.stringify(result.output, null, 2));
            console.log('🎬 Available output keys:', Object.keys(result.output));
            
            // 각 필드의 타입과 내용 확인
            Object.entries(result.output).forEach(([key, value]) => {
                if (value) {
                    console.log(`🔍 Field: ${key}, Type: ${typeof value}, Length: ${typeof value === 'string' ? value.length : 'N/A'}`);
                    if (typeof value === 'string' && value.length > 100) {
                        console.log(`🔍 ${key} preview: ${value.substring(0, 100)}...`);
                    }
                }
            });

            // Handle the result
            let resultUrl = null;
            let runpodResultUrl = null;

            if (result.output.video_base64) {
                // Base64 비디오 데이터가 있는 경우
                console.log('📹 Video base64 data received from RunPod');
                console.log('📹 Base64 length:', result.output.video_base64.length, 'characters');
                
                // Base64를 디코딩하여 로컬에 저장
                try {
                    const videoBuffer = Buffer.from(result.output.video_base64, 'base64');
                    console.log('📹 Decoded video buffer size:', videoBuffer.length);
                    
                    const outputDir = join(LOCAL_STORAGE_DIR, `output_${jobId}`);
                    mkdirSync(outputDir, { recursive: true });

                    const outputFilePath = join(outputDir, `multitalk_result_${jobId}.mp4`);
                    writeFileSync(outputFilePath, videoBuffer);
                    console.log('✅ Video saved locally:', outputFilePath);
                    
                    // 웹에서 접근 가능한 경로 설정
                    resultUrl = `/results/output_${jobId}/multitalk_result_${jobId}.mp4`;
                    runpodResultUrl = outputFilePath;
                    
                } catch (saveError) {
                    console.error('❌ Failed to save video locally:', saveError);
                    resultUrl = `/api/results/${jobId}.mp4`;
                    runpodResultUrl = result.output.video_base64;
                }
                
            } else if (result.output.video_url) {
                // RunPod에서 직접 비디오 URL을 제공하는 경우
                console.log('🔗 Direct video URL from RunPod:', result.output.video_url);
                resultUrl = result.output.video_url;
                runpodResultUrl = result.output.video_url;
                
            } else if (result.output.output_url) {
                // 일반적인 output_url 필드
                console.log('🔗 Output URL from RunPod:', result.output.output_url);
                resultUrl = result.output.output_url;
                runpodResultUrl = result.output.output_url;
                
            } else if (result.output.video_path || result.output.file_path) {
                // RunPod 내부 파일 경로
                const filePath = result.output.video_path || result.output.file_path;
                console.log('📁 File path from RunPod:', filePath);
                
                // RunPod API를 통해 파일을 다운로드하고 로컬에 저장
                try {
                    console.log('📥 Downloading file from RunPod...');
                    
                    // RunPod API를 통해 파일 다운로드 (기본 URL 사용)
                    const downloadResponse = await fetch(`https://api.runpod.io/v2/${runpodJobId}/stream`, {
                        headers: {
                            'Authorization': `Bearer ${runpodSettings.apiKey}`,
                        },
                    });
                    
                    if (downloadResponse.ok) {
                        const fileBuffer = await downloadResponse.arrayBuffer();
                        console.log('📥 Downloaded file size:', fileBuffer.byteLength);
                        
                        const outputDir = join(LOCAL_STORAGE_DIR, `output_${jobId}`);
                        mkdirSync(outputDir, { recursive: true });

                        const outputFilePath = join(outputDir, `multitalk_result_${jobId}.mp4`);
                        writeFileSync(outputFilePath, Buffer.from(fileBuffer));
                        console.log('✅ File saved locally:', outputFilePath);
                        
                        // 웹에서 접근 가능한 경로 설정
                        resultUrl = `/results/output_${jobId}/multitalk_result_${jobId}.mp4`;
                        runpodResultUrl = outputFilePath;
                        
                    } else {
                        console.warn('⚠️ Failed to download file from RunPod, using fallback');
                        resultUrl = `/api/results/${jobId}.mp4`;
                        runpodResultUrl = filePath;
                    }
                    
                } catch (downloadError) {
                    console.error('❌ Failed to download file from RunPod:', downloadError);
                    resultUrl = `/api/results/${jobId}.mp4`;
                    runpodResultUrl = filePath;
                }
                
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

            // Update job status to completed with result URL
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'completed',
                    resultUrl,
                    completedAt: new Date(),
                    options: JSON.stringify({
                        ...JSON.parse(job.options || '{}'),
                        runpodResultUrl,
                        runpodOutput: result.output,
                        completedAt: new Date().toISOString()
                    })
                },
            });

            console.log(`✅ Job ${jobId} marked as completed with result URL: ${resultUrl}`);
            console.log(`✅ RunPod result URL: ${runpodResultUrl}`);

        } else {
            console.error('❌ RunPod job failed or no output');
            console.error('Status:', result.status);
            console.error('Error:', result.error);
            console.error('Output:', result.output);
            throw new Error(`RunPod job failed: ${result.error}`);
        }

    } catch (error) {
        console.error(`❌ Background processing failed for job ${jobId}:`, error);

        // Update job status to failed
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'failed',
                completedAt: new Date(),
            },
        });
    }
}