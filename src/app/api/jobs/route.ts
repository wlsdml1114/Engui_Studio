import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 간단한 메모리 캐시 (프로덕션에서는 Redis 사용 권장)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5초 캐시

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      workspaceId,
      type,
      status = 'completed',
      prompt,
      resultUrl,
      thumbnailUrl,
      options
    } = body;

    // 필수 필드 검증
    if (!userId || !type || !resultUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, resultUrl' },
        { status: 400 }
      );
    }

    // Job 생성
    const job = await prisma.job.create({
      data: {
        userId,
        workspaceId: workspaceId || null,
        type,
        status,
        prompt: prompt || null,
        resultUrl,
        thumbnailUrl: thumbnailUrl || null,
        options: options ? JSON.stringify(options) : null,
        createdAt: new Date(),
        completedAt: status === 'completed' ? new Date() : null
      }
    });

    // 캐시 무효화 (해당 사용자의 모든 캐시 제거)
    for (const [key, _] of cache.entries()) {
      if (key.includes(userId)) {
        cache.delete(key);
      }
    }

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId') || 'user-with-settings';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const onlyProcessing = searchParams.get('onlyProcessing') === 'true';
    const workspaceId = searchParams.get('workspaceId'); // 워크스페이스 필터 추가

    if (jobId) {
      // 특정 작업 조회
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, job });
    } else {
      // 캐시 키 생성 (워크스페이스 필터 포함)
      const cacheKey = `jobs-${userId}-${page}-${limit}-${onlyProcessing}-${workspaceId || 'all'}`;
      const cached = cache.get(cacheKey);
      
      // 캐시가 유효한지 확인
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({ success: true, ...cached.data });
      }

      // 쿼리 조건 구성
      const whereCondition: any = { userId };
      if (onlyProcessing) {
        whereCondition.status = 'processing';
      }
      
      // 워크스페이스 필터링
      if (workspaceId) {
        if (workspaceId === 'unassigned') {
          // 워크스페이스에 할당되지 않은 작업들
          whereCondition.workspaceId = null;
        } else {
          // 특정 워크스페이스의 작업들
          whereCondition.workspaceId = workspaceId;
        }
      }

      // 페이지네이션과 함께 작업 조회 (필요한 필드만 선택)
      const [jobs, totalCount] = await Promise.all([
        prisma.job.findMany({
          where: whereCondition,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            status: true,
            type: true,
            prompt: true,
            resultUrl: true,
            thumbnailUrl: true,
            createdAt: true,
            completedAt: true,
            isFavorite: true,
            options: true, // 입력 이미지 정보를 위해 options 필드 포함
            workspaceId: true, // 워크스페이스 ID 추가
            workspace: { // 워케이스 정보도 포함
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
        }),
        prisma.job.count({ where: whereCondition })
      ]);

      const result = {
        jobs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1,
        }
      };

      // 캐시에 저장
      cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return NextResponse.json({ success: true, ...result });
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}