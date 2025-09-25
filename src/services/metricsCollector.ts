import { logger } from '../utils/logger';
import { alertingService } from './alertingService';
import { Pool } from 'pg';
import { createClient } from 'redis';

export interface SystemMetrics {
  timestamp: Date;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    usagePercent: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  database: {
    activeConnections?: number;
    responseTime?: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  };
  redis: {
    responseTime?: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  };
  uptime: number;
}

class MetricsCollector {
  private intervalId?: NodeJS.Timeout;
  private collectInterval: number = 60000; // 1 minute
  private metricsHistory: SystemMetrics[] = [];
  private maxHistorySize: number = 1440; // 24 hours of minute-by-minute data

  constructor() {
    this.collectInterval = parseInt(process.env['METRICS_COLLECTION_INTERVAL'] || '60000');
    this.maxHistorySize = parseInt(process.env['METRICS_HISTORY_SIZE'] || '1440');
  }

  start() {
    logger.info('Starting metrics collection', {
      interval: this.collectInterval,
      historySize: this.maxHistorySize,
      type: 'metrics_collector_start'
    });

    // Collect initial metrics
    this.collectMetrics();

    // Set up periodic collection
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.collectInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined as any;
      
      logger.info('Metrics collection stopped', {
        type: 'metrics_collector_stop'
      });
    }
  }

  private async collectMetrics() {
    try {
      const metrics = await this.gatherSystemMetrics();
      
      // Store metrics
      this.metricsHistory.push(metrics);
      
      // Trim history if it exceeds max size
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
      }

      // Log metrics
      logger.debug('System metrics collected', {
        ...metrics,
        type: 'system_metrics'
      });

      // Check for alerts
      await this.checkMetricsForAlerts(metrics);

    } catch (error) {
      logger.error('Failed to collect metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'metrics_collection_error'
      });
    }
  }

  private async gatherSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
      usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
    };

    const cpu = {
      user: cpuUsage.user,
      system: cpuUsage.system
    };

    const database = await this.checkDatabaseMetrics();
    const redis = await this.checkRedisMetrics();

    return {
      timestamp: new Date(),
      memory,
      cpu,
      database,
      redis,
      uptime: process.uptime()
    };
  }

  private async checkDatabaseMetrics(): Promise<SystemMetrics['database']> {
    const startTime = Date.now();
    
    try {
      const pool = new Pool({
        connectionString: process.env['DATABASE_URL']
      });

      const client = await pool.connect();
      
      // Simple query to check response time
      await client.query('SELECT 1');
      
      // Get connection count if possible
      const connectionResult = await client.query(
        'SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = $1',
        ['active']
      );
      
      client.release();
      await pool.end();
      
      const responseTime = Date.now() - startTime;
      const activeConnections = parseInt(connectionResult.rows[0]?.active_connections || '0');
      
      return {
        activeConnections,
        responseTime,
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy'
      };
      
    } catch (error) {
      return {
        responseTime: Date.now() - startTime,
        status: 'unhealthy'
      };
    }
  }

  private async checkRedisMetrics(): Promise<SystemMetrics['redis']> {
    const startTime = Date.now();
    
    try {
      const client = createClient({
        url: process.env['REDIS_URL'] || 'redis://localhost:6379'
      });
      
      await client.connect();
      await client.ping();
      await client.disconnect();
      
      const responseTime = Date.now() - startTime;
      
      return {
        responseTime,
        status: responseTime < 500 ? 'healthy' : responseTime < 1500 ? 'degraded' : 'unhealthy'
      };
      
    } catch (error) {
      return {
        responseTime: Date.now() - startTime,
        status: 'unhealthy'
      };
    }
  }

  private async checkMetricsForAlerts(metrics: SystemMetrics) {
    // Check memory usage
    if (metrics.memory.usagePercent > 85) {
      await alertingService.processEvent({
        memoryUsagePercent: metrics.memory.usagePercent,
        heapUsed: Math.round(metrics.memory.heapUsed / 1024 / 1024), // MB
        type: 'high_memory_usage'
      });
    }

    // Check database performance
    if (metrics.database.status === 'unhealthy') {
      await alertingService.processEvent({
        service: 'database',
        status: 'unhealthy',
        responseTime: metrics.database.responseTime,
        type: 'service_unavailable'
      });
    }

    // Check Redis performance
    if (metrics.redis.status === 'unhealthy') {
      await alertingService.processEvent({
        service: 'redis',
        status: 'unhealthy',
        responseTime: metrics.redis.responseTime,
        type: 'service_unavailable'
      });
    }

    // Check for performance degradation trends
    if (this.metricsHistory.length >= 5) {
      const recentMetrics = this.metricsHistory.slice(-5);
      const avgResponseTime = recentMetrics.reduce((sum, m) => 
        sum + (m.database.responseTime || 0), 0) / recentMetrics.length;
      
      if (avgResponseTime > 2000) {
        await alertingService.processEvent({
          operation: 'database_queries',
          duration: avgResponseTime,
          type: 'performance_degradation'
        });
      }
    }
  }

  // Public methods for accessing metrics
  getCurrentMetrics(): SystemMetrics | null {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1] 
      : null;
  }

  getMetricsHistory(minutes: number = 60): SystemMetrics[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp >= cutoffTime);
  }

  getAverageMetrics(minutes: number = 60): Partial<SystemMetrics> | null {
    const history = this.getMetricsHistory(minutes);
    if (history.length === 0) return null;

    const avgMemoryUsage = history.reduce((sum, m) => sum + m.memory.usagePercent, 0) / history.length;
    const avgDbResponseTime = history.reduce((sum, m) => sum + (m.database.responseTime || 0), 0) / history.length;
    const avgRedisResponseTime = history.reduce((sum, m) => sum + (m.redis.responseTime || 0), 0) / history.length;

    return {
      memory: {
        usagePercent: avgMemoryUsage,
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0
      },
      database: {
        responseTime: avgDbResponseTime,
        status: 'healthy'
      },
      redis: {
        responseTime: avgRedisResponseTime,
        status: 'healthy'
      }
    };
  }

  // Generate metrics report
  generateReport(): string {
    const current = this.getCurrentMetrics();
    const hourlyAvg = this.getAverageMetrics(60);
    
    if (!current) return 'No metrics available';

    return `
# System Metrics Report

## Current Status (${current.timestamp.toISOString()})
- **Memory Usage**: ${current.memory.usagePercent.toFixed(2)}% (${Math.round(current.memory.heapUsed / 1024 / 1024)}MB used)
- **Database Response Time**: ${current.database.responseTime || 'N/A'}ms
- **Redis Response Time**: ${current.redis.responseTime || 'N/A'}ms
- **Uptime**: ${Math.round(current.uptime / 3600)}h ${Math.round((current.uptime % 3600) / 60)}m

## Hourly Averages
- **Average Memory Usage**: ${hourlyAvg?.memory?.usagePercent?.toFixed(2) || 'N/A'}%
- **Average Database Response**: ${hourlyAvg?.database?.responseTime?.toFixed(2) || 'N/A'}ms
- **Average Redis Response**: ${hourlyAvg?.redis?.responseTime?.toFixed(2) || 'N/A'}ms

## Health Status
- **Database**: ${current.database.status}
- **Redis**: ${current.redis.status}
- **Overall**: ${this.getOverallHealth(current)}
    `.trim();
  }

  private getOverallHealth(metrics: SystemMetrics): string {
    if (metrics.database.status === 'unhealthy' || metrics.redis.status === 'unhealthy') {
      return 'unhealthy';
    }
    if (metrics.memory.usagePercent > 85 || 
        metrics.database.status === 'degraded' || 
        metrics.redis.status === 'degraded') {
      return 'degraded';
    }
    return 'healthy';
  }
}

export const metricsCollector = new MetricsCollector();