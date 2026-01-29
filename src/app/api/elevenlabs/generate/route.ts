import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import ElevenLabsService from '@/lib/elevenlabsService';
import SettingsService from '@/lib/settingsService';
import S3Service from '@/lib/s3Service';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';

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
        const { settings } = await settingsService.getSettings(userId);

        if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
            throw new Error('S3 settings not configured');
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



        // Get settings
        const { settings } = await settingsService.getSettings(userId);

        if (!settings.elevenlabs?.apiKey) {
            return NextResponse.json({
                error: 'Eleven Labs API key not configured',
            }, { status: 400 });
        }

        // Extract prompt
        const prompt = formData.get('prompt') as string;
        if (!prompt) {
            return NextResponse.json({
                error: 'Missing required field: prompt',
            }, { status: 400 });
        }

        // Extract model parameters
        const modelParameters = JSON.parse(formData.get('parameters') as string || '{}');

        // Get Elevent Labs service
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
        const modelName = modelId === 'elevenlabs-tts' ? 'TTS' : 'Music';

        // Generate audio based on model type
        if (modelId === 'elevenlabs-tts') {
            audioBlob = await elevenlabsService.generateSpeech({
                text: prompt,
                voice_id: modelParameters.voiceId || settings.elevenlabs.voiceId || 'EXAVITQu4vr4xnSDxMaL',
                model_id: modelParameters.modelId || settings.elevenlabs.model || 'eleven_multilingual_v2',
                voice_settings: {
                    stability: modelParameters.stability ?? settings.elevenlabs.stability ?? 0.8,
                    similarity_boost: modelParameters.similarity ?? settings.elevenlabs.similarity ?? 0.8,
                    style: modelParameters.style ?? settings.elevenlabs.style ?? 0.0,
                    use_speaker_boost: true,
                },
            });
        } else if (modelId === 'elevenlabs-music') {
            audioBlob = await elevenlabsService.generateMusic({
                text: prompt,
                model_id: modelParameters.modelId || 'music_generator_v2',
                prompt_genre: modelParameters.prompt_genre,
                prompt_tempo: modelParameters.prompt_tempo,
                prompt_instrumentation: modelParameters.prompt_instrumentation,
                prompt_structure: modelParameters.prompt_structure,
                duration_seconds: modelParameters.duration_seconds,
            });
        } else {
            return NextResponse.json({
                error: `Unknown model: ${modelId}`,
            }, { status: 400 });
        }

        // Save to local storage and/or S3
        const uploadToS3 = createUploadToS3(userId, language);
        const audioFileName = `${modelId}_${uuidv4()}.mp3`;
        const audioFilePath = `audio/${audioFileName}`;

        // Save to local storage first
        const localPath = join(LOCAL_STORAGE_DIR, audioFilePath);
        const audioBuffer = await audioBlob.arrayBuffer();
        await writeFile(localPath, Buffer.from(audioBuffer));

        // Convert Blob to File for S3 upload
        const audioFile = new File([audioBuffer], audioFileName, { type: 'audio/mpeg' });

        let s3Url: string | undefined;
        let finalFilePath = audioFilePath;

        // Upload to S3 if configured
        try {
            await uploadToS3(audioFile, audioFileName);
        } catch (s3Error) {
            console.warn('S3 upload failed, using local storage only:', s3Error);
        }

        // Save to database
        const job = await prisma.job.create({
            data: {
                userId,
                workspaceId,
                modelId,
                prompt,
                status: 'completed',
                resultUrl: finalFilePath,
                type: 'audio',
                options: JSON.stringify(modelParameters),
            },
        });


        // Return the generated audio
        return NextResponse.json({
            success: true,
            jobId: job.id,
            audioUrl: s3Url || `/api/results/${audioFileName}`,
            localPath: `/api/results/${audioFileName}`,
            duration: audioBlob.size, // Approximate duration based on file size
            model: modelName,
            message: `${modelName} generation completed successfully`,
        });

    } catch (error) {
        console.error('Eleven Labs generation error:', error);

        // Save failed job
        try {
            const userId = (await request.formData()).get('userId') as string || 'user-with-settings';
            const modelId = (await request.formData()).get('modelId') as string;
            const workspaceId = (await request.formData()).get('workspaceId') as string;
            const prompt = (await request.formData()).get('prompt') as string;

            await prisma.job.create({
                data: {
                    userId,
                    workspaceId,
                    modelId,
                    prompt: prompt || '',
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    type: 'audio',
                },
            });
        } catch (dbError) {
            console.error('Failed to save error job:', dbError);
        }

        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error occurred',
            details: error instanceof Error ? error.stack : undefined,
        }, { status: 500 });
    }
}