import { Router } from 'express';
import { matchReviewController } from '../controllers/matchReviewController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation schemas
const createReviewSessionValidation = [
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('entityMatches').isObject().withMessage('Entity matches must be an object'),
  body('confidenceThresholds').optional().isObject().withMessage('Confidence thresholds must be an object'),
  body('confidenceThresholds.autoApproveThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Auto approve threshold must be between 0 and 1'),
  body('confidenceThresholds.requireReviewThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Require review threshold must be between 0 and 1'),
  body('confidenceThresholds.autoRejectThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Auto reject threshold must be between 0 and 1')
];

const reviewMatchValidation = [
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('entityType').isIn(['venue', 'lecturer', 'course', 'studentGroup']).withMessage('Invalid entity type'),
  body('rowIndex').isInt({ min: 0 }).withMessage('Row index must be a non-negative integer'),
  body('action').isIn(['approve', 'reject', 'create_new']).withMessage('Invalid action'),
  body('selectedMatchId').optional().isString().withMessage('Selected match ID must be a string'),
  body('customData').optional().isObject().withMessage('Custom data must be an object')
];

const batchReviewValidation = [
  body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('reviews').isArray().withMessage('Reviews must be an array'),
  body('reviews.*.entityType').isIn(['venue', 'lecturer', 'course', 'studentGroup']).withMessage('Invalid entity type'),
  body('reviews.*.rowIndex').isInt({ min: 0 }).withMessage('Row index must be a non-negative integer'),
  body('reviews.*.action').isIn(['approve', 'reject', 'create_new']).withMessage('Invalid action'),
  body('reviews.*.selectedMatchId').optional().isString().withMessage('Selected match ID must be a string'),
  body('reviews.*.customData').optional().isObject().withMessage('Custom data must be an object')
];

const sessionIdValidation = [
  param('sessionId').isString().notEmpty().withMessage('Session ID is required')
];

const updateThresholdsValidation = [
  param('sessionId').isString().notEmpty().withMessage('Session ID is required'),
  body('autoApproveThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Auto approve threshold must be between 0 and 1'),
  body('requireReviewThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Require review threshold must be between 0 and 1'),
  body('autoRejectThreshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Auto reject threshold must be between 0 and 1')
];

/**
 * @route POST /api/match-review/sessions
 * @desc Create a new match review session
 * @access Private
 */
router.post('/sessions', 
  createReviewSessionValidation,
  validateRequest,
  matchReviewController.createReviewSession.bind(matchReviewController)
);

/**
 * @route GET /api/match-review/sessions/:sessionId
 * @desc Get match review session details
 * @access Private
 */
router.get('/sessions/:sessionId',
  sessionIdValidation,
  validateRequest,
  matchReviewController.getReviewSession.bind(matchReviewController)
);

/**
 * @route POST /api/match-review/review
 * @desc Review a single match
 * @access Private
 */
router.post('/review',
  reviewMatchValidation,
  validateRequest,
  matchReviewController.reviewMatch.bind(matchReviewController)
);

/**
 * @route POST /api/match-review/batch-review
 * @desc Review multiple matches in batch
 * @access Private
 */
router.post('/batch-review',
  batchReviewValidation,
  validateRequest,
  matchReviewController.batchReviewMatches.bind(matchReviewController)
);

/**
 * @route GET /api/match-review/sessions/:sessionId/requiring-review
 * @desc Get matches requiring review based on confidence thresholds
 * @access Private
 */
router.get('/sessions/:sessionId/requiring-review',
  sessionIdValidation,
  validateRequest,
  matchReviewController.getMatchesRequiringReview.bind(matchReviewController)
);

/**
 * @route POST /api/match-review/sessions/:sessionId/auto-approve
 * @desc Apply automatic approvals based on confidence thresholds
 * @access Private
 */
router.post('/sessions/:sessionId/auto-approve',
  sessionIdValidation,
  validateRequest,
  matchReviewController.applyAutomaticApprovals.bind(matchReviewController)
);

/**
 * @route PUT /api/match-review/sessions/:sessionId/thresholds
 * @desc Update confidence thresholds for a session
 * @access Private
 */
router.put('/sessions/:sessionId/thresholds',
  updateThresholdsValidation,
  validateRequest,
  matchReviewController.updateConfidenceThresholds.bind(matchReviewController)
);

/**
 * @route GET /api/match-review/sessions/:sessionId/statistics
 * @desc Get review statistics for a session
 * @access Private
 */
router.get('/sessions/:sessionId/statistics',
  sessionIdValidation,
  validateRequest,
  matchReviewController.getReviewStatistics.bind(matchReviewController)
);

export { router as matchReviewRoutes };