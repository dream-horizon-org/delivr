/**
 * Global Scheduler Service Tests (TDD - Phase 3/4 Refactor)
 * 
 * Tests for the service layer that encapsulates release processing logic.
 * This service is used by BOTH setInterval mode and Cronicle webhook.
 * 
 * TDD Approach: Write failing tests FIRST, then implement the service.
 */

import { CronStatus, PauseType, StageStatus } from '~models/release/release.interface';
import type { CronJob } from '~models/release/release.interface';
import { GlobalSchedulerService } from '~services/release/cron-job/global-scheduler.service';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock state machine
const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockStateMachine = {
  execute: mockExecute,
  initialize: jest.fn().mockResolvedValue(undefined)
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

// Helper to create mock state machine factory
function createMockStateMachineFactory() {
  return jest.fn().mockResolvedValue(mockStateMachine);
}

describe('GlobalSchedulerService', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // Service Creation
  // ============================================================
  describe('constructor', () => {
    
    it('should create service with repository and factory', () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GlobalSchedulerService);
    });
  });

  // ============================================================
  // processAllActiveReleases() - Core Business Logic
  // ============================================================
  describe('processAllActiveReleases()', () => {
    
    it('should return success with zero processed when no active releases', async () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should process all active releases and return count', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1' }),
        createMockCronJob({ releaseId: 'release-2' }),
        createMockCronJob({ releaseId: 'release-3' })
      ]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(mockRepo.findActiveReleases).toHaveBeenCalled();
      expect(mockFactory).toHaveBeenCalledTimes(3);
      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it('should include durationMs in result', async () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(result.durationMs).toBeDefined();
      expect(typeof result.durationMs).toBe('number');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should continue processing other releases when one fails', async () => {
      const errorExecute = jest.fn()
        .mockRejectedValueOnce(new Error('Release 1 failed'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      
      const errorStateMachine = { 
        execute: errorExecute,
        initialize: jest.fn().mockResolvedValue(undefined)
      };
      
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1' }),
        createMockCronJob({ releaseId: 'release-2' }),
        createMockCronJob({ releaseId: 'release-3' })
      ]);
      const mockFactory = jest.fn().mockResolvedValue(errorStateMachine);
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      // All 3 releases should be attempted
      expect(errorExecute).toHaveBeenCalledTimes(3);
      // 2 succeeded, 1 failed
      expect(result.success).toBe(true); // Overall success (doesn't fail on individual errors)
      expect(result.processedCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('release-1');
      expect(result.errors[0]).toContain('Release 1 failed');
    });

    it('should include error messages in result', async () => {
      const errorExecute = jest.fn().mockRejectedValue(new Error('Test error message'));
      const errorStateMachine = { 
        execute: errorExecute,
        initialize: jest.fn().mockResolvedValue(undefined)
      };
      
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1' })
      ]);
      const mockFactory = jest.fn().mockResolvedValue(errorStateMachine);
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(result.success).toBe(true); // Overall success (doesn't throw)
      expect(result.processedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Test error message');
      expect(result.errors[0]).toContain('release-1');
    });

    it('should return failure when repository query fails', async () => {
      const mockRepo = {
        findActiveReleases: jest.fn().mockRejectedValue(new Error('DB connection failed'))
      };
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(result.success).toBe(false);
      expect(result.processedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('DB connection failed');
    });
  });

  // ============================================================
  // Pause Type Handling (double-check in service)
  // ============================================================
  describe('processAllActiveReleases() - Pause Types', () => {
    
    it('should skip releases with pauseType=USER_REQUESTED', async () => {
      // The repository should filter these out, but service double-checks
      const mockRepo = createMockRepo([
        createMockCronJob({ 
          releaseId: 'release-1', 
          cronStatus: CronStatus.RUNNING,
          pauseType: PauseType.USER_REQUESTED 
        })
      ]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      // Should NOT execute state machine for paused release
      expect(mockExecute).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
    });

    it('should skip releases with pauseType=AWAITING_STAGE_TRIGGER', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ 
          releaseId: 'release-1', 
          cronStatus: CronStatus.RUNNING,
          pauseType: PauseType.AWAITING_STAGE_TRIGGER 
        })
      ]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(mockExecute).not.toHaveBeenCalled();
      expect(result.processedCount).toBe(0);
    });

    it('should skip releases with pauseType=TASK_FAILURE', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ 
          releaseId: 'release-1', 
          cronStatus: CronStatus.RUNNING,
          pauseType: PauseType.TASK_FAILURE 
        })
      ]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(mockExecute).not.toHaveBeenCalled();
      expect(result.processedCount).toBe(0);
    });

    it('should skip releases with cronStatus != RUNNING', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ 
          releaseId: 'release-1', 
          cronStatus: CronStatus.COMPLETED,
          pauseType: PauseType.NONE 
        })
      ]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      expect(mockExecute).not.toHaveBeenCalled();
      expect(result.processedCount).toBe(0);
    });

    it('should process only releases with RUNNING status and NONE pauseType', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1', cronStatus: CronStatus.RUNNING, pauseType: PauseType.NONE }),
        createMockCronJob({ releaseId: 'release-2', cronStatus: CronStatus.RUNNING, pauseType: PauseType.USER_REQUESTED }),
        createMockCronJob({ releaseId: 'release-3', cronStatus: CronStatus.COMPLETED, pauseType: PauseType.NONE }),
        createMockCronJob({ releaseId: 'release-4', cronStatus: CronStatus.RUNNING, pauseType: PauseType.NONE })
      ]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      // Only release-1 and release-4 should be processed
      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.processedCount).toBe(2);
    });
  });

  // ============================================================
  // Response Format Validation
  // ============================================================
  describe('Response Format', () => {
    
    it('should return consistent response structure', async () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const result = await service.processAllActiveReleases();
      
      // Verify all required fields are present
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('processedCount');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('durationMs');
      
      // Verify types
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.processedCount).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.durationMs).toBe('number');
    });
  });
});

