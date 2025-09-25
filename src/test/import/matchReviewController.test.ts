import request from 'supertest';
import express from 'express';
import { matchReviewRoutes } from '../../routes/matchReviewRoutes';
import { matchReviewService } from '../../services/import/matchReviewService';
import { EntityMatchResults, MatchResult } from '../../types/import';

// Mock the match review service
jest.mock('../../services/import/matchReviewService');
jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'user123' };
    next();
  }
}));

const mockMatchReviewService = matchReviewService as jest.Mocked<typeof matchReviewService>;

const app = express();
app.use(express.json());
app.use('/api/match-review', matchReviewRoutes);

describe('MatchReviewController Integration Tests', () => {
  const mockUserId = 'user123';
  const mockSessionId = 'session123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/match-review/sessions', () => {
    it('should create a new review session successfully', async () => {
      const mockSession = {
        sessionId: mockSessionId,
        userId: mockUserId,
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      mockMatchReviewService.createReviewSession.mockResolvedValue(mockSession as any);

      const requestBody = {
        sessionId: mockSessionId,
        entityMatches: {
          venues: [[0, createMockMatchResult('venue1', 0.85)]],
          lecturers: [],
          courses: [],
          studentGroups: []
        }
      };

      const response = await request(app)
        .post('/api/match-review/sessions')
        .send(requestBody)
        .expect(201);

      expect(response.body.sessionId).toBe(mockSessionId);
      expect(response.body.confidenceThresholds).toBeDefined();
      expect(mockMatchReviewService.createReviewSession).toHaveBeenCalledWith(
        mockSessionId,
        mockUserId,
        expect.any(Object),
        undefined
      );
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/match-review/sessions')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Session ID and entity matches are required');
    });

    it('should create session with custom thresholds', async () => {
      const mockSession = {
        sessionId: mockSessionId,
        userId: mockUserId,
        confidenceThresholds: {
          autoApproveThreshold: 0.9,
          requireReviewThreshold: 0.6,
          autoRejectThreshold: 0.2
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      mockMatchReviewService.createReviewSession.mockResolvedValue(mockSession as any);

      const requestBody = {
        sessionId: mockSessionId,
        entityMatches: { venues: [], lecturers: [], courses: [], studentGroups: [] },
        confidenceThresholds: {
          autoApproveThreshold: 0.9,
          requireReviewThreshold: 0.6,
          autoRejectThreshold: 0.2
        }
      };

      const response = await request(app)
        .post('/api/match-review/sessions')
        .send(requestBody)
        .expect(201);

      expect(response.body.confidenceThresholds.autoApproveThreshold).toBe(0.9);
    });
  });

  describe('GET /api/match-review/sessions/:sessionId', () => {
    it('should return session details successfully', async () => {
      const mockSession = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: new Map([[0, createMockMatchResult('venue1', 0.85)]]),
          lecturers: new Map(),
          courses: new Map(),
          studentGroups: new Map()
        },
        reviewedMatches: new Map(),
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000)
      };

      mockMatchReviewService.getReviewSession.mockResolvedValue(mockSession as any);

      const response = await request(app)
        .get(`/api/match-review/sessions/${mockSessionId}`)
        .expect(200);

      expect(response.body.sessionId).toBe(mockSessionId);
      expect(response.body.entityMatches).toBeDefined();
      expect(response.body.entityMatches.venues).toHaveLength(1);
    });

    it('should return 404 for non-existent session', async () => {
      mockMatchReviewService.getReviewSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/match-review/sessions/nonexistent')
        .expect(404);

      expect(response.body.error).toBe('Review session not found or expired');
    });
  });

  describe('POST /api/match-review/review', () => {
    it('should review a single match successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Match review applied successfully',
        updatedMatch: createMockMatchResult('venue1', 0.85)
      };

      mockMatchReviewService.reviewMatch.mockResolvedValue(mockResult);

      const requestBody = {
        sessionId: mockSessionId,
        entityType: 'venue',
        rowIndex: 0,
        action: 'approve',
        selectedMatchId: 'venue1'
      };

      const response = await request(app)
        .post('/api/match-review/review')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.updatedMatch).toBeDefined();
      expect(mockMatchReviewService.reviewMatch).toHaveBeenCalledWith(
        requestBody,
        mockUserId
      );
    });

    it('should return 400 for invalid review request', async () => {
      const mockResult = {
        success: false,
        message: 'Invalid row index'
      };

      mockMatchReviewService.reviewMatch.mockResolvedValue(mockResult);

      const requestBody = {
        sessionId: mockSessionId,
        entityType: 'venue',
        rowIndex: 999,
        action: 'approve'
      };

      const response = await request(app)
        .post('/api/match-review/review')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('Invalid row index');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/match-review/review')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/match-review/batch-review', () => {
    it('should process batch reviews successfully', async () => {
      const mockResult = {
        success: true,
        processedCount: 2,
        failedCount: 0,
        errors: []
      };

      mockMatchReviewService.batchReviewMatches.mockResolvedValue(mockResult);

      const requestBody = {
        sessionId: mockSessionId,
        reviews: [
          {
            sessionId: mockSessionId,
            entityType: 'venue',
            rowIndex: 0,
            action: 'approve',
            selectedMatchId: 'venue1'
          },
          {
            sessionId: mockSessionId,
            entityType: 'lecturer',
            rowIndex: 0,
            action: 'reject'
          }
        ]
      };

      const response = await request(app)
        .post('/api/match-review/batch-review')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.processedCount).toBe(2);
      expect(response.body.failedCount).toBe(0);
    });

    it('should handle partial failures in batch review', async () => {
      const mockResult = {
        success: false,
        processedCount: 1,
        failedCount: 1,
        errors: ['Row 999: Invalid row index']
      };

      mockMatchReviewService.batchReviewMatches.mockResolvedValue(mockResult);

      const requestBody = {
        sessionId: mockSessionId,
        reviews: [
          {
            sessionId: mockSessionId,
            entityType: 'venue',
            rowIndex: 0,
            action: 'approve',
            selectedMatchId: 'venue1'
          },
          {
            sessionId: mockSessionId,
            entityType: 'venue',
            rowIndex: 999,
            action: 'reject'
          }
        ]
      };

      const response = await request(app)
        .post('/api/match-review/batch-review')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveLength(1);
    });
  });

  describe('GET /api/match-review/sessions/:sessionId/requiring-review', () => {
    it('should return matches requiring review', async () => {
      const mockMatches = {
        venues: [{ rowIndex: 0, match: createMockMatchResult('venue1', 0.85) }],
        lecturers: [{ rowIndex: 0, match: createMockMatchResult('lecturer1', 0.75) }],
        courses: [],
        studentGroups: []
      };

      mockMatchReviewService.getMatchesRequiringReview.mockResolvedValue(mockMatches);

      const response = await request(app)
        .get(`/api/match-review/sessions/${mockSessionId}/requiring-review`)
        .expect(200);

      expect(response.body.venues).toHaveLength(1);
      expect(response.body.lecturers).toHaveLength(1);
      expect(response.body.courses).toHaveLength(0);
      expect(response.body.studentGroups).toHaveLength(0);
    });

    it('should return 404 for non-existent session', async () => {
      mockMatchReviewService.getMatchesRequiringReview.mockRejectedValue(
        new Error('Review session not found or expired')
      );

      const response = await request(app)
        .get('/api/match-review/sessions/nonexistent/requiring-review')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/match-review/sessions/:sessionId/auto-approve', () => {
    it('should apply automatic approvals successfully', async () => {
      const mockResult = {
        approvedCount: 2,
        rejectedCount: 1
      };

      mockMatchReviewService.applyAutomaticApprovals.mockResolvedValue(mockResult);

      const response = await request(app)
        .post(`/api/match-review/sessions/${mockSessionId}/auto-approve`)
        .expect(200);

      expect(response.body.approvedCount).toBe(2);
      expect(response.body.rejectedCount).toBe(1);
      expect(mockMatchReviewService.applyAutomaticApprovals).toHaveBeenCalledWith(
        mockSessionId,
        mockUserId
      );
    });
  });

  describe('PUT /api/match-review/sessions/:sessionId/thresholds', () => {
    it('should update confidence thresholds successfully', async () => {
      mockMatchReviewService.updateConfidenceThresholds.mockResolvedValue(true);

      const requestBody = {
        autoApproveThreshold: 0.9,
        requireReviewThreshold: 0.6
      };

      const response = await request(app)
        .put(`/api/match-review/sessions/${mockSessionId}/thresholds`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Confidence thresholds updated successfully');
    });

    it('should return 404 for non-existent session', async () => {
      mockMatchReviewService.updateConfidenceThresholds.mockResolvedValue(false);

      const requestBody = {
        autoApproveThreshold: 0.9
      };

      const response = await request(app)
        .put('/api/match-review/sessions/nonexistent/thresholds')
        .send(requestBody)
        .expect(404);

      expect(response.body.error).toBe('Review session not found or expired');
    });

    it('should validate threshold values', async () => {
      const requestBody = {
        autoApproveThreshold: 1.5 // Invalid value > 1
      };

      const response = await request(app)
        .put(`/api/match-review/sessions/${mockSessionId}/thresholds`)
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('between 0 and 1');
    });
  });

  describe('GET /api/match-review/sessions/:sessionId/statistics', () => {
    it('should return comprehensive statistics', async () => {
      const mockStats = {
        totalMatches: 5,
        reviewedMatches: 3,
        pendingReviews: 2,
        autoApproved: 1,
        autoRejected: 1,
        manuallyReviewed: 1,
        byEntityType: {
          venues: { total: 2, reviewed: 1, pending: 1 },
          lecturers: { total: 2, reviewed: 1, pending: 1 },
          courses: { total: 1, reviewed: 1, pending: 0 },
          studentGroups: { total: 0, reviewed: 0, pending: 0 }
        }
      };

      mockMatchReviewService.getReviewStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get(`/api/match-review/sessions/${mockSessionId}/statistics`)
        .expect(200);

      expect(response.body.totalMatches).toBe(5);
      expect(response.body.reviewedMatches).toBe(3);
      expect(response.body.pendingReviews).toBe(2);
      expect(response.body.byEntityType.venues.total).toBe(2);
    });
  });
});

function createMockMatchResult(entityId: string, confidence: number): MatchResult {
  return {
    entityId,
    confidence,
    matchType: confidence >= 0.8 ? 'exact' : 'fuzzy',
    suggestedMatches: [
      {
        entityId,
        entity: { id: entityId, name: `Mock ${entityId}` },
        confidence,
        matchingFields: ['name']
      }
    ]
  };
}