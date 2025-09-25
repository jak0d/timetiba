import { Router } from 'express';
import { ImportController } from '../controllers/importController';
import { fileUploadService } from '../services/import/fileUploadService';
import { optionalAuth } from '../middleware/auth';
import mappingConfigurationRoutes from './mappingConfigurationRoutes';

const router = Router();
const importController = new ImportController();

// Apply optional authentication middleware to all import routes
// This allows the routes to work with or without authentication
router.use(optionalAuth);

// File upload endpoint with error handling
router.post('/upload', 
  (req, res, next) => {
    const uploadMiddleware = fileUploadService.getUploadMiddleware();
    uploadMiddleware(req, res, (err) => {
      if (err) {
        // Handle multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds 10MB limit',
            code: 'FILE_TOO_LARGE',
            timestamp: new Date()
          });
        }
        
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            message: 'Invalid file type. Only CSV and Excel files are allowed.',
            code: 'INVALID_FILE_TYPE',
            timestamp: new Date()
          });
        }

        // Other multer errors
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          code: 'UPLOAD_ERROR',
          details: {
            error: err.message
          },
          timestamp: new Date()
        });
      }
      next();
    });
  },
  importController.uploadFile.bind(importController)
);

// File management endpoints
router.get('/files/:fileId', importController.getFileInfo.bind(importController));
router.get('/files/:fileId/metadata', importController.getFileMetadata.bind(importController));
router.get('/files/:fileId/columns', importController.analyzeFileColumns.bind(importController));
router.delete('/files/:fileId', importController.deleteFile.bind(importController));

// LLM-powered intelligent import endpoints
router.post('/files/:fileId/llm-process', importController.processWithLLM.bind(importController));
router.post('/llm-analysis/create-entities', importController.createEntitiesFromLLM.bind(importController));
router.get('/llm/status', importController.getLLMStatus.bind(importController));

// Mapping configuration endpoints
router.use('/mappings', mappingConfigurationRoutes);

export { router as importRoutes };