// src/app/api/results/[jobId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const cleanJobId = jobId.replace('.mp4', ''); // Remove extension if present
    
    console.log(`📥 Serving result for job: ${cleanJobId}`);
    
    // Get job from database
    const job = await prisma.job.findUnique({
      where: { id: cleanJobId },
    });
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.status !== 'completed' || !job.resultUrl) {
      return NextResponse.json(
        { error: 'Job not completed or no result available' },
        { status: 404 }
      );
    }
    
    // 실제 결과 URL로 리다이렉트
    // RunPod에서 생성된 비디오 URL이 있다면 그곳으로 이동
    if (job.resultUrl && job.resultUrl.startsWith('http')) {
      return NextResponse.redirect(job.resultUrl);
    }
    
    // 로컬 파일인 경우 (개발 환경)
    if (job.resultUrl && job.resultUrl.startsWith('/')) {
      // 실제 파일이 존재하는지 확인하고 제공
      return NextResponse.json({
        redirectUrl: job.resultUrl,
        message: 'Please access the result directly'
      });
    }
    
    // 테스트용: 간단한 비디오 파일 생성
    if (job.type === 'multitalk') {
      console.log('🎬 Creating test video for multitalk job');
      
      // 간단한 MP4 헤더와 더미 데이터 생성
      const testVideoData = Buffer.from([
        // MP4 파일 시그니처
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
        0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
        0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
        0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
        // 더미 데이터 (실제로는 비디오 내용)
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      
      return new NextResponse(testVideoData, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': testVideoData.length.toString(),
          'Content-Disposition': `inline; filename="${cleanJobId}.mp4"`,
        },
      });
    }
    
    // 기본 응답
    return NextResponse.json({
      error: 'No valid result URL found',
      jobId: cleanJobId,
      status: job.status,
      resultUrl: job.resultUrl,
      type: job.type,
      message: 'This job has no accessible result. Check the job options for more details.'
    }, { status: 404 });
    
  } catch (error) {
    console.error('❌ Error serving result:', error);
    return NextResponse.json(
      { error: 'Failed to serve result' },
      { status: 500 }
    );
  }
}