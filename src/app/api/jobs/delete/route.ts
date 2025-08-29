import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // 작업 삭제
    const deletedJob = await prisma.job.delete({
      where: { id: jobId }
    });

    // 관련 파일들도 정리 (선택사항)
    // 여기서는 데이터베이스 레코드만 삭제

    return NextResponse.json({ 
      success: true, 
      message: 'Job deleted successfully',
      deletedJob 
    });

  } catch (error) {
    console.error('Error deleting job:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to delete job', 
        details: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete job' 
    }, { status: 500 });
  }
}
