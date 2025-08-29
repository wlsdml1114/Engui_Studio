import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (jobId) {
      // 특정 작업 상태 확인
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });
      
      if (!job) {
        return NextResponse.json({
          success: false,
          error: 'Job not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        job
      });
    }
    
    // 모든 작업 목록 반환 (기존 로직)
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('❌ GET /api/jobs failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}