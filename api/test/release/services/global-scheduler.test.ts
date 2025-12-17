/**
 * Global Scheduler Service Tests
 * 
 * Tests the GlobalSchedulerService that processes ALL active releases
 * in a single loop (replacing per-release setInterval approach).
 */

import { CronStatus, PauseType, StageStatus } from '~models/release/release.interface';
import type { CronJob } from '~models/release/release.interface';
import {
  GlobalSchedulerService,
  getSchedulerType,
  getSchedulerIntervalMs
} from '~services/release/cron-job/global-scheduler.service';

// Mock CronJobStateMachine
const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockStateMachine = {
  execute: mockExecute
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

describe('Global Scheduler Service', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.SCHEDULER_TYPE;
    delete process.env.SCHEDULER_INTERVAL_MS;
  });

  // ============================================================
  // Config Helpers
  // ============================================================
  describe('Config Helpers', () => {
    
    it('should return "cronicle" as default scheduler type', () => {
      expect(getSchedulerType()).toBe('cronicle');
    });

    it('should return "setinterval" when SCHEDULER_TYPE=setinterval', () => {
      process.env.SCHEDULER_TYPE = 'setinterval';
      expect(getSchedulerType()).toBe('setinterval');
    });

    it('should return default interval when not set', () => {
      expect(getSchedulerIntervalMs()).toBe(60000);
    });

    it('should return custom interval when set', () => {
      process.env.SCHEDULER_INTERVAL_MS = '30000';
      expect(getSchedulerIntervalMs()).toBe(30000);
    });

    it('should enforce minimum interval', () => {
      process.env.SCHEDULER_INTERVAL_MS = '1000'; // Too low
      expect(getSchedulerIntervalMs()).toBe(60000); // Falls back to default
    });
  });

  // ============================================================
  // processAllActiveReleases()
  // ============================================================
  describe('processAllActiveReleases()', () => {
    
    it('should query findActiveReleases and process each release', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1' })
      ]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      const result = await service.processAllActiveReleases();

      expect(mockRepo.findActiveReleases).toHaveBeenCalled();
      expect(mockFactory).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
    });

    it('should process multiple releases', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1' }),
        createMockCronJob({ releaseId: 'release-2' }),
        createMockCronJob({ releaseId: 'release-3' })
      ]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      const result = await service.processAllActiveReleases();

      expect(mockFactory).toHaveBeenCalledTimes(3);
      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(result.processedCount).toBe(3);
    });

    it('should skip releases with pauseType != NONE', async () => {
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1', cronStatus: CronStatus.RUNNING, pauseType: PauseType.NONE }),
        createMockCronJob({ releaseId: 'release-2', cronStatus: CronStatus.RUNNING, pauseType: PauseType.USER_REQUESTED }),
        createMockCronJob({ releaseId: 'release-3', cronStatus: CronStatus.COMPLETED, pauseType: PauseType.NONE })
      ]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      const result = await service.processAllActiveReleases();

      // Only release-1 should be processed (RUNNING + NONE)
      expect(mockFactory).toHaveBeenCalledTimes(1);
      expect(result.processedCount).toBe(1);
    });

    it('should continue processing when one release fails', async () => {
      const failingExecute = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Release 2 failed'))
        .mockResolvedValueOnce(undefined);
      
      const mockRepo = createMockRepo([
        createMockCronJob({ releaseId: 'release-1' }),
        createMockCronJob({ releaseId: 'release-2' }),
        createMockCronJob({ releaseId: 'release-3' })
      ]);
      
      const mockFactory = jest.fn().mockResolvedValue({ execute: failingExecute });
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      const result = await service.processAllActiveReleases();

      expect(failingExecute).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true); // Overall success despite one failure
      expect(result.processedCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('release-2');
    });

    it('should return failure when repository query fails', async () => {
      const mockRepo = {
        findActiveReleases: jest.fn().mockRejectedValue(new Error('DB connection failed'))
      };
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      const result = await service.processAllActiveReleases();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('DB connection failed');
    });

    it('should return empty result when no active releases', async () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      const result = await service.processAllActiveReleases();

      expect(mockRepo.findActiveReleases).toHaveBeenCalled();
      expect(mockFactory).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(0);
    });

    it('should include durationMs in result', async () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      const result = await service.processAllActiveReleases();

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================
  // Scheduler start/stop (setInterval mode)
  // ============================================================
  describe('Scheduler start/stop', () => {
    
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start scheduler and set interval', () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      expect(service.isRunning()).toBe(false);
      
      const started = service.start();
      
      expect(started).toBe(true);
      expect(service.isRunning()).toBe(true);
    });

    it('should return false when already running', () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      service.start();
      const secondStart = service.start();
      
      expect(secondStart).toBe(false);
    });

    it('should stop scheduler', () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      service.start();
      expect(service.isRunning()).toBe(true);
      
      const stopped = service.stop();
      
      expect(stopped).toBe(true);
      expect(service.isRunning()).toBe(false);
    });

    it('should return false when stopping non-running scheduler', () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      const stopped = service.stop();
      
      expect(stopped).toBe(false);
    });

    it('should call processAllActiveReleases on interval', async () => {
      const mockRepo = createMockRepo([]);
      const mockFactory = createMockStateMachineFactory();
      
      const service = new GlobalSchedulerService(mockRepo as any, mockFactory);
      
      service.start();
      
      // Advance time by 60 seconds
      jest.advanceTimersByTime(60000);
      
      // Wait for async processing
      await Promise.resolve();

      expect(mockRepo.findActiveReleases).toHaveBeenCalled();
    });
  });

  // Note: Cronicle registration tests are in cronicle-registration.test.ts
});
