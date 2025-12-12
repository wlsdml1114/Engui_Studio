import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get list of video projects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const projects = await prisma.videoProject.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        tracks: {
          include: {
            keyframes: true
          }
        }
      }
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('❌ Video projects fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video projects' },
      { status: 500 }
    );
  }
}

// Create new video project
export async function POST(request: NextRequest) {
  try {
    const { title, description, aspectRatio, duration } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    // Validate aspectRatio if provided
    if (aspectRatio && !['16:9', '9:16', '1:1'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: 'aspectRatio must be one of: 16:9, 9:16, 1:1' },
        { status: 400 }
      );
    }

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== 'number' || duration <= 0)) {
      return NextResponse.json(
        { error: 'duration must be a positive number' },
        { status: 400 }
      );
    }

    const project = await prisma.videoProject.create({
      data: {
        title,
        description: description || '',
        aspectRatio: aspectRatio || '16:9',
        duration: duration || 30000
      }
    });

    console.log(`✅ Video project created: ${project.id} (${project.title})`);

    return NextResponse.json({ project });
  } catch (error) {
    console.error('❌ Video project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create video project' },
      { status: 500 }
    );
  }
}
