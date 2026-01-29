import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import ElevenLabsService from '@/lib/elevenlabsService';
import S3Service from '@/lib/s3Service';
import { processFileUpload } from '@/lib/serverFileUtils';
import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getApiMessage } from '@/lib/apiMessages';
import { getModelById } from '@/lib/models/modelConfig';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const settingsService = new SettingsService();

// Local storage directory
const LOCAL_STORAGE_DIR = join(process.cwd(), 'public', 'results');

// Ensure directory exists
try {
    mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
} catch (error) {
    // Directory already exists
}

// S3 upload helper - will be created per request with userId
function createUploadToS3(userId: string, language: 'ko' | 'en' = 'ko') {
    return async (file: File, fileName: string): Promise<{ s3Url: string; filePath: string }> => {
        console.log(`📤 Starting S3 upload for file: ${fileName}`);
        const { settings } = await settingsService.getSettings(userId);

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
        console.log(`📦 File buffer size: ${fileBuffer.length} bytes`);
        const result = await s3Service.uploadFile(fileBuffer, fileName, file.type);
        console.log(`✅ S3 upload complete:`, result);

        return result;
    };
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Extract basic info
        const userId = formData.get('userId') as string || 'user-with-settings';
        const modelId = formData.get('modelId') as string;
        const language = formData.get('language') as 'ko' | 'en' || 'ko';
        const workspaceId = formData.get('workspaceId') as string;

        if (!modelId) {
            return NextResponse.json({
                error: 'Missing required field: modelId',
            }, { status: 400 });
        }

        // Get model config
        const model = getModelById(modelId);
        if (!model) {
            return NextResponse.json({
                error: `Unknown model: ${modelId}`,
            }, { status: 400 });
        }

        console.log(`🎬 Processing ${model.name} generation request...`);

        // Extract prompt
        const prompt = formData.get('prompt') as string;

        // Process input files based on model.inputs
        const inputData: Record<string, any> = {};

        // Track media input paths for job reuse
        let imageInputPath: string | undefined;
        let videoInputPath: string | undefined;
        let audioInputPath: string | undefined;

        // Handle image input
        if (model.inputs.includes('image')) {
            const imageKey = model.imageInputKey || 'image';
            const imageFile = formData.get('image') as File; // Always get from 'image' field in formData

            console.log(`🔍 Checking for image input (key: ${imageKey})`);
            console.log(`📁 Image file from formData:`, imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : 'null');

            if (imageFile && imageFile.size > 0) {
                const imageFileName = `image_${uuidv4()}_${imageFile.name}`;
                console.log(`📤 Uploading image: ${imageFileName}`);
                try {
                    const uploadToS3 = createUploadToS3(userId, language);
                    const uploadResult = await processFileUpload(
                        imageFile,
                        imageFileName,
                        uploadToS3,
                        LOCAL_STORAGE_DIR
                    );
                    inputData[imageKey] = uploadResult.s3Path; // Store with the model's expected key
                    imageInputPath = uploadResult.webPath || uploadResult.s3Path; // Store for job reuse
                    console.log(`✅ Image uploaded to ${imageKey}: ${uploadResult.s3Path}`);
                    console.log(`📁 Image input path stored: ${imageInputPath}`);
                } catch (error) {
                    console.error(`❌ Failed to upload image:`, error);
                    return NextResponse.json({
                        error: getApiMessage('RUNPOD', 'S3_UPLOAD_FAILED', language),
                        requiresSetup: true,
                    }, { status: 400 });
                }
            } else {
                console.log(`⚠️ No image file provided or file is empty`);
            }

            // Handle second image input (based on model config)
            const image2Key = model.imageInput2Key;
            const imageFile2 = formData.get('image2') as File;

            if (model.inputs.includes('image2') && image2Key && imageFile2 && imageFile2.size > 0) {
                console.log(`🔍 Checking for second image input (key: ${image2Key})`);
                console.log(`📁 Second image file from formData:`, `${imageFile2.name} (${imageFile2.size} bytes)`);

                const imageFileName2 = `image2_${uuidv4()}_${imageFile2.name}`;
                console.log(`📤 Uploading second image: ${imageFileName2}`);
                try {
                    const uploadToS3 = createUploadToS3(userId, language);
                    const uploadResult = await processFileUpload(
                        imageFile2,
                        imageFileName2,
                        uploadToS3,
                        LOCAL_STORAGE_DIR
                    );
                    inputData[image2Key] = uploadResult.s3Path;
                    console.log(`✅ Second image uploaded to ${image2Key}: ${uploadResult.s3Path}`);
                } catch (error) {
                    console.error(`❌ Failed to upload second image:`, error);
                    return NextResponse.json({
                        error: getApiMessage('RUNPOD', 'S3_UPLOAD_FAILED', language),
                        requiresSetup: true,
                    }, { status: 400 });
                }
            }
        }

        // Handle video input
        if (model.inputs.includes('video')) {
            const videoKey = model.videoInputKey || 'video';
            const videoFile = formData.get('video') as File;

            console.log(`🔍 Checking for video input (key: ${videoKey})`);
            console.log(`📁 Video file from formData:`, videoFile ? `${videoFile.name} (${videoFile.size} bytes)` : 'null');

            if (videoFile && videoFile.size > 0) {
                const videoFileName = `video_${uuidv4()}_${videoFile.name}`;
                console.log(`📤 Uploading video: ${videoFileName}`);
                try {
                    const uploadToS3 = createUploadToS3(userId, language);
                    const uploadResult = await processFileUpload(
                        videoFile,
                        videoFileName,
                        uploadToS3,
                        LOCAL_STORAGE_DIR
                    );
                    inputData[videoKey] = uploadResult.s3Path;
                    videoInputPath = uploadResult.webPath || uploadResult.s3Path; // Store for job reuse
                    console.log(`✅ Video uploaded: ${uploadResult.s3Path}`);
                    console.log(`📁 Video input path stored: ${videoInputPath}`);
                } catch (error) {
                    console.error(`❌ Failed to upload video:`, error);
                    return NextResponse.json({
                        error: getApiMessage('RUNPOD', 'S3_UPLOAD_FAILED', language),
                        requiresSetup: true,
                    }, { status: 400 });
                }
            } else {
                console.log(`⚠️ No video file provided or file is empty`);
            }
        }

        // Handle audio input
        if (model.inputs.includes('audio')) {
            const audioKey = model.audioInputKey || 'audio';
            const audioFile = formData.get('audio') as File;

            console.log(`🔍 Checking for audio input (key: ${audioKey})`);
            console.log(`📁 Audio file from formData:`, audioFile ? `${audioFile.name} (${audioFile.size} bytes)` : 'null');

            if (audioFile && audioFile.size > 0) {
                const audioFileName = `audio_${uuidv4()}_${audioFile.name}`;
                console.log(`📤 Uploading audio: ${audioFileName}`);
                try {
                    const uploadToS3 = createUploadToS3(userId, language);
                    const uploadResult = await processFileUpload(
                        audioFile,
                        audioFileName,
                        uploadToS3,
                        LOCAL_STORAGE_DIR
                    );
                    inputData[audioKey] = uploadResult.s3Path;
                    audioInputPath = uploadResult.webPath || uploadResult.s3Path; // Store for job reuse
                    console.log(`✅ Audio uploaded: ${uploadResult.s3Path}`);
                    console.log(`📁 Audio input path stored: ${audioInputPath}`);
                } catch (error) {
                    console.error(`❌ Failed to upload audio:`, error);
                    return NextResponse.json({
                        error: getApiMessage('RUNPOD', 'S3_UPLOAD_FAILED', language),
                        requiresSetup: true,
                    }, { status: 400 });
                }
            } else {
                console.log(`⚠️ No audio file provided or file is empty`);
            }

            // Handle second audio file (for multi-person scenarios)
            const audioFile2 = formData.get('audio2') as File;
            if (audioFile2 && audioFile2.size > 0) {
                const audioFileName2 = `audio2_${uuidv4()}_${audioFile2.name}`;
                console.log(`📤 Uploading second audio: ${audioFileName2}`);
                try {
                    const uploadToS3 = createUploadToS3(userId, language);
                    const uploadResult = await processFileUpload(
                        audioFile2,
                        audioFileName2,
                        uploadToS3,
                        LOCAL_STORAGE_DIR
                    );
                    inputData['wav_path_2'] = uploadResult.s3Path; // Infinite Talk uses wav_path_2
                    console.log(`✅ Second audio uploaded: ${uploadResult.s3Path}`);
                } catch (error) {
                    console.error(`❌ Failed to upload second audio:`, error);
                    return NextResponse.json({
                        error: getApiMessage('RUNPOD', 'S3_UPLOAD_FAILED', language),
                        requiresSetup: true,
                    }, { status: 400 });
                }
            }
        }

        // Collect all parameters from formData
        const parameters: Record<string, any> = {};
        model.parameters.forEach(param => {
            const value = formData.get(param.name);
            if (value !== null) {
                // Type conversion
                if (param.type === 'number') {
                    parameters[param.name] = parseFloat(value as string);
                } else if (param.type === 'boolean') {
                    parameters[param.name] = value === 'true';
                } else {
                    parameters[param.name] = value;
                }
            } else if (param.default !== undefined) {
                parameters[param.name] = param.default;
            }
        });

        // Collect LoRA weights for WAN 2.2 (4 pairs = 8 weights)
        if (modelId === 'wan22') {
            for (let i = 1; i <= 4; i++) {
                const highWeightKey = `lora_high_${i}_weight`;
                const lowWeightKey = `lora_low_${i}_weight`;

                const highWeight = formData.get(highWeightKey);
                const lowWeight = formData.get(lowWeightKey);

                if (highWeight !== null) {
                    parameters[highWeightKey] = parseFloat(highWeight as string);
                }
                if (lowWeight !== null) {
                    parameters[lowWeightKey] = parseFloat(lowWeight as string);
                }
            }
        }

        // Collect LoRA parameters for z-image (single LoRA with weight)
        // Format: lora: [["style_lora.safetensors", 0.8]] (filename only, not full path)
        if (modelId === 'z-image') {
            const lora = formData.get('lora') as string;
            const loraWeight = formData.get('loraWeight') as string;

            if (lora && lora.trim() !== '') {
                const weight = loraWeight ? parseFloat(loraWeight) : 1.0;
                // Extract just the filename (worker expects filename, not full path)
                const loraFileName = lora.split('/').pop() || lora;
                // Store as array format: [[filename, weight]]
                inputData['lora'] = [[loraFileName, weight]];
                console.log(`🔍 Z-Image LoRA: [["${loraFileName}", ${weight}]]`);
            }

            // Remove lora and loraWeight from parameters to prevent overwriting inputData.lora
            delete parameters['lora'];
            delete parameters['loraWeight'];
        }

        // Add prompt if model accepts text
        if (model.inputs.includes('text') && prompt) {
            inputData.prompt = prompt;
        }

        // Create job in database with media input paths
        const jobId = (formData.get('jobId') as string) || uuidv4();
        const job = await prisma.job.create({
            data: {
                id: jobId,
                userId,
                workspaceId: workspaceId || null,
                status: 'processing',
                type: model.type,
                modelId: model.id,
                prompt: prompt || null,
                options: JSON.stringify({ ...parameters, ...inputData }),
                imageInputPath: imageInputPath || null,
                videoInputPath: videoInputPath || null,
                audioInputPath: audioInputPath || null,
                createdAt: new Date(),
            } as any, // Prisma client type may be out of sync
        });

        console.log(`📝 Created job record: ${job.id}`);
        console.log(`📁 Media input paths stored:`, {
            imageInputPath,
            videoInputPath,
            audioInputPath,
        });

        // Handle RunPod API
        if (model.api.type === 'runpod') {
            const { settings } = await settingsService.getSettings(userId);

            if (!settings.runpod?.apiKey) {
                return NextResponse.json({
                    error: getApiMessage('RUNPOD', 'API_KEY_NOT_CONFIGURED', language),
                    requiresSetup: true,
                }, { status: 400 });
            }

            const endpoints = settings.runpod.endpoints as Record<string, string> | undefined;
            const endpointId = endpoints?.[model.id] || model.api.endpoint;

            if (!endpointId) {
                return NextResponse.json({
                    error: getApiMessage('RUNPOD', 'ENDPOINT_NOT_CONFIGURED', language),
                    requiresSetup: true,
                }, { status: 400 });
            }

            const runpodService = new RunPodService(settings.runpod.apiKey, endpointId);

            // Prepare RunPod input
            const runpodInput = {
                ...inputData,
                ...parameters,
            };

            console.log('📤 Sending to RunPod:', { modelId, endpointId, input: runpodInput });

            try {
                const runpodJobId = await runpodService.submitJob(runpodInput, modelId);

                console.log('✅ RunPod job started:', runpodJobId);

                // Update job with runpodJobId
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        options: JSON.stringify({
                            ...parameters,
                            ...inputData,
                            runpodJobId
                        })
                    }
                });

                return NextResponse.json({
                    success: true,
                    jobId: job.id,
                    runpodJobId: runpodJobId,
                    status: 'IN_QUEUE',
                    message: getApiMessage('RUNPOD', 'JOB_STARTED', language),
                });
            } catch (error: any) {
                console.error('❌ RunPod API error:', error);

                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        status: 'failed',
                        options: JSON.stringify({
                            ...parameters,
                            ...inputData,
                            error: error.message
                        })
                    },
                });

                return NextResponse.json({
                    error: error.message || getApiMessage('RUNPOD', 'API_ERROR', language),
                    requiresSetup: false,
                }, { status: 500 });
            }
        }

        // Handle external APIs (Eleven Labs)
        if (model.api.type === 'external') {
            // Eleven Labs models
            if (model.id.startsWith('elevenlabs-')) {

                try {
                    // Get settings again to ensure we have the API key
                    const { settings } = await settingsService.getSettings(userId);

                    if (!settings.elevenlabs?.apiKey) {
                        throw new Error('Eleven Labs API key not configured');
                    }

                    // Initialize service
                    const elevenlabsService = new ElevenLabsService({
                        apiKey: settings.elevenlabs.apiKey,
                        voiceId: settings.elevenlabs.voiceId,
                        model: settings.elevenlabs.model,
                        stability: settings.elevenlabs.stability,
                        similarity: settings.elevenlabs.similarity,
                        style: settings.elevenlabs.style,
                        useStreaming: settings.elevenlabs.useStreaming,
                    });

                    let audioBlob: Blob;
                    const modelName = model.id === 'elevenlabs-tts' ? 'TTS' : 'Music';

                    // Generate audio based on model type
                    if (model.id === 'elevenlabs-tts') {
                        // Extract TTS specific parameters from parameters object or inputData
                        const voiceId = parameters.voiceId || inputData.voiceId || settings.elevenlabs.voiceId || 'EXAVITQu4vr4xnSDxMaL';

                        audioBlob = await elevenlabsService.generateSpeech({
                            text: prompt,
                            voice_id: voiceId,
                            model_id: parameters.eleven_model_id || settings.elevenlabs.model || 'eleven_multilingual_v2',
                            voice_settings: {
                                stability: parameters.stability ?? settings.elevenlabs.stability ?? 0.8,
                                similarity_boost: parameters.similarity ?? settings.elevenlabs.similarity ?? 0.8,
                                style: parameters.style ?? settings.elevenlabs.style ?? 0.0,
                                use_speaker_boost: true,
                            },
                        });
                    } else if (model.id === 'elevenlabs-music') {
                        audioBlob = await elevenlabsService.generateMusic({
                            text: prompt,
                            model_id: parameters.eleven_model_id || 'music_generator_v2',
                            prompt_genre: parameters.prompt_genre,
                            prompt_tempo: parameters.prompt_tempo,
                            prompt_instrumentation: parameters.prompt_instrumentation,
                            prompt_structure: parameters.prompt_structure,
                            duration_seconds: parameters.duration_seconds,
                        });
                    } else {
                        throw new Error(`Unknown external model: ${model.id}`);
                    }

                    // Save to local storage
                    const audioFileName = `${model.id}_${uuidv4()}.mp3`;
                    // Ensure subdirectories exist if needed, processFileUpload handles this but we are doing manual save here
                    // LOCAL_STORAGE_DIR is 'public/results'
                    const localPath = join(LOCAL_STORAGE_DIR, audioFileName);
                    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
                    await writeFile(localPath, audioBuffer);

                    const resultUrl = `/results/${audioFileName}`;

                    // Update job status to completed
                    await prisma.job.update({
                        where: { id: job.id },
                        data: {
                            status: 'completed',
                            resultUrl: resultUrl,
                            options: JSON.stringify({
                                ...parameters,
                                ...inputData,
                                duration: audioBlob.size, // Approximate
                            })
                        }
                    });

                    return NextResponse.json({
                        success: true,
                        jobId: job.id,
                        audioUrl: resultUrl,
                        localPath: `/results/${audioFileName}`,
                        duration: audioBlob.size,
                        model: modelName,
                        message: `${modelName} generation completed successfully`,
                    });

                } catch (error) {
                    console.error('❌ Eleven Labs API error:', error);

                    await prisma.job.update({
                        where: { id: job.id },
                        data: {
                            status: 'failed',
                            options: JSON.stringify({
                                ...parameters,
                                ...inputData,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            })
                        },
                    });

                    return NextResponse.json({
                        error: error instanceof Error ? error.message : 'Unknown error',
                    }, { status: 500 });
                }
            }

            return NextResponse.json({
                error: 'External API not implemented for this model',
            }, { status: 501 });
        }

        return NextResponse.json({
            error: 'Unknown API type',
        }, { status: 500 });

    } catch (error: any) {
        console.error('❌ Generation API error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error',
        }, { status: 500 });
    }
}
