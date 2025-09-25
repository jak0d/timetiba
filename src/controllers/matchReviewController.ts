import { Request, Response } from 'express';
import { matchReviewService, MatchReviewRequest, BatchMatchReviewRequest, MatchConfidenceThreshold } from '../services/import/matchReviewService';
import { EntityMatchResults } from '../types/import';

export class MatchReviewController {
  /**
   * Create a new match review session
   */
  async createReviewSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, entityMatches, confidenceThresholds } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!sessionId || !entityMatches) {
        res.status(400).json({ error: 'Session ID and entity matches are required' });
        return;
      }

      // Convert entity matches from request format
      const convertedMatches: EntityMatchResults = {
        venues: new Map(entityMatches.venues || []),
        lecturers: new Map(entityMatches.lecturers || []),
        courses: new Map(entityMatches.courses || []),
        studentGroups: new Map(entityMatches.studentGroups || [])
      };

      const reviewSession = await matchReviewService.createReviewSession(
        sessionId,
        userId,
        convertedMatches,
        confidenceThresholds
      );

      res.status(201).json({
        sessionId: reviewSession.sessionId,
        confidenceThresholds: reviewSession.confidenceThresholds,
        createdAt: reviewSession.createdAt,
        expiresAt: reviewSession.expiresAt
      });
    } catch (error) {
      console.error('Error creating review session:', error);
      res.status(500).json({ error: 'Failed to create review session' });
    }
  }

  /**
   * Get match review session details
   */
  async getReviewSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const session = await matchReviewService.getReviewSession(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Review session not found or expired' });
        return;
      }

      // Convert Maps to arrays for JSON response
      const response = {
        sessionId: session.sessionId,
        userId: session.userId,
        entityMatches: {
          venues: Array.from(session.entityMatches.venues.entries()),
          lecturers: Array.from(session.entityMatches.lecturers.entries()),
          courses: Array.from(session.entityMatches.courses.entries()),
          studentGroups: Array.from(session.entityMatches.studentGroups.entries())
        },
        reviewedMatches: Array.from(session.reviewedMatches.entries()),
        confidenceThresholds: session.confidenceThresholds,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting review session:', error);
      res.status(500).json({ error: 'Failed to get review session' });
    }
  }

  /**
   * Review a single match
   */
  async reviewMatch(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const reviewRequest: MatchReviewRequest = req.body;

      // Validate required fields
      if (!reviewRequest.sessionId || !reviewRequest.entityType || 
          reviewRequest.rowIndex === undefined || !reviewRequest.action) {
        res.status(400).json({ 
          error: 'Session ID, entity type, row index, and action are required' 
        });
        return;
      }

      const result = await matchReviewService.reviewMatch(reviewRequest, userId);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Error reviewing match:', error);
      res.status(500).json({ error: 'Failed to review match' });
    }
  }

  /**
   * Review multiple matches in batch
   */
  async batchReviewMatches(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const batchRequest: BatchMatchReviewRequest = req.body;

      if (!batchRequest.sessionId || !batchRequest.reviews || !Array.isArray(batchRequest.reviews)) {
        res.status(400).json({ 
          error: 'Session ID and reviews array are required' 
        });
        return;
      }

      const result = await matchReviewService.batchReviewMatches(batchRequest, userId);

      res.json(result);
    } catch (error) {
      console.error('Error batch reviewing matches:', error);
      res.status(500).json({ error: 'Failed to batch review matches' });
    }
  }

  /**
   * Get matches requiring review
   */
  async getMatchesRequiringReview(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const matches = await matchReviewService.getMatchesRequiringReview(sessionId);
      res.json(matches);
    } catch (error) {
      console.error('Error getting matches requiring review:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get matches requiring review' });
      }
    }
  }

  /**
   * Apply automatic approvals based on confidence thresholds
   */
  async applyAutomaticApprovals(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await matchReviewService.applyAutomaticApprovals(sessionId, userId);
      res.json(result);
    } catch (error) {
      console.error('Error applying automatic approvals:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to apply automatic approvals' });
      }
    }
  }

  /**
   * Update confidence thresholds for a session
   */
  async updateConfidenceThresholds(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const thresholds: Partial<MatchConfidenceThreshold> = req.body;

      // Validate threshold values
      if (thresholds.autoApproveThreshold !== undefined && 
          (thresholds.autoApproveThreshold < 0 || thresholds.autoApproveThreshold > 1)) {
        res.status(400).json({ error: 'Auto approve threshold must be between 0 and 1' });
        return;
      }

      if (thresholds.requireReviewThreshold !== undefined && 
          (thresholds.requireReviewThreshold < 0 || thresholds.requireReviewThreshold > 1)) {
        res.status(400).json({ error: 'Require review threshold must be between 0 and 1' });
        return;
      }

      if (thresholds.autoRejectThreshold !== undefined && 
          (thresholds.autoRejectThreshold < 0 || thresholds.autoRejectThreshold > 1)) {
        res.status(400).json({ error: 'Auto reject threshold must be between 0 and 1' });
        return;
      }

      const success = await matchReviewService.updateConfidenceThresholds(sessionId, thresholds);

      if (!success) {
        res.status(404).json({ error: 'Review session not found or expired' });
        return;
      }

      res.json({ success: true, message: 'Confidence thresholds updated successfully' });
    } catch (error) {
      console.error('Error updating confidence thresholds:', error);
      res.status(500).json({ error: 'Failed to update confidence thresholds' });
    }
  }

  /**
   * Get review statistics for a session
   */
  async getReviewStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const statistics = await matchReviewService.getReviewStatistics(sessionId);
      res.json(statistics);
    } catch (error) {
      console.error('Error getting review statistics:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get review statistics' });
      }
    }
  }
}

// Export singleton instance
export const matchReviewController = new MatchReviewController();