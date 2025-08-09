export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4
}

const colors = {
  reset: '\x1b[0m',
  debug: '\x1b[90m',    // Gray
  info: '\x1b[36m',     // Cyan  
  success: '\x1b[32m',  // Green
  warn: '\x1b[33m',     // Yellow
  error: '\x1b[31m',    // Red
};

const icons = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.SUCCESS]: '✅',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌'
};

function getLogLevel(): LogLevel {
  const level = process.env.STACKSPRINTER_LOG_LEVEL?.toUpperCase();
  switch (level) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'SUCCESS': return LogLevel.SUCCESS;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    default: return LogLevel.INFO;
  }
}

export function log(message: string, level: LogLevel = LogLevel.INFO): void {
  const currentLevel = getLogLevel();
  
  if (level < currentLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const icon = icons[level] || '';
  const color = getColorForLevel(level);
  const levelText = LogLevel[level];
  
  if (process.env.NODE_ENV === 'test') {
    // Plain text for tests
    console.log(`[${levelText}] ${message}`);
    return;
  }
  
  if (level === LogLevel.ERROR) {
    console.error(`${color}${icon} [${timestamp}] ${levelText}: ${message}${colors.reset}`);
  } else {
    console.log(`${color}${icon} ${message}${colors.reset}`);
  }
}

function getColorForLevel(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG: return colors.debug;
    case LogLevel.INFO: return colors.info;
    case LogLevel.SUCCESS: return colors.success;
    case LogLevel.WARN: return colors.warn;
    case LogLevel.ERROR: return colors.error;
    default: return colors.reset;
  }
}

export function redactSecrets(text: string): string {
  // Redact common secret patterns
  return text
    .replace(/token[=:]\s*[^\s"']+/gi, 'token=***')
    .replace(/key[=:]\s*[^\s"']+/gi, 'key=***')
    .replace(/password[=:]\s*[^\s"']+/gi, 'password=***')
    .replace(/secret[=:]\s*[^\s"']+/gi, 'secret=***')
    .replace(/authorization:\s*bearer\s+[^\s"']+/gi, 'authorization: bearer ***')
    .replace(/(sb[a-zA-Z0-9]{40,})/g, 'sb***') // Supabase keys
    .replace(/(vercel_[a-zA-Z0-9]{24})/g, 'vercel_***') // Vercel tokens
    .replace(/(ghp_[a-zA-Z0-9]{36})/g, 'ghp_***'); // GitHub tokens
}

export function logCommand(command: string): void {
  log(`Executing: ${redactSecrets(command)}`, LogLevel.DEBUG);
}

export function logError(error: Error | string, context?: string): void {
  const message = error instanceof Error ? error.message : error;
  const fullMessage = context ? `${context}: ${message}` : message;
  log(redactSecrets(fullMessage), LogLevel.ERROR);
}