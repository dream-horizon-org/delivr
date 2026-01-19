/**
 * Cron Webhook Controller Tests (Phase 4 - TDD)
 * 
 * Tests for the Cronicle webhook endpoint that processes releases.
 * This replaces the per-release setInterval approach for production.
 * 
 * TDD Approach: Write failing tests FIRST, then verify implementation passes.
 */

import { Request, Response } from 'express';
import { CronStatus, PauseType, StageStatus } from '~models/release/release.interface';
import type { CronJob } from '~models/release/release.interface';
import { createCronWebhookController } from '~controllers/release/cron-webhook.controller';
import { GlobalSchedulerService } from '~services/release/cron-job/global-scheduler.service';
import { HTTP_STATUS } from '~constants/http';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock state machine
const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockStateMachine = {
  execute: mockExecute
};

// Mock response object
const createMockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res as Response;
};

// Mock request object
const createMockRequest = (body: Record<string, unknown> = {}): Request => {
  return {
    body
  } as Request;
};

// Helper to create mock cron job
function createMockCronJob(overrides: Partial<CronJob> = {}): CronJob {
  return {
    id: 'cron-job-1',
    releaseId: 'release-1',
    cronStatus: CronStatus.RUNNING,
    pauseType: PauseType.NONE,
    stage1Status: StageStatus.IN_PROGRESS,
    stage2Status: StageStatus.PENDING,
    stage3Status: StageStatus.PENDING,
    stage4Status: StageStatus.PENDING,
    cronConfig: {},
    upcomingRegressions: null,
    cronCreatedByAccountId: 'account-1',
    cronCreatedAt: new Date(),
    cronStoppedAt: null,
    lockedBy: null,
    lockedAt: null,
    lockTimeout: 300,
    autoTransitionToStage2: true,
    autoTransitionToStage3: true,
    stageData: null,
    ...overrides
  };
}

// Helper to create mock repository
function createMockRepo(releases: CronJob[] = []) {
  return {
    findActiveReleases: jest.fn().mockResolvedValue(releases)
  };
}

describe('Cron Webhook Controller', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock service
  const createMockService = (result: any) => {
    return {
      processAllActiveReleases: jest.fn().mockResolvedValue(result)
    } as any as GlobalSchedulerService;
  };

  // ============================================================
  // PHASE 4.0: Service Validation
  // ============================================================
  describe('handleReleaseTick() - Service Validation', () => {
    
    it('should return 500 when service is null (no Sequelize)', async () => {
      const controller = createCronWebhookController(null);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('not configured')
        })
      );
    });
  });

  // ============================================================
  // PHASE 4.1: handleReleaseTick - Core Functionality
  // ============================================================
  describe('handleReleaseTick()', () => {
    
    it('should return 200 with success response when no active releases', async () => {
      const mockService = createMockService({
        success: true,
        processedCount: 0,
        errors: [],
        durationMs: 10
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(mockService.processAllActiveReleases).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          processedCount: 0,
          errors: []
        })
      );
    });

    it('should process all active releases and return count', async () => {
      const mockService = createMockService({
        success: true,
        processedCount: 3,
        errors: [],
        durationMs: 50
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(mockService.processAllActiveReleases).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          processedCount: 3,
          errors: []
        })
      );
    });

    it('should include durationMs in response', async () => {
      const mockService = createMockService({
        success: true,
        processedCount: 0,
        errors: [],
        durationMs: 25
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMs: expect.any(Number)
        })
      );
    });

    it('should continue processing other releases when one fails', async () => {
      const mockService = createMockService({
        success: true,
        processedCount: 2,
        errors: ['Release release-1: Release 1 failed'],
        durationMs: 100
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          processedCount: 2,
          errors: expect.arrayContaining([
            expect.stringContaining('release-1')
          ])
        })
      );
    });

    it('should include error messages in response', async () => {
      const mockService = createMockService({
        success: true,
        processedCount: 0,
        errors: ['Release release-1: Test error message'],
        durationMs: 15
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          processedCount: 0,
          errors: expect.arrayContaining([
            expect.stringContaining('Test error message')
          ])
        })
      );
    });

    it('should return 500 when repository query fails', async () => {
      const mockService = createMockService({
        success: false,
        processedCount: 0,
        errors: ['DB connection failed'],
        durationMs: 5
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.stringContaining('DB connection failed')
          ])
        })
      );
    });
  });

  // ============================================================
  // PHASE 4.1: Skip paused releases (handled by service)
  // ============================================================
  describe('handleReleaseTick() - Pause Types', () => {
    
    it('should delegate to service which skips paused releases', async () => {
      // Service handles all pause type logic
      const mockService = createMockService({
        success: true,
        processedCount: 0,
        errors: [],
        durationMs: 10
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      expect(mockService.processAllActiveReleases).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          processedCount: 0
        })
      );
    });
  });

  // ============================================================
  // PHASE 4.2: Response Format Validation
  // ============================================================
  describe('Response Format', () => {
    
    it('should return consistent response structure', async () => {
      const mockService = createMockService({
        success: true,
        processedCount: 0,
        errors: [],
        durationMs: 15
      });
      
      const controller = createCronWebhookController(mockService);
      
      const req = createMockRequest();
      const res = createMockResponse();
      
      await controller.handleReleaseTick(req, res);
      
      const response = (res.json as jest.Mock).mock.calls[0][0];
      
      // Verify all required fields are present
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('processedCount');
      expect(response).toHaveProperty('errors');
      expect(response).toHaveProperty('durationMs');
      
      // Verify types
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.processedCount).toBe('number');
      expect(Array.isArray(response.errors)).toBe(true);
      expect(typeof response.durationMs).toBe('number');
    });
  });
});

