/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    },
    // Turbopack에서 Remotion 관련 패키지 제외
    turbo: {
      resolveAlias: {
        // Remotion bundler는 서버 사이드에서만 사용
      },
    },
  },
  // Remotion bundler를 webpack에서 외부 모듈로 처리
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@remotion/bundler': 'commonjs @remotion/bundler',
        '@remotion/renderer': 'commonjs @remotion/renderer',
      });
    }
    return config;
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
