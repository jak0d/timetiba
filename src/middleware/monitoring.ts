import { Request, Response, NextFunction } from 'express';
import { logger, addRequestId, logPerformance } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Extend Request interface to include monitoring data
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
      logger: typeof logger;
    }
  }
}

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  req.logger = addRequestId(req.requestId);
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Performance monitoring middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - req.startTime;
    
    // Log HTTP request
    req.logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: res.get('Content-Length')
    });
    
    // Log performance metric
    logPerformance(`${req.method} ${req.route?.path || req.url}`, duration, {
      statusCode: res.statusCode,
      method: req.method,
      route: req.route?.path
    });
    
    // Call original end method
    return originalEnd(chunk, encoding);
  };
  
  next();
};

// Memory usage monitoring
export const memoryMonitoringMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const memUsage = process.memoryUsage();
  
  req.logger.debug('Memory usage', {
    rss: memUsage.rss,
    heapTotal: memUsage.heapTotal,
    heapUsed: memUsage.heapUsed,
    external: memUsage.external,
    type: 'memory'
  });
  
  next();
};

// Error tracking middleware
export const errorTrackingMiddleware = (error: Error, req: Request, _res: Response, next: NextFunction) => {
  req.logger.error('Request error', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
    type: 'request_error'
  });
  
  next(error);
};

// Rate limiting monitoring
export const rateLimitMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const rateLimitInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.url,
    method: req.method
  };
  
  // Check if rate limit headers are present (from rate limiting middleware)
  if (res.get('X-RateLimit-Remaining')) {
    req.logger.debug('Rate limit info', {
      ...rateLimitInfo,
      remaining: res.get('X-RateLimit-Remaining'),
      limit: res.get('X-RateLimit-Limit'),
      reset: res.get('X-RateLimit-Reset'),
      type: 'rate_limit'
    });
  }
  
  next();
};

// Database query monitoring
export const createDatabaseMonitor = () => {
  const queryTimes = new Map<string, number>();
  
  return {
    startQuery: (queryId: string, query: string) => {
      queryTimes.set(queryId, Date.now());
      logger.debug('Database query started', {
        queryId,
        query: query.substring(0, 200), // Truncate long queries
        type: 'db_query_start'
      });
    },
    
    endQuery: (queryId: string, result?: any) => {
      const startTime = queryTimes.get(queryId);
      if (startTime) {
        const duration = Date.now() - startTime;
        queryTimes.delete(queryId);
        
        logger.debug('Database query completed', {
          queryId,
          duration,
          rowCount: result?.rowCount,
          type: 'db_query_end'
        });
        
        // Log slow queries
        if (duration > 1000) { // Queries taking more than 1 second
          logger.warn('Slow database query detected', {
            queryId,
            duration,
            type: 'slow_query'
          });
        }
      }
    },
    
    errorQuery: (queryId: string, error: Error) => {
      const startTime = queryTimes.get(queryId);
      const duration = startTime ? Date.now() - startTime : 0;
      queryTimes.delete(queryId);
      
      logger.error('Database query error', {
        queryId,
        duration,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        type: 'db_query_error'
      });
    }
  };
};

// AI service monitoring
export const aiServiceMonitor = {
  startOperation: (operationId: string, operation: string, data?: any) => {
    logger.info('AI operation started', {
      operationId,
      operation,
      dataSize: data ? JSON.stringify(data).length : 0,
      type: 'ai_operation_start'
    });
  },
  
  endOperation: (operationId: string, operation: string, result?: any, duration?: number) => {
    logger.info('AI operation completed', {
      operationId,
      operation,
      duration,
      resultSize: result ? JSON.stringify(result).length : 0,
      type: 'ai_operation_end'
    });
  },
  
  errorOperation: (operationId: string, operation: string, error: Error, duration?: number) => {
    logger.error('AI operation error', {
      operationId,
      operation,
      duration,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      type: 'ai_operation_error'
    });
  }
};

// WebSocket connection monitoring
export const websocketMonitor = {
  connectionEstablished: (connectionId: string, userId?: string) => {
    logger.info('WebSocket connection established', {
      connectionId,
      userId,
      type: 'websocket_connect'
    });
  },
  
  connectionClosed: (connectionId: string, userId?: string, reason?: string) => {
    logger.info('WebSocket connection closed', {
      connectionId,
      userId,
      reason,
      type: 'websocket_disconnect'
    });
  },
  
  messageReceived: (connectionId: string, messageType: string, messageSize: number) => {
    logger.debug('WebSocket message received', {
      connectionId,
      messageType,
      messageSize,
      type: 'websocket_message_in'
    });
  },
  
  messageSent: (connectionId: string, messageType: string, messageSize: number) => {
    logger.debug('WebSocket message sent', {
      connectionId,
      messageType,
      messageSize,
      type: 'websocket_message_out'
    });
  }
};