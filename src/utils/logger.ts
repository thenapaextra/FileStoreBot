// ─── Structured Logger for Cloudflare Workers ───

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export function log(level: LogLevel, module: string, message: string, data?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(data ? { data } : {}),
  };
  switch (level) {
    case LogLevel.ERROR:
      console.error(JSON.stringify(entry));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(entry));
      break;
    default:
      console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (module: string, msg: string, data?: any) => log(LogLevel.INFO, module, msg, data),
  warn: (module: string, msg: string, data?: any) => log(LogLevel.WARN, module, msg, data),
  error: (module: string, msg: string, data?: any) => log(LogLevel.ERROR, module, msg, data),
  debug: (module: string, msg: string, data?: any) => log(LogLevel.DEBUG, module, msg, data),
};
