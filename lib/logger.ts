// Centralized logging module for server-side debugging
// Controlled by LOG_LEVEL env var: ERROR | WARN | DB | API | DEBUG
// Default: ERROR in production, DEBUG in development

type LogLevel = 'ERROR' | 'WARN' | 'DB' | 'API' | 'DEBUG';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  API: 2,
  DB: 3,
  DEBUG: 4,
};

function getCurrentLevel(): number {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && LEVEL_PRIORITY[envLevel] !== undefined) return LEVEL_PRIORITY[envLevel];
  return process.env.NODE_ENV === 'production' ? LEVEL_PRIORITY.ERROR : LEVEL_PRIORITY.DEBUG;
}

const SENSITIVE_KEYS = new Set([
  'password', 'token', 'secret', 'cookie', 'authorization', 'apiKey', 'api_key',
  'sessionToken', 'refreshToken', 'accessToken', 'privateKey', 'sessionId',
]);

function sanitize(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
      result[key] = sanitize(data[key]);
    } else {
      result[key] = data[key];
    }
  }
  return result;
}

function formatLog(level: LogLevel, module: string, operation: string, context?: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(sanitize(context))}` : '';
  return `[${timestamp}] [${level}] [${module}] ${operation}${ctx}`;
}

export const logger = {
  error(module: string, operation: string, context?: Record<string, any>) {
    if (getCurrentLevel() < LEVEL_PRIORITY.ERROR) return;
    console.error(formatLog('ERROR', module, operation, context));
  },

  warn(module: string, operation: string, context?: Record<string, any>) {
    if (getCurrentLevel() < LEVEL_PRIORITY.WARN) return;
    console.warn(formatLog('WARN', module, operation, context));
  },

  api(module: string, operation: string, context?: Record<string, any>) {
    if (getCurrentLevel() < LEVEL_PRIORITY.API) return;
    console.log(formatLog('API', module, operation, context));
  },

  db(module: string, operation: string, context?: Record<string, any>) {
    if (getCurrentLevel() < LEVEL_PRIORITY.DB) return;
    console.log(formatLog('DB', module, operation, context));
  },

  debug(module: string, operation: string, context?: Record<string, any>) {
    if (getCurrentLevel() < LEVEL_PRIORITY.DEBUG) return;
    console.log(formatLog('DEBUG', module, operation, context));
  },

  // Prisma operation wrapper — logs duration and errors without raw data
  async dbOp<T>(module: string, model: string, op: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      if (getCurrentLevel() >= LEVEL_PRIORITY.DB) {
        console.log(formatLog('DB', module, `${model}.${op}`, { durationMs: Date.now() - start, status: 'ok' }));
      }
      return result;
    } catch (error: any) {
      console.error(formatLog('DB', module, `${model}.${op}`, {
        durationMs: Date.now() - start,
        status: 'error',
        errorCode: error?.code,
        errorMessage: error?.message?.slice(0, 200),
      }));
      throw error;
    }
  },
};

// Client-side logger — lightweight, outputs to browser console
export const clientLog = {
  error(module: string, operation: string, context?: Record<string, any>) {
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    console.error(`[${module}] ${operation}${ctx}`);
  },
  warn(module: string, operation: string, context?: Record<string, any>) {
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    console.warn(`[${module}] ${operation}${ctx}`);
  },
  info(module: string, operation: string, context?: Record<string, any>) {
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    console.log(`[${module}] ${operation}${ctx}`);
  },
};
