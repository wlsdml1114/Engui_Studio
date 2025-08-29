
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { jobId, resultUrl } = await request.json();

    if (!jobId || !resultUrl) {
      return NextResponse.json({ error: 'Missing jobId or resultUrl' }, { status: 400 });
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        resultUrl,
        completedAt: new Date(),
      },
    });

    if (!updatedJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Webhook received and job updated', job: updatedJob });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
