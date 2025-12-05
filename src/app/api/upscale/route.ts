import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { jobId, type } = body; // type: 'image' | 'video' | 'video-interpolation'

        // Get the original job
        const originalJob = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!originalJob) {
            return NextResponse.json({
                success: false,
                error: 'Original job not found'
            }, { status: 404 });
        }

        if (!originalJob.resultUrl) {
            return NextResponse.json({
                success: false,
                error: 'Original job has no result'
            }, { status: 400 });
        }

        // Get settings from database
        const settingsRecord = await prisma.settings.findFirst();
        const settings = settingsRecord?.settings as any;

        if (!settings?.upscale) {
            return NextResponse.json({
                success: false,
                error: 'Upscale endpoints not configured'
            }, { status: 400 });
        }

        // Get the unified upscale endpoint
        const endpointId = settings.upscale.endpoint;
        
        if (!endpointId) {
            return NextResponse.json({
                success: false,
                error: 'Upscale endpoint not configured'
            }, { status: 400 });
        }

        // Determine job type
        const jobType = (type === 'image') ? 'image' : 'video';

        // Create a new job for the upscale
        const newJob = await prisma.job.create({
            data: {
                userId: originalJob.userId,
                workspaceId: originalJob.workspaceId,
                modelId: type === 'video-interpolation' ? 'upscale-fi' : 'upscale',
                type: jobType as any,
                status: 'queued',
                prompt: `Upscale of: ${originalJob.prompt}`,
                options: JSON.stringify({
                    sourceUrl: originalJob.resultUrl,
                    upscaleType: type
                })
            }
        });

        // Determine media type and interpolation flag
        const mediaType = (type === 'image') ? 'image' : 'video';
        const withInterpolation = (type === 'video-interpolation');

        // Extract S3 path from resultUrl
        // Assuming resultUrl is like: https://s3.amazonaws.com/bucket/path/to/file.mp4
        // We need to extract: /path/to/file.mp4
        let s3Path = originalJob.resultUrl;
        try {
            const url = new URL(originalJob.resultUrl);
            s3Path = url.pathname; // Gets /bucket/path/to/file.mp4 or /path/to/file.mp4
            // If it includes bucket name, remove it
            if (s3Path.startsWith('/')) {
                const parts = s3Path.split('/');
                // Remove empty first element and potentially bucket name
                s3Path = '/' + parts.slice(1).join('/');
            }
        } catch (e) {
            // If URL parsing fails, assume it's already a path
            console.log('Using resultUrl as-is for S3 path:', s3Path);
        }

        console.log('📁 S3 path for upscale:', s3Path);

        // Call RunPod endpoint with S3 path
        try {
            const RunPodService = (await import('@/lib/runpodService')).default;
            const runpodService = new RunPodService(settings.apiKeys?.runpod, endpointId);
            
            const runpodJobId = await runpodService.submitUpscaleJob(
                s3Path,
                mediaType,
                withInterpolation
            );

            // Update job with RunPod job ID
            await prisma.job.update({
                where: { id: newJob.id },
                data: {
                    options: JSON.stringify({
                        sourceUrl: originalJob.resultUrl,
                        upscaleType: type,
                        runpodJobId
                    }),
                    status: 'processing'
                }
            });

            console.log('✅ Upscale job submitted to RunPod:', runpodJobId);

            return NextResponse.json({
                success: true,
                job: {
                    ...newJob,
                    status: 'processing'
                },
                runpodJobId
            });
        } catch (runpodError: any) {
            console.error('Failed to submit to RunPod:', runpodError);
            
            // Update job status to failed
            await prisma.job.update({
                where: { id: newJob.id },
                data: {
                    status: 'failed',
                    options: JSON.stringify({
                        sourceUrl: originalJob.resultUrl,
                        upscaleType: type,
                        error: runpodError.message
                    })
                }
            });

            return NextResponse.json({
                success: false,
                error: `Failed to submit to RunPod: ${runpodError.message}`,
                job: newJob
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error creating upscale job:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
