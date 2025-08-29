
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const activities = await prisma.creditActivity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching credit activities:', error);
    return NextResponse.json({ error: 'Failed to fetch credit activities' }, { status: 500 });
  }
}
