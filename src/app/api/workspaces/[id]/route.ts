import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 워크스페이스 조회 (작업 목록 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        },
        _count: {
          select: { jobs: true }
        }
      }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const totalPages = Math.ceil(workspace._count.jobs / limit);

    return NextResponse.json({
      workspace,
      pagination: {
        currentPage: page,
        totalPages,
        totalJobs: workspace._count.jobs,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('❌ Workspace fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}

// 워크스페이스 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;
    const { name, description, color, isDefault } = await request.json();

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // 기본 워크스페이스로 설정하는 경우, 현재 기본 워크스페이스에서 기본값 해제
    if (isDefault && !workspace.isDefault) {
      await prisma.workspace.updateMany({
        where: { 
          userId: workspace.userId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    // 중복 이름 체크 (자신 제외)
    if (name && name !== workspace.name) {
      const existingWorkspace = await prisma.workspace.findFirst({
        where: { 
          userId: workspace.userId,
          name,
          NOT: { id: workspaceId }
        }
      });

      if (existingWorkspace) {
        return NextResponse.json(
          { error: '워크스페이스 이름이 이미 존재합니다.' },
          { status: 409 }
        );
      }
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(isDefault !== undefined && { isDefault })
      }
    });

    console.log(`✅ Workspace updated: ${updatedWorkspace.id}`);
    return NextResponse.json({ workspace: updatedWorkspace });
  } catch (error) {
    console.error('❌ Workspace update error:', error);
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

// 워크스페이스 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // 기본 워크스페이스는 삭제할 수 없음
    if (workspace.isDefault) {
      return NextResponse.json(
        { error: '기본 워크스페이스는 삭제할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 워크스페이스의 모든 작업을 기본 워크스페이스로 이동
    const defaultWorkspace = await prisma.workspace.findFirst({
      where: {
        userId: workspace.userId,
        isDefault: true
      }
    });

    if (defaultWorkspace) {
      await prisma.job.updateMany({
        where: { workspaceId },
        data: { workspaceId: defaultWorkspace.id }
      });
    } else {
      // 기본 워크스페이스가 없는 경우 작업들은 워크스페이스 분류 해제
      await prisma.job.updateMany({
        where: { workspaceId },
        data: { workspaceId: null }
      });
    }

    // 워크스페이스 삭제
    await prisma.workspace.delete({
      where: { id }

    });

    console.log(`✅ Workspace deleted: ${workspaceId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Workspace deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
