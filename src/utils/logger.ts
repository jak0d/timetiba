import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(logColors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'ai-timetabler',
      environment: process.env['NODE_ENV'] || 'development',
      ...meta
    };

    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports
const transports = [];

// Console transport for development
if (process.env['NODE_ENV'] !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
}

// File transports
transports.push(
  // Error log file
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // HTTP requests log
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'http.log'),
    level: 'http',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 3
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false
});

// Add request ID to logs
export const addRequestId = (requestId: string) => {
  return logger.child({ requestId });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, metadata?: any) => {
  logger.info('Performance metric', {
    operation,
    duration,
    type: 'performance',
    ...metadata
  });
};

// Security logging
export const logSecurity = (event: string, userId?: string, metadata?: any) => {
  logger.warn('Security event', {
    event,
    userId,
    type: 'security',
    ...metadata
  });
};

// Business logic logging
export const logBusiness = (event: string, metadata?: any) => {
  logger.info('Business event', {
    event,
    type: 'business',
    ...metadata
  });
};

// Error logging with context
export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    type: 'error',
    ...context
  });
};

// Database operation logging
export const logDatabase = (operation: string, table: string, duration?: number, metadata?: any) => {
  logger.debug('Database operation', {
    operation,
    table,
    duration,
    type: 'database',
    ...metadata
  });
};

// AI service logging
export const logAI = (operation: string, duration?: number, metadata?: any) => {
  logger.info('AI service operation', {
    operation,
    duration,
    type: 'ai',
    ...metadata
  });
};

export { logger };