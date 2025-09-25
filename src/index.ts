import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { 
  requestIdMiddleware, 
  performanceMiddleware, 
  memoryMonitoringMiddleware,
  errorTrackingMiddleware 
} from './middleware/monitoring';
import { alertingService } from './services/alertingService';
import { metricsCollector } from './services/metricsCollector';
import { importInitialization } from './services/import/initializationService';

// Load environment variables
config();

const app = express();
const PORT = process.env['PORT'] || 8000;

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
import { join } from 'path';
try {
  mkdirSync(join(process.cwd(), 'logs'), { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Monitoring middleware (before other middleware)
app.use(requestIdMiddleware);
app.use(performanceMiddleware);
app.use(memoryMonitoringMiddleware);

// Security and parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
import apiRoutes from './routes';
import healthRoutes from './routes/healthRoutes';

// Health and monitoring routes
app.use('/', healthRoutes);

// API routes
app.use('/api', apiRoutes);

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({
    message: 'AI Timetabler API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      venues: '/api/venues',
      lecturers: '/api/lecturers',
      courses: '/api/courses',
      studentGroups: '/api/student-groups',
      schedules: '/api/schedules',
      import: '/api/import',
      documentation: '/api/documentation'
    }
  });
});

// Error handling middleware
app.use(errorTrackingMiddleware);
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Log error and trigger alert
  req.logger.error('Unhandled application error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    url: req.url,
    method: req.method,
    type: 'unhandled_error'
  });

  // Trigger alert for system errors
  alertingService.processEvent({
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    type: 'system_error',
    source: 'api-server',
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  metricsCollector.stop();
  await importInitialization.shutdown();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  metricsCollector.stop();
  await importInitialization.shutdown();
  server.close(() => {
    process.exit(0);
  });
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason,
    promise,
    type: 'unhandled_rejection'
  });
  
  alertingService.processEvent({
    error: { message: `Unhandled Promise Rejection: ${reason}` },
    type: 'system_error',
    source: 'process'
  });
});

// Uncaught exception handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    type: 'uncaught_exception'
  });
  
  alertingService.processEvent({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    type: 'system_error',
    source: 'process'
  });
  
  process.exit(1);
});

// Start server
const server = app.listen(PORT, async () => {
  logger.info('AI Timetabler API server started', {
    port: PORT,
    environment: process.env['NODE_ENV'] || 'development',
    nodeVersion: process.version,
    type: 'server_start'
  });
  
  // Start metrics collection
  metricsCollector.start();
  
  // Initialize import infrastructure
  try {
    await importInitialization.initialize();
    logger.info('Import infrastructure initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize import infrastructure:', error);
  }
  
  console.log(`🚀 AI Timetabler API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`🔍 API info: http://localhost:${PORT}/api`);
});

// Export both app and server for testing
export { app, server };
export default app;