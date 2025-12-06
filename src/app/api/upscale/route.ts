import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import SettingsService from '@/lib/settingsService';

const settingsService = new SettingsService();

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
        const { settings } = await settingsService.getSettings(originalJob.userId);

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

        // Handle local file path - need to upload to S3 first
        let s3Url = originalJob.resultUrl;
        let volumePath = '';
        
        // Check if resultUrl is a local path (starts with / but not /runpod-volume/)
        if (originalJob.resultUrl.startsWith('/') && !originalJob.resultUrl.startsWith('/runpod-volume/') && !originalJob.resultUrl.startsWith('http')) {
            console.log('📁 Local file detected, uploading to S3:', originalJob.resultUrl);
            
            // Upload local file to S3
            try {
                const S3Service = (await import('@/lib/s3Service')).default;
                const fs = await import('fs');
                const path = await import('path');
                
                // Read local file
                const localFilePath = path.join(process.cwd(), 'public', originalJob.resultUrl);
                console.log('📂 Reading local file:', localFilePath);
                
                if (!fs.existsSync(localFilePath)) {
                    throw new Error(`Local file not found: ${localFilePath}`);
                }
                
                const fileBuffer = fs.readFileSync(localFilePath);
                const fileName = path.basename(originalJob.resultUrl);
                
                // Get S3 settings
                if (!settings.s3?.endpointUrl || !settings.s3?.accessKeyId || !settings.s3?.secretAccessKey) {
                    throw new Error('S3 settings not configured');
                }
                
                const s3Service = new S3Service({
                    endpointUrl: settings.s3.endpointUrl,
                    accessKeyId: settings.s3.accessKeyId,
                    secretAccessKey: settings.s3.secretAccessKey,
                    bucketName: settings.s3.bucketName || settings.s3.bucket || 'my-bucket',
                    region: settings.s3.region || 'us-east-1',
                });
                
                // Upload to S3 in upscale-inputs folder
                const mimeType = mediaType === 'image' ? 'image/png' : 'video/mp4';
                const uploadResult = await s3Service.uploadFile(fileBuffer, fileName, mimeType, 'upscale-inputs');
                
                console.log('✅ Uploaded to S3:', uploadResult.s3Url);
                s3Url = uploadResult.s3Url;
                volumePath = `/runpod-volume/upscale-inputs/${fileName}`;
            } catch (uploadError: any) {
                console.error('❌ Failed to upload to S3:', uploadError);
                throw new Error(`Failed to upload file to S3: ${uploadError.message}`);
            }
        } else if (originalJob.resultUrl.startsWith('/runpod-volume/')) {
            // Already a volume path
            volumePath = originalJob.resultUrl;
            console.log('📁 Already a RunPod volume path:', volumePath);
        } else {
            // S3 URL - convert to volume path
            try {
                const url = new URL(originalJob.resultUrl);
                const pathParts = url.pathname.split('/').filter(p => p);
                if (pathParts.length > 0) {
                    // Remove bucket name (first part) and join the rest
                    const filePathInBucket = pathParts.slice(1).join('/');
                    volumePath = `/runpod-volume/${filePathInBucket}`;
                }
            } catch (e) {
                throw new Error(`Invalid resultUrl format: ${originalJob.resultUrl}`);
            }
            console.log('📁 Converted S3 URL to RunPod volume path:', volumePath);
        }

        // Call RunPod endpoint with S3 path
        try {
            const RunPodService = (await import('@/lib/runpodService')).default;
            const runpodService = new RunPodService(settings.runpod?.apiKey, endpointId);
            
            const runpodJobId = await runpodService.submitUpscaleJob(
                volumePath,
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
