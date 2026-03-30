import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = 'info';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[currentLevel];
}

export const logger = {
  debug(msg: string, context?: Record<string, unknown>) {
    if (!shouldLog('debug')) return;
    const prefix = chalk.gray('[debug]');
    console.error(`${prefix} ${msg}`, context ? chalk.gray(JSON.stringify(context)) : '');
  },

  info(msg: string) {
    if (!shouldLog('info')) return;
    console.error(chalk.blue('ℹ'), msg);
  },

  warn(msg: string) {
    if (!shouldLog('warn')) return;
    console.error(chalk.yellow('⚠'), msg);
  },

  error(msg: string, err?: Error) {
    if (!shouldLog('error')) return;
    console.error(chalk.red('✖'), msg);
    if (err?.stack) {
      console.error(chalk.gray(err.stack));
    }
  },
};
