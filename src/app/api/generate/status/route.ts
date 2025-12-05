import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import RunPodService from '@/lib/runpodService';
import SettingsService from '@/lib/settingsService';
import { getModelById } from '@/lib/models/modelConfig';

const prisma = new PrismaClient();
const settingsService = new SettingsService();

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');
        const userId = searchParams.get('userId') || 'user-with-settings';

        if (!jobId) {
            return NextResponse.json({ success: false, error: 'Missing jobId parameter' }, { status: 400 });
        }

        // Get job from database to find the model and runpod job ID
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
        }

        // Get model config
        const jobData = job as any; // Prisma client type may be out of sync
        const model = getModelById(jobData.modelId || 'unknown');
        if (!model) {
            return NextResponse.json({ success: false, error: 'Unknown model' }, { status: 400 });
        }

        // Only handle RunPod jobs
        if (model.api.type !== 'runpod') {
            return NextResponse.json({ success: false, error: 'Not a RunPod job' }, { status: 400 });
        }

        // Get settings
        const { settings } = await settingsService.getSettings(userId);
        
        if (!settings.runpod?.apiKey) {
            return NextResponse.json({ success: false, error: 'RunPod API key not configured' }, { status: 400 });
        }

        const endpoints = settings.runpod.endpoints as Record<string, string> | undefined;
        const endpointId = endpoints?.[model.id] || model.api.endpoint;
        
        if (!endpointId) {
            return NextResponse.json({ success: false, error: 'Endpoint not configured' }, { status: 400 });
        }

        // Create RunPod service and check status
        const runpodService = new RunPodService(settings.runpod.apiKey, endpointId);
        
        // Extract runpod job ID from job options
        const options = typeof job.options === 'string' ? JSON.parse(job.options) : job.options;
        const runpodJobId = options.runpodJobId || jobId;

        const status = await runpodService.getJobStatus(runpodJobId);

        // Job이 취소되었거나 실패한 경우 DB 업데이트
        if (status.status === 'FAILED') {
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'failed',
                    options: JSON.stringify({
                        ...options,
                        error: status.error || 'Job failed or was cancelled'
                    })
                }
            });
        }

        return NextResponse.json({
            success: true,
            status: status.status,
            output: status.output,
            error: status.error
        });

    } catch (error: any) {
        console.error('Status Check Error:', error);
        
        // 404 에러가 아닌 경우에만 500 에러 반환
        // 404는 이미 getJobStatus에서 처리됨
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
