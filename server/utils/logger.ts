// server/utils/logger.ts
// Structured logger – replaces bare console.log/error/warn calls.
// In production, only WARN+ is printed. In development, all levels are printed.
// Format: [LEVEL] [TIMESTAMP] message  (+ optional meta JSON)

const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: LogLevel = isDev ? 'debug' : 'info';

function stamp() {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

function format(level: LogLevel, message: string, meta?: unknown): string {
  const base = `[${level.toUpperCase()}] [${stamp()}] ${message}`;
  if (meta === undefined || meta === null) return base;
  if (meta instanceof Error) return `${base}\n${meta.stack ?? meta.message}`;
  try {
    return `${base} ${JSON.stringify(meta)}`;
  } catch {
    return `${base} [unserializable]`;
  }
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (shouldLog('debug')) console.debug(format('debug', message, meta));
  },
  info(message: string, meta?: unknown) {
    if (shouldLog('info')) console.info(format('info', message, meta));
  },
  warn(message: string, meta?: unknown) {
    if (shouldLog('warn')) console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: unknown) {
    if (shouldLog('error')) console.error(format('error', message, meta));
  },
};

export default logger;
