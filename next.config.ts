/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
    level: process.env.NEXT_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'info' : 'error'),
  },
  // 개발 환경에서도 프로덕션 수준의 로깅
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivity: false,
      buildActivityPosition: 'bottom-right',
    },
    // 조용한 모드일 때 HTTP 요청 로그 최소화
    ...(process.env.NEXT_LOG_LEVEL === 'error' && {
      onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
      },
    })
  })
};

export default nextConfig;
