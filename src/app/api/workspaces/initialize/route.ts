import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // 사용자의 기본 워크스페이스가 이미 있는지 확인
    const existingDefaultWorkspace = await prisma.workspace.findFirst({
      where: {
        userId,
        isDefault: true
      }
    });

    if (existingDefaultWorkspace) {
      return NextResponse.json({
        workspace: existingDefaultWorkspace,
        isNew: false
      });
    }

    // 이름이 'Default workspace'인 워크스페이스가 있는지 확인
    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        userId,
        name: 'Default workspace'
      }
    });

    if (existingWorkspace) {
      // 기존 워크스페이스를 기본 워크스페이스로 설정
      const updatedWorkspace = await prisma.workspace.update({
        where: { id: existingWorkspace.id },
        data: { isDefault: true }
      });

      // 기존 워크스페이스에 분류되지 않은 모든 작업을 기본 워크스페이스로 이동
      await prisma.job.updateMany({
        where: {
          userId,
          workspaceId: null
        },
        data: {
          workspaceId: updatedWorkspace.id
        }
      });

      console.log(`✅ Existing workspace set as default and jobs migrated: ${updatedWorkspace.id}`);

      return NextResponse.json({
        workspace: updatedWorkspace,
        isNew: false
      });
    }

    // 기본 워크스페이스 생성
    const defaultWorkspace = await prisma.workspace.create({
      data: {
        userId,
        name: 'Default workspace',
        description: 'Default workspace where all your work is saved.',
        color: '#3B82F6', // 파란색
        isDefault: true
      }
    });

    // 기존 워크스페이스에 분류되지 않은 모든 작업을 기본 워크스페이스로 이동
    await prisma.job.updateMany({
      where: {
        userId,
        workspaceId: null
      },
      data: {
        workspaceId: defaultWorkspace.id
      }
    });

    console.log(`✅ Default workspace created and jobs migrated: ${defaultWorkspace.id}`);
    
    return NextResponse.json({ 
      workspace: defaultWorkspace,
      isNew: true 
    });
  } catch (error) {
    console.error('❌ Workspace initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize workspace' },
      { status: 500 }
    );
  }
}
