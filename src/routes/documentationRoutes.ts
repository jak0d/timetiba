import { Router } from 'express';
import { DocumentationController } from '../controllers/documentationController';

const router = Router();
const documentationController = new DocumentationController();

/**
 * @route GET /api/documentation/import
 * @desc Get complete import documentation
 * @access Public
 */
router.get('/import', documentationController.getImportDocumentation);

/**
 * @route GET /api/documentation/help/:step
 * @desc Get contextual help for a specific import step
 * @access Public
 */
router.get('/help/:step', documentationController.getContextualHelp);

/**
 * @route GET /api/documentation/validation-rules
 * @desc Get validation rules documentation
 * @access Public
 */
router.get('/validation-rules', documentationController.getValidationRules);

/**
 * @route GET /api/documentation/import-steps
 * @desc Get step-by-step import process
 * @access Public
 */
router.get('/import-steps', documentationController.getImportSteps);

/**
 * @route GET /api/documentation/format-requirements
 * @desc Get format requirements documentation
 * @access Public
 */
router.get('/format-requirements', documentationController.getFormatRequirements);

/**
 * @route GET /api/documentation/search
 * @desc Search documentation content
 * @access Public
 */
router.get('/search', documentationController.searchDocumentation);

/**
 * @route GET /api/documentation/section/:sectionId
 * @desc Get specific documentation section by ID
 * @access Public
 */
router.get('/section/:sectionId', documentationController.getDocumentationSection);

export default router;