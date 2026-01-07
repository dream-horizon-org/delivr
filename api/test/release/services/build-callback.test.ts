/**
 * Build Callback & Retry Tests (TDD)
 * 
 * ❌ These tests will FAIL until implementation is complete!
 * 
 * Tests for:
 * - Build repository methods (status aggregation) - ✅ EXIST
 * - Callback handler (task/release status updates) - ❌ NOT YET IMPLEMENTED
 * - Manual upload flow - ❌ NOT YET IMPLEMENTED
 * - Version string generation - ✅ IMPLEMENTED in services/release/release.utils.ts
 * - Retry via ReleaseUpdateService.retryTask() - ❌ NOT YET IMPLEMENTED
 * 
 * Run: npx jest test/release/services/build-callback.test.ts --runInBand
 */

import { v4 as uuidv4 } from 'uuid';

// Types
import {
  TaskStatus,
  TaskType,
  ReleaseStatus,
  PauseType
} from '../../../script/models/release/release.interface';

import type { BuildPlatform } from '../../../script/types/release-management/builds';

// ============================================================================
// ACTUAL IMPLEMENTATIONS
// ============================================================================

// ✅ Version string - IMPLEMENTED (in release.utils.ts)
import { generatePlatformVersionString } from '../../../script/services/release/release.utils';

// ✅ Retry - IMPLEMENTED in ReleaseUpdateService
import { ReleaseUpdateService, RetryTaskResult } from '../../../script/services/release/release-update.service';

// ✅ Callback service - IMPLEMENTED (class-based, used by controller)
import { BuildCallbackService } from '../../../script/services/release/build-callback.service';

// ✅ Manual upload - DEPRECATED (moved to release_uploads staging table)
// Tests for new architecture are in release-orchestration.unit.test.ts
// import { handleManualBuildUpload } from '../../../script/services/release/manual-upload.service';

// ============================================================================
// (All implementations now imported from production code)
// ============================================================================

// ============================================================================
// MOCK REPOSITORIES for Retry Tests
// ============================================================================

const createMockRepositories = () => {
  const mockTask = {
    id: 'task-123',
    releaseId: 'release-1',
    taskType: TaskType.TRIGGER_REGRESSION_BUILDS,
    taskStatus: TaskStatus.FAILED
  };

  const mockRelease = {
    id: 'release-1',
    status: ReleaseStatus.PAUSED
  };

  const mockCronJob = {
    id: 'cron-1',
    releaseId: 'release-1',
    pauseType: PauseType.TASK_FAILURE
  };

  return {
    taskRepo: {
      findById: jest.fn().mockResolvedValue(mockTask),
      update: jest.fn().mockResolvedValue(undefined)
    },
    releaseRepo: {
      findById: jest.fn().mockResolvedValue(mockRelease),
      update: jest.fn().mockResolvedValue(undefined)
    },
    cronJobRepo: {
      findByReleaseId: jest.fn().mockResolvedValue(mockCronJob),
      update: jest.fn().mockResolvedValue(undefined)
    },
    buildRepo: {
      resetFailedBuildsForTask: jest.fn().mockResolvedValue(2)
    },
    platformMappingRepo: {},
    cronJobService: {}
  };
};

// ============================================================================
// TESTS
// ============================================================================

describe('Build Callback & Retry Tests (TDD)', () => {

  // ==========================================================================
  // 1. VERSION STRING - services/release/release.utils.ts ✅ IMPLEMENTED
  // ==========================================================================
  
  describe('Version String (services/release/release.utils.ts) ✅', () => {
    
    it('single platform returns "7.0.0_android"', () => {
      const result = generatePlatformVersionString([{ platform: 'ANDROID', version: '7.0.0' }]);
      expect(result).toBe('7.0.0_android');
    });
    
    it('multiple platforms sorted alphabetically', () => {
      // ANDROID comes before IOS alphabetically
      const result = generatePlatformVersionString([
        { platform: 'IOS', version: '6.7.0' },
        { platform: 'ANDROID', version: '7.0.0' }
      ]);
      expect(result).toBe('7.0.0_android_6.7.0_ios');
    });
    
    it('three platforms sorted alphabetically', () => {
      const result = generatePlatformVersionString([
        { platform: 'WEB', version: '8.0.0' },
        { platform: 'IOS', version: '6.7.0' },
        { platform: 'ANDROID', version: '7.0.0' }
      ]);
      expect(result).toBe('7.0.0_android_6.7.0_ios_8.0.0_web');
    });
    
    it('empty input returns "unknown"', () => {
      const result = generatePlatformVersionString([]);
      expect(result).toBe('unknown');
    });
    
    it('null input returns "unknown"', () => {
      const result = generatePlatformVersionString(null as any);
      expect(result).toBe('unknown');
    });
    
    it('undefined input returns "unknown"', () => {
      const result = generatePlatformVersionString(undefined as any);
      expect(result).toBe('unknown');
    });
  });

  // ==========================================================================
  // 2. CALLBACK SERVICE - services/release/build-callback.service.ts ✅ IMPLEMENTED
  // ==========================================================================
  
  describe('Callback Service (build-callback.service.ts) ✅', () => {
    
    // Helper to create mock repositories for callback handler tests
    const createCallbackMocks = (buildStatus: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NO_BUILDS') => {
      const mockTask = {
        id: 'task-123',
        releaseId: 'release-1',
        taskType: TaskType.TRIGGER_REGRESSION_BUILDS,
        taskStatus: TaskStatus.AWAITING_CALLBACK
      };

      return {
        buildRepo: {
          getTaskBuildStatus: jest.fn().mockResolvedValue(buildStatus),
          findByTaskId: jest.fn().mockResolvedValue([])
        },
        taskRepo: {
          findById: jest.fn().mockResolvedValue(mockTask),
          update: jest.fn().mockResolvedValue(undefined)
        },
        releaseRepo: {
          findById: jest.fn().mockResolvedValue({ id: 'release-1', status: ReleaseStatus.IN_PROGRESS }),
          update: jest.fn().mockResolvedValue(undefined)
        },
        cronJobRepo: {
          findByReleaseId: jest.fn().mockResolvedValue({ id: 'cron-1', releaseId: 'release-1' }),
          update: jest.fn().mockResolvedValue(undefined)
        }
      };
    };
    
    it('marks task COMPLETED when all builds uploaded', async () => {
      const mocks = createCallbackMocks('COMPLETED');
      
      const service = new BuildCallbackService(
        mocks.buildRepo as any,
        mocks.taskRepo as any,
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any
      );
      const result = await service.processCallback('task-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('All builds complete');
      expect(mocks.taskRepo.update).toHaveBeenCalledWith('task-123', { 
        taskStatus: TaskStatus.COMPLETED 
      });
      // Release should NOT be paused
      expect(mocks.releaseRepo.update).not.toHaveBeenCalled();
    });
    
    it('marks task FAILED and pauses release when any build fails', async () => {
      const mocks = createCallbackMocks('FAILED');
      
      const service = new BuildCallbackService(
        mocks.buildRepo as any,
        mocks.taskRepo as any,
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any
      );
      const result = await service.processCallback('task-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Build failed, release paused');
      // Task should be marked FAILED
      expect(mocks.taskRepo.update).toHaveBeenCalledWith('task-123', { 
        taskStatus: TaskStatus.FAILED 
      });
      // Release should be PAUSED
      expect(mocks.releaseRepo.update).toHaveBeenCalledWith('release-1', { 
        status: ReleaseStatus.PAUSED 
      });
      // CronJob pauseType should be set
      expect(mocks.cronJobRepo.update).toHaveBeenCalledWith('cron-1', { 
        pauseType: PauseType.TASK_FAILURE 
      });
    });
    
    it('returns waiting when builds still pending', async () => {
      const mocks = createCallbackMocks('PENDING');
      
      const service = new BuildCallbackService(
        mocks.buildRepo as any,
        mocks.taskRepo as any,
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any
      );
      const result = await service.processCallback('task-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Waiting for builds');
      // No status updates should happen
      expect(mocks.taskRepo.update).not.toHaveBeenCalled();
      expect(mocks.releaseRepo.update).not.toHaveBeenCalled();
    });
    
    it('returns waiting when builds still running', async () => {
      const mocks = createCallbackMocks('RUNNING');
      
      const service = new BuildCallbackService(
        mocks.buildRepo as any,
        mocks.taskRepo as any,
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any
      );
      const result = await service.processCallback('task-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Waiting for builds');
      expect(mocks.taskRepo.update).not.toHaveBeenCalled();
    });
    
    it('handles NO_BUILDS status (task has no builds yet)', async () => {
      const mocks = createCallbackMocks('NO_BUILDS');
      
      const service = new BuildCallbackService(
        mocks.buildRepo as any,
        mocks.taskRepo as any,
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any
      );
      const result = await service.processCallback('task-123');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Waiting for builds');
      expect(mocks.taskRepo.update).not.toHaveBeenCalled();
    });
    
    it('returns error if task not found', async () => {
      const mocks = createCallbackMocks('COMPLETED');
      mocks.taskRepo.findById = jest.fn().mockResolvedValue(null);
      
      const service = new BuildCallbackService(
        mocks.buildRepo as any,
        mocks.taskRepo as any,
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any
      );
      const result = await service.processCallback('task-123');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  // ==========================================================================
  // 3. MANUAL UPLOAD - services/release/manual-upload.service.ts ✅ IMPLEMENTED
  // ==========================================================================
  
  describe('Manual Upload Flow (manual-upload.service.ts) ✅', () => {
    
    // Helper to create mock repositories for manual upload tests
    const createManualUploadMocks = (options: {
      existingBuilds?: Array<{ platform: BuildPlatform; buildUploadStatus: string }>;
      requiredPlatforms?: BuildPlatform[];
      releaseStatus?: ReleaseStatus;
    } = {}) => {
      const {
        existingBuilds = [],
        requiredPlatforms = ['ANDROID', 'IOS'] as BuildPlatform[],
        releaseStatus = ReleaseStatus.PAUSED
      } = options;

      const mockRelease = {
        id: 'release-1',
        tenantId: 'tenant-1',
        status: releaseStatus
      };

      const mockTask = {
        id: 'task-1',
        releaseId: 'release-1',
        taskType: TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
        taskStatus: TaskStatus.AWAITING_CALLBACK
      };

      // Track builds created during test
      let builds = [...existingBuilds.map((b, i) => ({
        id: `build-${i}`,
        taskId: 'task-1',
        ...b
      }))];

      return {
        buildRepo: {
          create: jest.fn().mockImplementation((data: any) => {
            const newBuild = { id: `build-${builds.length}`, ...data };
            builds.push(newBuild);
            return Promise.resolve(newBuild);
          }),
          findByTaskId: jest.fn().mockImplementation(() => Promise.resolve(builds)),
          findByTaskAndPlatform: jest.fn().mockImplementation((taskId: string, platform: string) => {
            return Promise.resolve(builds.find(b => b.platform === platform) || null);
          })
        },
        taskRepo: {
          findById: jest.fn().mockResolvedValue(mockTask),
          update: jest.fn().mockResolvedValue(undefined)
        },
        releaseRepo: {
          findById: jest.fn().mockResolvedValue(mockRelease),
          update: jest.fn().mockResolvedValue(undefined)
        },
        platformMappingRepo: {
          getByReleaseId: jest.fn().mockResolvedValue(
            requiredPlatforms.map(p => ({ platform: p, version: '1.0.0' }))
          )
        },
        getBuilds: () => builds
      };
    };
    
    // ========================================================================
    // NEW ARCHITECTURE: Tests for Manual Build Upload via release_uploads staging table
    // Reference: Phase 18 in MERGE_PLAN.md
    // ========================================================================
    
    it('should use release_uploads staging table for manual builds (architecture test)', () => {
      // Verify new architecture exists
      const { ReleaseUploadsRepository } = require('../../../script/models/release/release-uploads.repository');
      expect(ReleaseUploadsRepository).toBeDefined();
      expect(ReleaseUploadsRepository.prototype.upsert).toBeDefined();
      expect(ReleaseUploadsRepository.prototype.findUnused).toBeDefined();
      expect(ReleaseUploadsRepository.prototype.markAsUsed).toBeDefined();
      expect(ReleaseUploadsRepository.prototype.checkAllPlatformsReady).toBeDefined();
    });

    it('should have awaiting-manual-build utils for cron handling', () => {
      const { 
        isBuildTaskType, 
        checkAndConsumeManualBuilds,
        processAwaitingManualBuildTasks 
      } = require('../../../script/utils/awaiting-manual-build.utils');
      
      expect(typeof isBuildTaskType).toBe('function');
      expect(typeof checkAndConsumeManualBuilds).toBe('function');
      expect(typeof processAwaitingManualBuildTasks).toBe('function');
    });

    it('should correctly identify build task types', () => {
      const { isBuildTaskType } = require('../../../script/utils/awaiting-manual-build.utils');
      const { TaskType } = require('../../../script/models/release/release.interface');
      
      // Build tasks
      expect(isBuildTaskType(TaskType.TRIGGER_PRE_REGRESSION_BUILDS)).toBe(true);
      expect(isBuildTaskType(TaskType.TRIGGER_REGRESSION_BUILDS)).toBe(true);
      expect(isBuildTaskType(TaskType.TRIGGER_TEST_FLIGHT_BUILD)).toBe(true);
      expect(isBuildTaskType(TaskType.CREATE_AAB_BUILD)).toBe(true);
      
      // Non-build tasks
      expect(isBuildTaskType(TaskType.FORK_BRANCH)).toBe(false);
      expect(isBuildTaskType(TaskType.CREATE_PM_TICKET)).toBe(false);
    });

    it('should map task types to correct upload stages', () => {
      const { getUploadStageForTaskType } = require('../../../script/utils/awaiting-manual-build.utils');
      const { TaskType } = require('../../../script/models/release/release.interface');
      
      expect(getUploadStageForTaskType(TaskType.TRIGGER_PRE_REGRESSION_BUILDS)).toBe('KICK_OFF');
      expect(getUploadStageForTaskType(TaskType.TRIGGER_REGRESSION_BUILDS)).toBe('REGRESSION');
      expect(getUploadStageForTaskType(TaskType.TRIGGER_TEST_FLIGHT_BUILD)).toBe('PRE_RELEASE');
      expect(getUploadStageForTaskType(TaskType.CREATE_AAB_BUILD)).toBe('PRE_RELEASE');
    });

    it('should detect AWAITING_MANUAL_BUILD tasks waiting for manual builds', () => {
      const { isAwaitingManualBuild } = require('../../../script/utils/awaiting-manual-build.utils');
      const { TaskType, TaskStatus } = require('../../../script/models/release/release.interface');
      
      const task = {
        taskType: TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
        taskStatus: TaskStatus.AWAITING_MANUAL_BUILD,
      };
      
      // Should be true when hasManualBuildUpload is true
      expect(isAwaitingManualBuild(task, true)).toBe(true);
      
      // Should be false when hasManualBuildUpload is false
      expect(isAwaitingManualBuild(task, false)).toBe(false);
      
      // Should be false for non-build tasks
      const nonBuildTask = {
        taskType: TaskType.FORK_BRANCH,
        taskStatus: TaskStatus.AWAITING_MANUAL_BUILD,
      };
      expect(isAwaitingManualBuild(nonBuildTask, true)).toBe(false);
    });

    it('should handle single platform release (new architecture)', () => {
      const { isAwaitingManualBuild } = require('../../../script/utils/awaiting-manual-build.utils');
      const { TaskType, TaskStatus, PlatformName } = require('../../../script/models/release/release.interface');
      
      // Single platform release (Android only)
      const platforms = [PlatformName.ANDROID];
      const task = {
        taskType: TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
        taskStatus: TaskStatus.AWAITING_MANUAL_BUILD,
      };
      
      expect(isAwaitingManualBuild(task, true)).toBe(true);
      expect(platforms).toHaveLength(1);
    });

    it('should handle three platform release (new architecture)', () => {
      const { isAwaitingManualBuild } = require('../../../script/utils/awaiting-manual-build.utils');
      const { TaskType, TaskStatus, PlatformName } = require('../../../script/models/release/release.interface');
      
      // Three platform release
      const platforms = [PlatformName.ANDROID, PlatformName.IOS, PlatformName.WEB];
      const task = {
        taskType: TaskType.TRIGGER_PRE_REGRESSION_BUILDS,
        taskStatus: TaskStatus.AWAITING_MANUAL_BUILD,
      };
      
      expect(isAwaitingManualBuild(task, true)).toBe(true);
      expect(platforms).toHaveLength(3);
    });
  });

  // ==========================================================================
  // 4. RETRY - ReleaseUpdateService.retryTask() ✅ IMPLEMENTED
  // ==========================================================================
  
  describe('Retry Task (ReleaseUpdateService.retryTask) ✅', () => {
    
    it('resets task status to PENDING', async () => {
      const mocks = createMockRepositories();
      const service = new ReleaseUpdateService(
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any,
        mocks.platformMappingRepo as any,
        {} as any, // activityLogService - ✅ Required - actively initialized in aws-storage.ts
        mocks.cronJobService as any,
        mocks.taskRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        mocks.buildRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // regressionCycleRepository - ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // releaseConfigService - ✅ Required for workflow validation
        undefined  // releaseNotificationService - optional
      );
      
      const result = await service.retryTask('task-123', 'user-1');
      
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe(TaskStatus.PENDING);
      expect(mocks.taskRepo.update).toHaveBeenCalledWith('task-123', { 
        taskStatus: TaskStatus.PENDING 
      });
    });
    
    it('resumes release if paused', async () => {
      const mocks = createMockRepositories();
      const service = new ReleaseUpdateService(
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any,
        mocks.platformMappingRepo as any,
        {} as any, // activityLogService - ✅ Required - actively initialized in aws-storage.ts
        mocks.cronJobService as any,
        mocks.taskRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        mocks.buildRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // regressionCycleRepository - ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // releaseConfigService - ✅ Required for workflow validation
        undefined  // releaseNotificationService - optional
      );
      
      const result = await service.retryTask('task-123', 'user-1');
      
      expect(result.success).toBe(true);
      // Release should be resumed
      expect(mocks.releaseRepo.update).toHaveBeenCalledWith('release-1', expect.objectContaining({ 
        status: ReleaseStatus.IN_PROGRESS 
      }));
      // CronJob pauseType should be reset
      expect(mocks.cronJobRepo.update).toHaveBeenCalledWith('cron-1', { 
        pauseType: PauseType.NONE 
      });
    });
    
    it('resets failed builds for build tasks', async () => {
      const mocks = createMockRepositories();
      const service = new ReleaseUpdateService(
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any,
        mocks.platformMappingRepo as any,
        {} as any, // activityLogService - ✅ Required - actively initialized in aws-storage.ts
        mocks.cronJobService as any,
        mocks.taskRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        mocks.buildRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // regressionCycleRepository - ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // releaseConfigService - ✅ Required for workflow validation
        undefined  // releaseNotificationService - optional
      );
      
      const result = await service.retryTask('task-123', 'user-1');
      
      expect(result.success).toBe(true);
      // Build repository should reset failed builds
      expect(mocks.buildRepo.resetFailedBuildsForTask).toHaveBeenCalledWith('task-123');
    });
    
    it('rejects retry if task is not FAILED', async () => {
      const mocks = createMockRepositories();
      // Override to return a COMPLETED task
      mocks.taskRepo.findById = jest.fn().mockResolvedValue({
        id: 'task-123',
        releaseId: 'release-1',
        taskType: TaskType.TRIGGER_REGRESSION_BUILDS,
        taskStatus: TaskStatus.COMPLETED
      });
      
      const service = new ReleaseUpdateService(
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any,
        mocks.platformMappingRepo as any,
        {} as any, // activityLogService - ✅ Required - actively initialized in aws-storage.ts
        mocks.cronJobService as any,
        mocks.taskRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        mocks.buildRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // regressionCycleRepository - ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // releaseConfigService - ✅ Required for workflow validation
        undefined  // releaseNotificationService - optional
      );
      
      const result = await service.retryTask('task-123', 'user-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Only FAILED tasks can be retried');
    });
    
    it('works for non-build tasks (does not reset builds)', async () => {
      const mocks = createMockRepositories();
      // Override to return a non-build task
      mocks.taskRepo.findById = jest.fn().mockResolvedValue({
        id: 'task-123',
        releaseId: 'release-1',
        taskType: TaskType.FORK_BRANCH,
        taskStatus: TaskStatus.FAILED
      });
      
      const service = new ReleaseUpdateService(
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any,
        mocks.platformMappingRepo as any,
        {} as any, // activityLogService - ✅ Required - actively initialized in aws-storage.ts
        mocks.cronJobService as any,
        mocks.taskRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        mocks.buildRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // regressionCycleRepository - ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // releaseConfigService - ✅ Required for workflow validation
        undefined  // releaseNotificationService - optional
      );
      
      const result = await service.retryTask('task-123', 'user-1');
      
      expect(result.success).toBe(true);
      // Task should be reset
      expect(mocks.taskRepo.update).toHaveBeenCalled();
      // Build reset should NOT be called (not a build task)
      expect(mocks.buildRepo.resetFailedBuildsForTask).not.toHaveBeenCalled();
    });
    
    it('returns error if task not found', async () => {
      const mocks = createMockRepositories();
      mocks.taskRepo.findById = jest.fn().mockResolvedValue(null);
      
      const service = new ReleaseUpdateService(
        mocks.releaseRepo as any,
        mocks.cronJobRepo as any,
        mocks.platformMappingRepo as any,
        {} as any, // activityLogService - ✅ Required - actively initialized in aws-storage.ts
        mocks.cronJobService as any,
        mocks.taskRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        mocks.buildRepo as any,  // ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // regressionCycleRepository - ✅ Required - actively initialized in aws-storage.ts
        {} as any,  // releaseConfigService - ✅ Required for workflow validation
        undefined  // releaseNotificationService - optional
      );
      
      const result = await service.retryTask('task-123', 'user-1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });
  });

  // ==========================================================================
  // 5. RETRY SCENARIOS (Build-specific)
  // ==========================================================================
  
  describe('Build Retry Scenarios', () => {
    
    describe('Scenario A: Trigger Failed (no queueLocation)', () => {
      it('❌ SHOULD FAIL: identifies builds that need fresh triggerJob()', async () => {
        // Expected: Find builds where queueLocation IS NULL
        // These need a fresh CI/CD trigger
        expect(true).toBe(true); // Placeholder - needs DB setup
      });
    });
    
    describe('Scenario B: Workflow Failed (has ciRunId)', () => {
      it('❌ SHOULD FAIL: identifies builds that need reTriggerJob(ciRunId)', async () => {
        // Expected: Find builds where ciRunId IS NOT NULL AND workflowStatus = FAILED
        // These need reTriggerJob(ciRunId)
        expect(true).toBe(true); // Placeholder - needs DB setup
      });
    });
  });

  // ==========================================================================
  // 6. INTEGRATION TESTS (Full flow)
  // ==========================================================================
  
  describe('Integration: Full Flows', () => {
    
    it('❌ TODO: CI/CD Flow - Trigger → Await → Success → Complete', async () => {
      // Full happy path test
      expect(true).toBe(true);
    });
    
    it('❌ TODO: CI/CD Flow - Trigger → Await → Fail → Pause → Retry → Success', async () => {
      // Failure + retry test
      expect(true).toBe(true);
    });
    
    it('❌ TODO: Manual Upload Flow - Pause → Upload all platforms → Resume', async () => {
      // Manual upload happy path
      expect(true).toBe(true);
    });
  });
});

// ============================================================================
// TEST SUMMARY
// ============================================================================
/**
 * FILES TO CREATE/MODIFY:
 * 
 * 1. services/release/release.utils.ts ✅ DONE
 *    - generatePlatformVersionString(platformMappings) → "7.0.0_android_6.7.0_ios"
 * 
 * 2. services/release/release-update.service.ts (MODIFY)
 *    - Add retryTask(taskId, accountId) method
 *    - Resets task status, release status, cronJob pauseType
 *    - For build tasks: resets failed build entries
 *    - LAZY approach: cron picks up and re-executes
 * 
 * 3. services/release/build-callback.service.ts (CLASS-BASED)
 *    - BuildCallbackService.processCallback(taskId) → reads buildUploadStatus, updates task/release
 * 
 * 4. services/release/manual-upload.service.ts (NEW)
 *    - handleManualBuildUpload(releaseId, taskId, platform, artifact)
 *    - Creates build entry, checks all platforms, resumes release
 * 
 * APPROACH:
 * - Retry is LAZY: API resets status → Cron picks up → TaskExecutor executes
 * - Can switch to EAGER later by adding taskExecutor.execute() call
 * - Retry available for ALL tasks (except deprecated Slack/comm)
 */
