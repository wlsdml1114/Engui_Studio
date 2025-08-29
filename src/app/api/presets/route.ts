
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const presets = await prisma.preset.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json({ presets });
  } catch (error) {
    console.error('Error fetching presets:', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, name, type, options } = await request.json();

    if (!userId || !name || !type || !options) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newPreset = await prisma.preset.create({
      data: {
        userId,
        name,
        type,
        options: JSON.stringify(options),
      },
    });

    return NextResponse.json({ preset: newPreset }, { status: 201 });
  } catch (error) {
    console.error('Error creating preset:', error);
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}
