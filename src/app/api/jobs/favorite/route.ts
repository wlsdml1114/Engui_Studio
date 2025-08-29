import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // 현재 작업의 즐겨찾기 상태 확인
    const currentJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { isFavorite: true }
    });

    if (!currentJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 즐겨찾기 상태 토글
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { isFavorite: !currentJob.isFavorite }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Job ${updatedJob.isFavorite ? 'added to' : 'removed from'} favorites`,
      isFavorite: updatedJob.isFavorite
    });

  } catch (error) {
    console.error('Error toggling favorite:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to toggle favorite', 
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to toggle favorite' 
    }, { status: 500 });
  }
}
