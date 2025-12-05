import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch workspace media
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json({
                success: false,
                error: 'workspaceId is required'
            }, { status: 400 });
        }

        const media = await prisma.workspaceMedia.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            media
        });
    } catch (error: any) {
        console.error('Failed to fetch workspace media:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// POST - Create workspace media
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, workspaceId, type, url, prompt, modelId, createdAt } = body;

        if (!workspaceId || !type || !url) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields'
            }, { status: 400 });
        }

        const media = await prisma.workspaceMedia.create({
            data: {
                id,
                workspaceId,
                type,
                url,
                prompt: prompt || null,
                modelId: modelId || null,
                createdAt: createdAt ? new Date(createdAt) : new Date()
            }
        });

        return NextResponse.json({
            success: true,
            media
        });
    } catch (error: any) {
        console.error('Failed to create workspace media:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
