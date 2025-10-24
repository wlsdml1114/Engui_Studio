// 로그 레벨 타입
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// 현재 로그 레벨 가져오기
const getCurrentLogLevel = (): LogLevel => {
  if (process.env.NEXT_LOG_LEVEL === 'error') return 'error';
  if (process.env.NODE_ENV === 'production') return 'error';
  return process.env.NODE_ENV === 'development' ? 'info' : 'error';
};

// 로그 레벨 순서 (높을수록 상세함)
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 로그 출력 여부 확인
const shouldLog = (level: LogLevel): boolean => {
  const currentLevel = getCurrentLogLevel();
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
};

// 로거 함수들
export const logger = {
  error: (message: string, ...args: any[]) => {
    if (shouldLog('error')) {
      console.error(`❌ ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  },

  info: (message: string, ...args: any[]) => {
    if (shouldLog('info')) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  },

  debug: (message: string, ...args: any[]) => {
    if (shouldLog('debug')) {
      console.log(`🐛 ${message}`, ...args);
    }
  },

  // 기존 이모지 로그들 (하위 호환성)
  emoji: {
    encryption: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) console.log(`🔓 ${message}`, ...args);
    },
    loading: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) console.log(`📖 ${message}`, ...args);
    },
    testing: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) console.log(`🔧 ${message}`, ...args);
    },
    stats: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) console.log(`📊 ${message}`, ...args);
    },
    search: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) console.log(`🔍 ${message}`, ...args);
    }
  }
};