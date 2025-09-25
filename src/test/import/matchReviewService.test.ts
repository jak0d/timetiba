import { matchReviewService, MatchReviewRequest, BatchMatchReviewRequest } from '../../services/import/matchReviewService';
import { EntityMatchResults, MatchResult } from '../../types/import';
import { redisManager } from '../../utils/redisConfig';

// Mock Redis manager
jest.mock('../../utils/redisConfig', () => ({
  redisManager: {
    getClient: jest.fn(() => ({
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn()
    }))
  }
}));

const mockRedisManager = redisManager as jest.Mocked<typeof redisManager>;
const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn()
};

// Setup mock to return the mock client
(mockRedisManager.getClient as jest.Mock).mockReturnValue(mockRedisClient);

describe('MatchReviewService', () => {
  const mockUserId = 'user123';
  const mockSessionId = 'session123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReviewSession', () => {
    it('should create a new review session with default thresholds', async () => {
      const entityMatches: EntityMatchResults = {
        venues: new Map([[0, createMockMatchResult('venue1', 0.85)]]),
        lecturers: new Map([[0, createMockMatchResult('lecturer1', 0.75)]]),
        courses: new Map([[0, createMockMatchResult('course1', 0.95)]]),
        studentGroups: new Map([[0, createMockMatchResult('group1', 0.65)]])
      };

      mockRedisClient.setEx.mockResolvedValue('OK');

      const session = await matchReviewService.createReviewSession(
        mockSessionId,
        mockUserId,
        entityMatches
      );

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.userId).toBe(mockUserId);
      expect(session.confidenceThresholds).toEqual({
        autoApproveThreshold: 0.95,
        requireReviewThreshold: 0.7,
        autoRejectThreshold: 0.3
      });
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `match_review:${mockSessionId}`,
        3600,
        expect.any(String)
      );
    });

    it('should create a review session with custom thresholds', async () => {
      const entityMatches: EntityMatchResults = {
        venues: new Map(),
        lecturers: new Map(),
        courses: new Map(),
        studentGroups: new Map()
      };

      const customThresholds = {
        autoApproveThreshold: 0.9,
        requireReviewThreshold: 0.6,
        autoRejectThreshold: 0.2
      };

      mockRedisClient.setEx.mockResolvedValue('OK');

      const session = await matchReviewService.createReviewSession(
        mockSessionId,
        mockUserId,
        entityMatches,
        customThresholds
      );

      expect(session.confidenceThresholds).toEqual(customThresholds);
    });
  });

  describe('getReviewSession', () => {
    it('should return null for non-existent session', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const session = await matchReviewService.getReviewSession('nonexistent');

      expect(session).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('match_review:nonexistent');
    });

    it('should return parsed session data', async () => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: [[0, createMockMatchResult('venue1', 0.85)]],
          lecturers: [],
          courses: [],
          studentGroups: []
        },
        reviewedMatches: [],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const session = await matchReviewService.getReviewSession(mockSessionId);

      expect(session).toBeTruthy();
      expect(session!.sessionId).toBe(mockSessionId);
      expect(session!.entityMatches.venues.size).toBe(1);
    });
  });

  describe('reviewMatch', () => {
    beforeEach(() => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: [[0, createMockMatchResult('venue1', 0.85)]],
          lecturers: [[0, createMockMatchResult('lecturer1', 0.75)]],
          courses: [],
          studentGroups: []
        },
        reviewedMatches: [],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));
      mockRedisClient.setEx.mockResolvedValue('OK');
    });

    it('should approve a match successfully', async () => {
      const reviewRequest: MatchReviewRequest = {
        sessionId: mockSessionId,
        entityType: 'venue',
        rowIndex: 0,
        action: 'approve',
        selectedMatchId: 'venue1'
      };

      const result = await matchReviewService.reviewMatch(reviewRequest, mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Match review applied successfully');
      expect(result.updatedMatch).toBeTruthy();
      expect(result.updatedMatch!.entityId).toBe('venue1');
    });

    it('should reject a match successfully', async () => {
      const reviewRequest: MatchReviewRequest = {
        sessionId: mockSessionId,
        entityType: 'lecturer',
        rowIndex: 0,
        action: 'reject'
      };

      const result = await matchReviewService.reviewMatch(reviewRequest, mockUserId);

      expect(result.success).toBe(true);
      expect(result.updatedMatch!.entityId).toBeUndefined();
      expect(result.updatedMatch!.confidence).toBe(0);
      expect(result.updatedMatch!.matchType).toBe('none');
    });

    it('should handle create_new action', async () => {
      const reviewRequest: MatchReviewRequest = {
        sessionId: mockSessionId,
        entityType: 'venue',
        rowIndex: 0,
        action: 'create_new',
        customData: { name: 'New Venue', capacity: 100 }
      };

      const result = await matchReviewService.reviewMatch(reviewRequest, mockUserId);

      expect(result.success).toBe(true);
      expect(result.updatedMatch!.entityId).toBeUndefined();
      expect(result.updatedMatch!.matchType).toBe('none');
    });

    it('should return error for non-existent session', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const reviewRequest: MatchReviewRequest = {
        sessionId: 'nonexistent',
        entityType: 'venue',
        rowIndex: 0,
        action: 'approve'
      };

      const result = await matchReviewService.reviewMatch(reviewRequest, mockUserId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Review session not found or expired');
    });

    it('should return error for invalid row index', async () => {
      const reviewRequest: MatchReviewRequest = {
        sessionId: mockSessionId,
        entityType: 'venue',
        rowIndex: 999,
        action: 'approve'
      };

      const result = await matchReviewService.reviewMatch(reviewRequest, mockUserId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Row index 999 not found');
    });
  });

  describe('batchReviewMatches', () => {
    beforeEach(() => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: [
            [0, createMockMatchResult('venue1', 0.85)],
            [1, createMockMatchResult('venue2', 0.75)]
          ],
          lecturers: [[0, createMockMatchResult('lecturer1', 0.65)]],
          courses: [],
          studentGroups: []
        },
        reviewedMatches: [],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));
      mockRedisClient.setEx.mockResolvedValue('OK');
    });

    it('should process batch reviews successfully', async () => {
      const batchRequest: BatchMatchReviewRequest = {
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
            rowIndex: 1,
            action: 'reject'
          },
          {
            sessionId: mockSessionId,
            entityType: 'lecturer',
            rowIndex: 0,
            action: 'create_new'
          }
        ]
      };

      const result = await matchReviewService.batchReviewMatches(batchRequest, mockUserId);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures in batch review', async () => {
      const batchRequest: BatchMatchReviewRequest = {
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
            rowIndex: 999, // Invalid row index
            action: 'reject'
          }
        ]
      };

      const result = await matchReviewService.batchReviewMatches(batchRequest, mockUserId);

      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Row 999');
    });
  });

  describe('getMatchesRequiringReview', () => {
    it('should return matches within review threshold range', async () => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: [
            [0, createMockMatchResult('venue1', 0.85)], // Requires review
            [1, createMockMatchResult('venue2', 0.96)], // Auto approve
            [2, createMockMatchResult('venue3', 0.25)]  // Auto reject
          ],
          lecturers: [
            [0, createMockMatchResult('lecturer1', 0.75)] // Requires review
          ],
          courses: [],
          studentGroups: []
        },
        reviewedMatches: [],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const matches = await matchReviewService.getMatchesRequiringReview(mockSessionId);

      expect(matches.venues).toHaveLength(1);
      expect(matches.venues[0].rowIndex).toBe(0);
      expect(matches.lecturers).toHaveLength(1);
      expect(matches.lecturers[0].rowIndex).toBe(0);
      expect(matches.courses).toHaveLength(0);
      expect(matches.studentGroups).toHaveLength(0);
    });

    it('should exclude already reviewed matches', async () => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: [
            [0, createMockMatchResult('venue1', 0.85)], // Requires review but already reviewed
            [1, createMockMatchResult('venue2', 0.75)]  // Requires review
          ],
          lecturers: [],
          courses: [],
          studentGroups: []
        },
        reviewedMatches: [
          ['venues:0', {
            entityType: 'venue',
            rowIndex: 0,
            action: 'approve',
            selectedMatchId: 'venue1',
            reviewedAt: new Date().toISOString(),
            reviewedBy: mockUserId
          }]
        ],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const matches = await matchReviewService.getMatchesRequiringReview(mockSessionId);

      expect(matches.venues).toHaveLength(1);
      expect(matches.venues[0].rowIndex).toBe(1);
    });
  });

  describe('applyAutomaticApprovals', () => {
    it('should automatically approve and reject matches based on thresholds', async () => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: [
            [0, createMockMatchResult('venue1', 0.96)], // Auto approve
            [1, createMockMatchResult('venue2', 0.85)], // Requires review
            [2, createMockMatchResult('venue3', 0.25)]  // Auto reject
          ],
          lecturers: [
            [0, createMockMatchResult('lecturer1', 0.97)] // Auto approve
          ],
          courses: [],
          studentGroups: []
        },
        reviewedMatches: [],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await matchReviewService.applyAutomaticApprovals(mockSessionId, mockUserId);

      expect(result.approvedCount).toBe(2); // venue1 and lecturer1
      expect(result.rejectedCount).toBe(1); // venue3
    });
  });

  describe('updateConfidenceThresholds', () => {
    it('should update thresholds successfully', async () => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: { venues: [], lecturers: [], courses: [], studentGroups: [] },
        reviewedMatches: [],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));
      mockRedisClient.setEx.mockResolvedValue('OK');

      const newThresholds = {
        autoApproveThreshold: 0.9,
        requireReviewThreshold: 0.6
      };

      const success = await matchReviewService.updateConfidenceThresholds(mockSessionId, newThresholds);

      expect(success).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should return false for non-existent session', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const success = await matchReviewService.updateConfidenceThresholds('nonexistent', {
        autoApproveThreshold: 0.9
      });

      expect(success).toBe(false);
    });
  });

  describe('getReviewStatistics', () => {
    it('should return comprehensive statistics', async () => {
      const mockSessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        entityMatches: {
          venues: [
            [0, createMockMatchResult('venue1', 0.85)],
            [1, createMockMatchResult('venue2', 0.75)]
          ],
          lecturers: [
            [0, createMockMatchResult('lecturer1', 0.65)]
          ],
          courses: [],
          studentGroups: []
        },
        reviewedMatches: [
          ['venues:0', {
            entityType: 'venue',
            rowIndex: 0,
            action: 'approve',
            selectedMatchId: 'venue1',
            reviewedAt: new Date().toISOString(),
            reviewedBy: mockUserId
          }],
          ['venues:1', {
            entityType: 'venue',
            rowIndex: 1,
            action: 'reject',
            reviewedAt: new Date().toISOString(),
            reviewedBy: `system:${mockUserId}`
          }]
        ],
        confidenceThresholds: {
          autoApproveThreshold: 0.95,
          requireReviewThreshold: 0.7,
          autoRejectThreshold: 0.3
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const stats = await matchReviewService.getReviewStatistics(mockSessionId);

      expect(stats.totalMatches).toBe(3);
      expect(stats.reviewedMatches).toBe(2);
      expect(stats.pendingReviews).toBe(1);
      expect(stats.manuallyReviewed).toBe(1);
      expect(stats.autoRejected).toBe(1);
      expect(stats.byEntityType.venues.total).toBe(2);
      expect(stats.byEntityType.venues.reviewed).toBe(2);
      expect(stats.byEntityType.lecturers.total).toBe(1);
      expect(stats.byEntityType.lecturers.pending).toBe(1);
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