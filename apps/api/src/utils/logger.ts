import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function format(level: LogLevel, args: unknown[]): string {
  return `[${level}] ${args
    .filter((item) => item !== undefined)
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item instanceof Error) {
        return item.stack ?? item.message;
      }
      try {
        return JSON.stringify(item);
      } catch {
        return String(item);
      }
    })
    .join(' ')}`;
}

function write(level: LogLevel, args: unknown[]): void {
  const message = format(level, args);
  if (level === 'error') {
    console.error(message);
    return;
  }
  if (level === 'warn') {
    console.warn(message);
    return;
  }
  if (level !== 'debug' || env.LOG_LEVEL === 'debug') {
    console.log(message);
  }
}

export const logger = {
  debug: (...args: unknown[]) => write('debug', args),
  info: (...args: unknown[]) => write('info', args),
  warn: (...args: unknown[]) => write('warn', args),
  error: (...args: unknown[]) => write('error', args)
};
