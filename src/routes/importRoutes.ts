import { Router } from 'express';
import { ImportController } from '../controllers/importController';
import { fileUploadService } from '../services/import/fileUploadService';
import mappingConfigurationRoutes from './mappingConfigurationRoutes';

const router = Router();
const importController = new ImportController();

// File upload endpoint
router.post('/upload', 
  fileUploadService.getUploadMiddleware(),
  importController.uploadFile.bind(importController)
);

// File management endpoints
router.get('/files/:fileId', importController.getFileInfo.bind(importController));
router.get('/files/:fileId/metadata', importController.getFileMetadata.bind(importController));
router.get('/files/:fileId/columns', importController.analyzeFileColumns.bind(importController));
router.delete('/files/:fileId', importController.deleteFile.bind(importController));

// Mapping configuration endpoints
router.use('/mappings', mappingConfigurationRoutes);

export { router as importRoutes };