
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { callAiWorker } from '@/lib/aiWorker';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId, type, prompt, options } = await request.json();

    // 1. Create a new job record in the database with 'processing' status
    const job = await prisma.job.create({
      data: {
        id: Math.random().toString(36).substring(2, 15), // Simple unique ID for now
        userId,
        status: 'processing',
        type,
        prompt,
        options: JSON.stringify(options),
        createdAt: new Date(),
      },
    });

    // Deduct credit and record activity
    await prisma.creditActivity.create({
      data: {
        userId,
        activity: `Generated ${type} content (Job ID: ${job.id})`,
        amount: -1, // Deduct 1 credit per generation
      },
    });

    // 2. Call external AI worker API
    const callbackUrl = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/api/webhook/complete`;
    callAiWorker(job.id, { type, prompt, options, callbackUrl });

    return NextResponse.json({ jobId: job.id, status: 'processing' });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}
