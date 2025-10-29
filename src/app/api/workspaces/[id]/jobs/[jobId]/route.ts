import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 작업을 워크스페이스로 이동
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: workspaceId, jobId } = await params;

    // 워크스페이스 존재 확인
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // 작업 존재 확인
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 워크스페이스 소유자와 작업 소유자가 같은지 확인
    if (workspace.userId !== job.userId) {
      return NextResponse.json(
        { error: 'Workspace and job must belong to the same user' },
        { status: 403 }
      );
    }

    // 작업을 워크스페이스로 이동
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { workspaceId }
    });

    console.log(`✅ Job ${jobId} moved to workspace ${workspaceId}`);
    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error('❌ Job move error:', error);
    return NextResponse.json(
      { error: 'Failed to move job to workspace' },
      { status: 500 }
    );
  }
}

// 작업을 워크스페이스에서 제거 (워크스페이스 분류 해제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { id: workspaceId, jobId } = await params;

    // 작업 존재 확인
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // 작업이 지정된 워크스페이스에 속하는지 확인
    if (job.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Job is not in the specified workspace' },
        { status: 400 }
      );
    }

    // 워크스페이스에서 제거
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { workspaceId: null }
    });

    console.log(`✅ Job ${jobId} removed from workspace ${workspaceId}`);
    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error('❌ Job removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove job from workspace' },
      { status: 500 }
    );
  }
}

