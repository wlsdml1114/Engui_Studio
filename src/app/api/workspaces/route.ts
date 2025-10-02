import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 워크스페이스 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // 기본 워크스페이스를 먼저
        { createdAt: 'asc' }
      ],
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('❌ Workspace fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

// 워크스페이스 생성
export async function POST(request: NextRequest) {
  try {
    const { userId, name, description, color } = await request.json();

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'userId and name are required' },
        { status: 400 }
      );
    }

    // 중복 이름 체크
    const existingWorkspace = await prisma.workspace.findFirst({
      where: { userId, name }
    });

    if (existingWorkspace) {
      return NextResponse.json(
        { error: '워크스페이스 이름이 이미 존재합니다.' },
        { status: 409 }
      );
    }

    // 첫 번째 워크스페이스인지 확인
    const workspaceCount = await prisma.workspace.count({
      where: { userId }
    });

    const workspace = await prisma.workspace.create({
      data: {
        userId,
        name,
        description,
        color,
        isDefault: workspaceCount === 0 // 첫 번째 워크스페이스는 기본값으로 설정
      }
    });

    console.log(`✅ Workspace created: ${workspace.id} (${workspace.name})`);
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error('❌ Workspace creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
