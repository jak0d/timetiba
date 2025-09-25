import { MatchResult, SuggestedMatch, EntityMatchResults } from '../../types/import';
import { redisManager } from '../../utils/redisConfig';

export interface MatchReviewRequest {
  sessionId: string;
  entityType: 'venue' | 'lecturer' | 'course' | 'studentGroup';
  rowIndex: number;
  selectedMatchId?: string;
  action: 'approve' | 'reject' | 'create_new';
  customData?: Record<string, any>;
}

export interface BatchMatchReviewRequest {
  sessionId: string;
  reviews: MatchReviewRequest[];
}

export interface MatchReviewResponse {
  success: boolean;
  message: string;
  updatedMatch?: MatchResult;
}

export interface BatchMatchReviewResponse {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
}

export interface MatchConfidenceThreshold {
  autoApproveThreshold: number;
  requireReviewThreshold: number;
  autoRejectThreshold: number;
}

export interface MatchReviewSession {
  sessionId: string;
  userId: string;
  entityMatches: EntityMatchResults;
  reviewedMatches: Map<string, MatchReviewDecision>;
  confidenceThresholds: MatchConfidenceThreshold;
  createdAt: Date;
  expiresAt: Date;
}

export interface MatchReviewDecision {
  entityType: 'venue' | 'lecturer' | 'course' | 'studentGroup';
  rowIndex: number;
  action: 'approve' | 'reject' | 'create_new';
  selectedMatchId?: string;
  customData?: Record<string, any>;
  reviewedAt: Date;
  reviewedBy: string;
}

export class MatchReviewService {
  private readonly REVIEW_SESSION_TTL = 3600; // 1 hour
  private readonly DEFAULT_THRESHOLDS: MatchConfidenceThreshold = {
    autoApproveThreshold: 0.95,
    requireReviewThreshold: 0.7,
    autoRejectThreshold: 0.3
  };

  /**
   * Create a new match review session
   */
  async createReviewSession(
    sessionId: string,
    userId: string,
    entityMatches: EntityMatchResults,
    customThresholds?: Partial<MatchConfidenceThreshold>
  ): Promise<MatchReviewSession> {
    const confidenceThresholds = {
      ...this.DEFAULT_THRESHOLDS,
      ...customThresholds
    };

    const reviewSession: MatchReviewSession = {
      sessionId,
      userId,
      entityMatches,
      reviewedMatches: new Map(),
      confidenceThresholds,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.REVIEW_SESSION_TTL * 1000)
    };

    // Store in Redis for temporary storage
    await this.storeReviewSession(reviewSession);

    return reviewSession;
  }

  /**
   * Get match review session
   */
  async getReviewSession(sessionId: string): Promise<MatchReviewSession | null> {
    const client = redisManager.getClient();
    const sessionData = await client.get(`match_review:${sessionId}`);
    if (!sessionData) {
      return null;
    }

    const parsed = JSON.parse(sessionData);
    
    // Convert Maps back from JSON
    const entityMatches: EntityMatchResults = {
      venues: new Map(parsed.entityMatches.venues),
      lecturers: new Map(parsed.entityMatches.lecturers),
      courses: new Map(parsed.entityMatches.courses),
      studentGroups: new Map(parsed.entityMatches.studentGroups)
    };

    const reviewedMatches = new Map(parsed.reviewedMatches);

    return {
      ...parsed,
      entityMatches,
      reviewedMatches,
      createdAt: new Date(parsed.createdAt),
      expiresAt: new Date(parsed.expiresAt)
    };
  }

  /**
   * Review a single match
   */
  async reviewMatch(request: MatchReviewRequest, userId: string): Promise<MatchReviewResponse> {
    const session = await this.getReviewSession(request.sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Review session not found or expired'
      };
    }

    // Validate the request
    const validationError = this.validateReviewRequest(request, session);
    if (validationError) {
      return {
        success: false,
        message: validationError
      };
    }

    // Create review decision
    const decision: MatchReviewDecision = {
      entityType: request.entityType,
      rowIndex: request.rowIndex,
      action: request.action,
      selectedMatchId: request.selectedMatchId,
      customData: request.customData,
      reviewedAt: new Date(),
      reviewedBy: userId
    };

    // Store the decision
    const decisionKey = `${request.entityType}:${request.rowIndex}`;
    session.reviewedMatches.set(decisionKey, decision);

    // Update the match result based on the decision
    const updatedMatch = this.applyReviewDecision(session, request);

    // Save updated session
    await this.storeReviewSession(session);

    return {
      success: true,
      message: 'Match review applied successfully',
      updatedMatch
    };
  }

  /**
   * Review multiple matches in batch
   */
  async batchReviewMatches(request: BatchMatchReviewRequest, userId: string): Promise<BatchMatchReviewResponse> {
    const session = await this.getReviewSession(request.sessionId);
    if (!session) {
      return {
        success: false,
        processedCount: 0,
        failedCount: request.reviews.length,
        errors: ['Review session not found or expired']
      };
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const reviewRequest of request.reviews) {
      try {
        const validationError = this.validateReviewRequest(reviewRequest, session);
        if (validationError) {
          errors.push(`Row ${reviewRequest.rowIndex}: ${validationError}`);
          failedCount++;
          continue;
        }

        // Create review decision
        const decision: MatchReviewDecision = {
          entityType: reviewRequest.entityType,
          rowIndex: reviewRequest.rowIndex,
          action: reviewRequest.action,
          selectedMatchId: reviewRequest.selectedMatchId,
          customData: reviewRequest.customData,
          reviewedAt: new Date(),
          reviewedBy: userId
        };

        // Store the decision
        const decisionKey = `${reviewRequest.entityType}:${reviewRequest.rowIndex}`;
        session.reviewedMatches.set(decisionKey, decision);

        // Update the match result
        this.applyReviewDecision(session, reviewRequest);

        processedCount++;
      } catch (error) {
        errors.push(`Row ${reviewRequest.rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedCount++;
      }
    }

    // Save updated session
    await this.storeReviewSession(session);

    return {
      success: failedCount === 0,
      processedCount,
      failedCount,
      errors
    };
  }

  /**
   * Get matches requiring review based on confidence thresholds
   */
  async getMatchesRequiringReview(sessionId: string): Promise<{
    venues: Array<{ rowIndex: number; match: MatchResult }>;
    lecturers: Array<{ rowIndex: number; match: MatchResult }>;
    courses: Array<{ rowIndex: number; match: MatchResult }>;
    studentGroups: Array<{ rowIndex: number; match: MatchResult }>;
  }> {
    const session = await this.getReviewSession(sessionId);
    if (!session) {
      throw new Error('Review session not found or expired');
    }

    const result = {
      venues: [] as Array<{ rowIndex: number; match: MatchResult }>,
      lecturers: [] as Array<{ rowIndex: number; match: MatchResult }>,
      courses: [] as Array<{ rowIndex: number; match: MatchResult }>,
      studentGroups: [] as Array<{ rowIndex: number; match: MatchResult }>
    };

    // Check each entity type
    for (const [entityType, matches] of Object.entries(session.entityMatches)) {
      const entityMatches = result[entityType as keyof typeof result];
      
      for (const [rowIndex, match] of matches) {
        if (this.requiresReview(match, session.confidenceThresholds)) {
          const decisionKey = `${entityType}:${rowIndex}`;
          
          // Only include if not already reviewed
          if (!session.reviewedMatches.has(decisionKey)) {
            entityMatches.push({ rowIndex, match });
          }
        }
      }
    }

    return result;
  }

  /**
   * Apply automatic approvals based on confidence thresholds
   */
  async applyAutomaticApprovals(sessionId: string, userId: string): Promise<{
    approvedCount: number;
    rejectedCount: number;
  }> {
    const session = await this.getReviewSession(sessionId);
    if (!session) {
      throw new Error('Review session not found or expired');
    }

    let approvedCount = 0;
    let rejectedCount = 0;

    // Process each entity type
    for (const [entityType, matches] of Object.entries(session.entityMatches)) {
      for (const [rowIndex, match] of matches) {
        const decisionKey = `${entityType}:${rowIndex}`;
        
        // Skip if already reviewed
        if (session.reviewedMatches.has(decisionKey)) {
          continue;
        }

        let action: 'approve' | 'reject' | null = null;
        let selectedMatchId: string | undefined;

        if (match.confidence >= session.confidenceThresholds.autoApproveThreshold && match.entityId) {
          action = 'approve';
          selectedMatchId = match.entityId;
          approvedCount++;
        } else if (match.confidence <= session.confidenceThresholds.autoRejectThreshold) {
          action = 'reject';
          rejectedCount++;
        }

        if (action) {
          const decision: MatchReviewDecision = {
            entityType: entityType as any,
            rowIndex,
            action,
            selectedMatchId,
            reviewedAt: new Date(),
            reviewedBy: `system:${userId}`
          };

          session.reviewedMatches.set(decisionKey, decision);
        }
      }
    }

    // Save updated session
    await this.storeReviewSession(session);

    return { approvedCount, rejectedCount };
  }

  /**
   * Update confidence thresholds for a session
   */
  async updateConfidenceThresholds(
    sessionId: string,
    thresholds: Partial<MatchConfidenceThreshold>
  ): Promise<boolean> {
    const session = await this.getReviewSession(sessionId);
    if (!session) {
      return false;
    }

    session.confidenceThresholds = {
      ...session.confidenceThresholds,
      ...thresholds
    };

    await this.storeReviewSession(session);
    return true;
  }

  /**
   * Get review statistics for a session
   */
  async getReviewStatistics(sessionId: string): Promise<{
    totalMatches: number;
    reviewedMatches: number;
    pendingReviews: number;
    autoApproved: number;
    autoRejected: number;
    manuallyReviewed: number;
    byEntityType: {
      venues: { total: number; reviewed: number; pending: number };
      lecturers: { total: number; reviewed: number; pending: number };
      courses: { total: number; reviewed: number; pending: number };
      studentGroups: { total: number; reviewed: number; pending: number };
    };
  }> {
    const session = await this.getReviewSession(sessionId);
    if (!session) {
      throw new Error('Review session not found or expired');
    }

    let totalMatches = 0;
    let reviewedMatches = 0;
    let autoApproved = 0;
    let autoRejected = 0;
    let manuallyReviewed = 0;

    const byEntityType = {
      venues: { total: 0, reviewed: 0, pending: 0 },
      lecturers: { total: 0, reviewed: 0, pending: 0 },
      courses: { total: 0, reviewed: 0, pending: 0 },
      studentGroups: { total: 0, reviewed: 0, pending: 0 }
    };

    // Count matches by entity type
    for (const [entityType, matches] of Object.entries(session.entityMatches)) {
      const entityStats = byEntityType[entityType as keyof typeof byEntityType];
      entityStats.total = matches.size;
      totalMatches += matches.size;

      for (const [rowIndex] of matches) {
        const decisionKey = `${entityType}:${rowIndex}`;
        const decision = session.reviewedMatches.get(decisionKey);

        if (decision) {
          entityStats.reviewed++;
          reviewedMatches++;

          if (decision.reviewedBy.startsWith('system:')) {
            if (decision.action === 'approve') {
              autoApproved++;
            } else if (decision.action === 'reject') {
              autoRejected++;
            }
          } else {
            manuallyReviewed++;
          }
        } else {
          entityStats.pending++;
        }
      }
    }

    return {
      totalMatches,
      reviewedMatches,
      pendingReviews: totalMatches - reviewedMatches,
      autoApproved,
      autoRejected,
      manuallyReviewed,
      byEntityType
    };
  }

  private async storeReviewSession(session: MatchReviewSession): Promise<void> {
    // Convert Maps to arrays for JSON serialization
    const serializable = {
      ...session,
      entityMatches: {
        venues: Array.from(session.entityMatches.venues.entries()),
        lecturers: Array.from(session.entityMatches.lecturers.entries()),
        courses: Array.from(session.entityMatches.courses.entries()),
        studentGroups: Array.from(session.entityMatches.studentGroups.entries())
      },
      reviewedMatches: Array.from(session.reviewedMatches.entries())
    };

    const client = redisManager.getClient();
    await client.setEx(
      `match_review:${session.sessionId}`,
      this.REVIEW_SESSION_TTL,
      JSON.stringify(serializable)
    );
  }

  private validateReviewRequest(request: MatchReviewRequest, session: MatchReviewSession): string | null {
    // Check if entity type exists in session
    const entityMatches = session.entityMatches[request.entityType];
    if (!entityMatches) {
      return `Invalid entity type: ${request.entityType}`;
    }

    // Check if row index exists
    if (!entityMatches.has(request.rowIndex)) {
      return `Row index ${request.rowIndex} not found for entity type ${request.entityType}`;
    }

    // Validate action-specific requirements
    if (request.action === 'approve' && !request.selectedMatchId) {
      const match = entityMatches.get(request.rowIndex);
      if (!match?.entityId && (!match?.suggestedMatches || match.suggestedMatches.length === 0)) {
        return 'Cannot approve match without selecting a match ID';
      }
    }

    return null;
  }

  private applyReviewDecision(session: MatchReviewSession, request: MatchReviewRequest): MatchResult | undefined {
    const entityMatches = session.entityMatches[request.entityType];
    const match = entityMatches.get(request.rowIndex);
    
    if (!match) {
      return undefined;
    }

    // Update match based on decision
    switch (request.action) {
      case 'approve':
        match.entityId = request.selectedMatchId || match.entityId;
        break;
      case 'reject':
        match.entityId = undefined;
        match.confidence = 0;
        match.matchType = 'none';
        break;
      case 'create_new':
        match.entityId = undefined;
        match.confidence = 0;
        match.matchType = 'none';
        break;
    }

    entityMatches.set(request.rowIndex, match);
    return match;
  }

  private requiresReview(match: MatchResult, thresholds: MatchConfidenceThreshold): boolean {
    return match.confidence > thresholds.autoRejectThreshold && 
           match.confidence < thresholds.autoApproveThreshold;
  }
}

// Export singleton instance
export const matchReviewService = new MatchReviewService();