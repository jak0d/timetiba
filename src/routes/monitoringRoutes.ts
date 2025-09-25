import { Router, Request, Response } from 'express';
import { metricsCollector } from '../services/metricsCollector';
import { alertingService } from '../services/alertingService';
import { logger } from '../utils/logger';

const router = Router();

// Get current system metrics
router.get('/monitoring/metrics/current', (req: Request, res: Response) => {
  try {
    const metrics = metricsCollector.getCurrentMetrics();
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'No metrics available yet'
      });
    }

    res.json({
      success: true,
      data: metrics
    });
    
  } catch (error) {
    logger.error('Failed to get current metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics'
    });
  }
});

// Get metrics history
router.get('/monitoring/metrics/history', (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const history = metricsCollector.getMetricsHistory(minutes);
    
    res.json({
      success: true,
      data: {
        metrics: history,
        timeRange: `${minutes} minutes`,
        count: history.length
      }
    });
    
  } catch (error) {
    logger.error('Failed to get metrics history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics history'
    });
  }
});

// Get average metrics
router.get('/monitoring/metrics/average', (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const averages = metricsCollector.getAverageMetrics(minutes);
    
    if (!averages) {
      return res.status(404).json({
        success: false,
        message: 'No metrics available for averaging'
      });
    }

    res.json({
      success: true,
      data: {
        averages,
        timeRange: `${minutes} minutes`
      }
    });
    
  } catch (error) {
    logger.error('Failed to get average metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve average metrics'
    });
  }
});

// Get metrics report
router.get('/monitoring/report', (req: Request, res: Response) => {
  try {
    const report = metricsCollector.generateReport();
    
    // Return as plain text for easy reading
    res.setHeader('Content-Type', 'text/plain');
    res.send(report);
    
  } catch (error) {
    logger.error('Failed to generate metrics report', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate metrics report'
    });
  }
});

// Get active alerts
router.get('/monitoring/alerts/active', (req: Request, res: Response) => {
  try {
    const activeAlerts = alertingService.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        alerts: activeAlerts,
        count: activeAlerts.length
      }
    });
    
  } catch (error) {
    logger.error('Failed to get active alerts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active alerts'
    });
  }
});

// Get alert history
router.get('/monitoring/alerts/history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = alertingService.getAlertHistory(limit);
    
    res.json({
      success: true,
      data: {
        alerts: history,
        count: history.length,
        limit
      }
    });
    
  } catch (error) {
    logger.error('Failed to get alert history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alert history'
    });
  }
});

// Resolve an alert
router.post('/monitoring/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    
    await alertingService.resolveAlert(alertId);
    
    logger.info('Alert resolved via API', {
      alertId,
      resolvedBy: req.headers['user-id'] || 'unknown',
      type: 'alert_resolved_api'
    });
    
    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
    
  } catch (error) {
    logger.error('Failed to resolve alert', {
      alertId: req.params.alertId,
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert'
    });
  }
});

// Trigger test alert (for testing purposes)
router.post('/monitoring/alerts/test', async (req: Request, res: Response) => {
  try {
    const { type = 'system_error', severity = 'medium' } = req.body;
    
    await alertingService.processEvent({
      error: {
        name: 'TestError',
        message: 'This is a test alert triggered via API',
        stack: 'Test stack trace'
      },
      type: 'system_error',
      source: 'monitoring-api',
      test: true
    });
    
    logger.info('Test alert triggered', {
      type,
      severity,
      triggeredBy: req.headers['user-id'] || 'unknown',
      type_log: 'test_alert_triggered'
    });
    
    res.json({
      success: true,
      message: 'Test alert triggered successfully'
    });
    
  } catch (error) {
    logger.error('Failed to trigger test alert', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to trigger test alert'
    });
  }
});

// Get monitoring dashboard data
router.get('/monitoring/dashboard', (req: Request, res: Response) => {
  try {
    const currentMetrics = metricsCollector.getCurrentMetrics();
    const activeAlerts = alertingService.getActiveAlerts();
    const recentHistory = metricsCollector.getMetricsHistory(60); // Last hour
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      status: currentMetrics ? getOverallStatus(currentMetrics, activeAlerts) : 'unknown',
      metrics: {
        current: currentMetrics,
        history: recentHistory.map(m => ({
          timestamp: m.timestamp,
          memoryUsage: m.memory.usagePercent,
          dbResponseTime: m.database.responseTime,
          redisResponseTime: m.redis.responseTime
        }))
      },
      alerts: {
        active: activeAlerts,
        activeCount: activeAlerts.length,
        criticalCount: activeAlerts.filter(a => a.severity === 'critical').length,
        highCount: activeAlerts.filter(a => a.severity === 'high').length
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json({
      success: true,
      data: dashboard
    });
    
  } catch (error) {
    logger.error('Failed to get dashboard data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: 'monitoring_api_error'
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data'
    });
  }
});

// Helper function to determine overall status
function getOverallStatus(metrics: any, alerts: any[]): string {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');
  
  if (criticalAlerts.length > 0 || 
      metrics.database.status === 'unhealthy' || 
      metrics.redis.status === 'unhealthy') {
    return 'critical';
  }
  
  if (highAlerts.length > 0 || 
      metrics.memory.usagePercent > 85 ||
      metrics.database.status === 'degraded' || 
      metrics.redis.status === 'degraded') {
    return 'warning';
  }
  
  return 'healthy';
}

export default router;