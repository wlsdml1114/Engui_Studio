import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, resultUrl, error, cost } = body;

        const job = await prisma.job.update({
            where: { id },
            data: {
                status,
                resultUrl,
                error,
                cost,
                completedAt: status === 'completed' ? new Date() : undefined
            }
        });

        return NextResponse.json({ success: true, job });
    } catch (error) {
        console.error('Error updating job:', error);
        return NextResponse.json(
            { error: 'Failed to update job' },
            { status: 500 }
        );
    }
}
