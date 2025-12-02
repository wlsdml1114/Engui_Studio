import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Delete video track
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;

    const track = await prisma.videoTrack.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return NextResponse.json({ error: 'Video track not found' }, { status: 404 });
    }

    // Delete track (cascade will handle keyframes)
    await prisma.videoTrack.delete({
      where: { id: trackId }
    });

    console.log(`✅ Video track deleted: ${trackId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Video track deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video track' },
      { status: 500 }
    );
  }
}
