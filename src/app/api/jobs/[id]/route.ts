import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params;

        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return NextResponse.json({
                success: false,
                error: 'Job not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            job: {
                id: job.id,
                userId: job.userId,
                workspaceId: job.workspaceId,
                status: job.status,
                type: job.type,
                modelId: (job as any).modelId || 'unknown',
                prompt: job.prompt,
                options: job.options,
                resultUrl: job.resultUrl,
                thumbnailUrl: job.thumbnailUrl,
                imageInputPath: (job as any).imageInputPath,
                videoInputPath: (job as any).videoInputPath,
                audioInputPath: (job as any).audioInputPath,
                createdAt: job.createdAt,
                completedAt: (job as any).completedAt
            }
        });
    } catch (error: any) {
        console.error('Error fetching job:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params;
        const body = await request.json();

        const job = await prisma.job.update({
            where: { id: jobId },
            data: body
        });

        return NextResponse.json({
            success: true,
            job
        });
    } catch (error: any) {
        console.error('Error updating job:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params;

        await prisma.job.delete({
            where: { id: jobId }
        });

        return NextResponse.json({
            success: true
        });
    } catch (error: any) {
        console.error('Error deleting job:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
