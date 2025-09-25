import { Router } from 'express';
import { TemplateController } from '../controllers/templateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const templateController = new TemplateController();

// Apply authentication middleware to all template routes
router.use(authMiddleware);

/**
 * @route GET /api/templates
 * @desc Get list of available import templates
 * @access Private
 */
router.get('/', templateController.getAvailableTemplates);

/**
 * @route GET /api/templates/:templateId
 * @desc Get detailed template information
 * @access Private
 */
router.get('/:templateId', templateController.getTemplateDetails);

/**
 * @route GET /api/templates/:templateId/columns
 * @desc Get template column definitions
 * @access Private
 */
router.get('/:templateId/columns', templateController.getTemplateColumns);

/**
 * @route GET /api/templates/:templateId/download/csv
 * @desc Download CSV template file
 * @access Private
 */
router.get('/:templateId/download/csv', templateController.downloadCSVTemplate);

/**
 * @route GET /api/templates/:templateId/download/excel
 * @desc Download Excel template file
 * @access Private
 */
router.get('/:templateId/download/excel', templateController.downloadExcelTemplate);

export default router;