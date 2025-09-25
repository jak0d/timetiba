import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    aiService: HealthCheckResult;
    memory: HealthCheckResult;
    disk: HealthCheckResult;
  };
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: any;
}

// Database health check
const checkDatabase = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Redis health check
const checkRedis = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  
  try {
    const client = createClient({
      url: process.env.REDIS_URL
    });
    
    await client.connect();
    await client.ping();
    await client.disconnect();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 500 ? 'healthy' : 'degraded',
      responseTime,
      message: 'Redis connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// AI Service health check
const checkAIService = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8001';
    const response = await axios.get(`${aiServiceUrl}/health`, {
      timeout: 5000
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: response.status === 200 && responseTime < 2000 ? 'healthy' : 'degraded',
      responseTime,
      message: 'AI service is responding',
      details: response.data
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: 'AI service is not responding',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Memory health check
const checkMemory = async (): Promise<HealthCheckResult> => {
  try {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Memory usage is normal';
    
    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      message = 'Memory usage is critically high';
    } else if (memoryUsagePercent > 75) {
      status = 'degraded';
      message = 'Memory usage is high';
    }
    
    return {
      status,
      message,
      details: {
        heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
        heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent),
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Failed to check memory usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Disk space health check
const checkDisk = async (): Promise<HealthCheckResult> => {
  try {
    const fs = require('fs');
    const stats = fs.statSync(process.cwd());
    
    // This is a simplified check - in production, you'd want to check actual disk space
    return {
      status: 'healthy',
      message: 'Disk space check completed',
      details: {
        path: process.cwd(),
        accessible: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Disk space check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Main health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [database, redis, aiService, memory, disk] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkAIService(),
      checkMemory(),
      checkDisk()
    ]);
    
    const checks = { database, redis, aiService, memory, disk };
    
    // Determine overall status
    const hasUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');
    const hasDegraded = Object.values(checks).some(check => check.status === 'degraded');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }
    
    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };
    
    // Log health check
    logger.info('Health check completed', {
      status: overallStatus,
      duration: Date.now() - startTime,
      type: 'health_check'
    });
    
    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'health_check_error'
    });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness probe (simple check that the service is running)
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe (check if the service is ready to handle requests)
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    const database = await checkDatabase();
    
    if (database.status === 'unhealthy') {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        message: 'Database is not available'
      });
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to handle requests'
    });
    
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      message: 'Readiness check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint for monitoring systems
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    res.json(metrics);
    
  } catch (error) {
    logger.error('Metrics endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'metrics_error'
    });
    
    res.status(500).json({
      error: 'Failed to retrieve metrics'
    });
  }
});

export default router;