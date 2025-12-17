/**
 * Trigger Stage 4 (Distribution) Tests
 * 
 * Tests for the triggerStage4 API in CronJobService.
 * Verifies:
 * - Correct validation of stage prerequisites
 * - Project management status check
 * - Proper cronJob updates (stage4Status, pauseType, cronStatus, cronStoppedAt)
 */

// ================================================================================
// MOCKS - Define FIRST (before imports)
// ================================================================================

jest.mock('../../../script/models/release/cron-job.repository');
jest.mock('../../../script/models/release/release.repository');
jest.mock('../../../script/models/release/release-task.repository');
jest.mock('../../../script/models/release/regression-cycle.repository');
jest.mock('../../../script/models/release/release-platform-target-mapping.repository');
jest.mock('../../../script/services/release/task-executor/task-executor-factory', () => ({
  getTaskExecutor: jest.fn(),
}));
jest.mock('../../../script/storage/storage-instance', () => ({
  getStorage: jest.fn(),
}));

// ================================================================================
// IMPORTS
// ================================================================================

import { 
  StageStatus, 
  CronStatus, 
  PauseType 
} from '../../../script/models/release/release.interface';
import { CronJobService } from '../../../script/services/release/cron-job/cron-job.service';
import { CronJobRepository } from '../../../script/models/release/cron-job.repository';
import { ReleaseRepository } from '../../../script/models/release/release.repository';
import { ReleaseTaskRepository } from '../../../script/models/release/release-task.repository';
import { RegressionCycleRepository } from '../../../script/models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '../../../script/models/release/release-platform-target-mapping.repository';
import type { ReleaseStatusService } from '../../../script/services/release/release-status.service';

// ================================================================================
// TEST CONSTANTS
// ================================================================================

const mockReleaseId = 'release-stage4-test';
const mockTenantId = 'tenant-stage4-test';
const mockCronJobId = 'cronjob-stage4-test';
const mockApprovedBy = 'test-approver@example.com';

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

const createMockCronJob = (overrides = {}): any => ({
  id: mockCronJobId,
  releaseId: mockReleaseId,
  cronStatus: CronStatus.RUNNING,
  pauseType: PauseType.AWAITING_STAGE_TRIGGER,
  stage1Status: StageStatus.COMPLETED,
  stage2Status: StageStatus.COMPLETED,
  stage3Status: StageStatus.COMPLETED,
  stage4Status: StageStatus.PENDING,
  autoTransitionToStage2: true,
  autoTransitionToStage3: true,
  cronConfig: {},
  upcomingRegressions: null,
  cronCreatedAt: new Date(),
  cronStoppedAt: null,
  cronCreatedByAccountId: 'account-123',
  lockedBy: null,
  lockedAt: null,
  lockTimeout: 30000,
  stageData: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

const createMockRelease = (overrides = {}): any => ({
  id: mockReleaseId,
  releaseId: 'REL-001',
  tenantId: mockTenantId,
  status: 'IN_PROGRESS',
  type: 'MINOR',
  branch: 'release/v1.0.0',
  baseBranch: 'master',
  baseReleaseId: null,
  releaseTag: null,
  kickOffReminderDate: null,
  kickOffDate: new Date(),
  targetReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  delayReason: null,
  releaseDate: null,
  hasManualBuildUpload: false,
  creaseByAccountId: 'account-123',
  releasePilotAccountId: null,
  lastUpdatedByAccountId: 'account-123',
  releaseConfigId: 'config-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// ================================================================================
// TESTS
// ================================================================================

describe('CronJobService - triggerStage4', () => {
  let cronJobService: CronJobService;
  let mockCronJobRepo: jest.Mocked<CronJobRepository>;
  let mockReleaseRepo: jest.Mocked<ReleaseRepository>;
  let mockReleaseTaskRepo: jest.Mocked<ReleaseTaskRepository>;
  let mockRegressionCycleRepo: jest.Mocked<RegressionCycleRepository>;
  let mockPlatformMappingRepo: jest.Mocked<ReleasePlatformTargetMappingRepository>;
  let mockStorage: any;
  let mockReleaseStatusService: jest.Mocked<ReleaseStatusService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repositories
    mockCronJobRepo = {
      findByReleaseId: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findRunning: jest.fn(),
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
      isLocked: jest.fn(),
    } as unknown as jest.Mocked<CronJobRepository>;

    mockReleaseRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findByTenantId: jest.fn(),
    } as unknown as jest.Mocked<ReleaseRepository>;

    mockReleaseTaskRepo = {
      findByReleaseId: jest.fn(),
      findByReleaseIdAndStage: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ReleaseTaskRepository>;

    mockRegressionCycleRepo = {
      findByReleaseId: jest.fn(),
      findLatest: jest.fn(),
    } as unknown as jest.Mocked<RegressionCycleRepository>;

    mockPlatformMappingRepo = {
      findByReleaseId: jest.fn(),
    } as unknown as jest.Mocked<ReleasePlatformTargetMappingRepository>;

    mockStorage = {
      sequelize: {}
    };

    mockReleaseStatusService = {
      allPlatformsPassingProjectManagement: jest.fn(),
      allPlatformsPassingTestManagement: jest.fn(),
      cherryPickAvailable: jest.fn(),
      getProjectManagementStatus: jest.fn(),
      getTestManagementStatus: jest.fn(),
      getCherryPickStatus: jest.fn(),
    } as unknown as jest.Mocked<ReleaseStatusService>;

    // Create service instance
    cronJobService = new CronJobService(
      mockCronJobRepo,
      mockReleaseRepo,
      mockReleaseTaskRepo,
      mockRegressionCycleRepo,
      mockPlatformMappingRepo,
      mockStorage
    );

    // Inject ReleaseStatusService
    cronJobService.setReleaseStatusService(mockReleaseStatusService);
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Validation', () => {
    it('should return error if release not found', async () => {
      mockReleaseRepo.findById.mockResolvedValue(null);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.statusCode).toBe(404);
        expect(result.error).toContain('Release not found');
      }
    });

    it('should return error if release does not belong to tenant', async () => {
      mockReleaseRepo.findById.mockResolvedValue(
        createMockRelease({ tenantId: 'different-tenant' })
      );

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.statusCode).toBe(403);
        expect(result.error).toContain('does not belong to this tenant');
      }
    });

    it('should return error if cron job not found', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(null);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.statusCode).toBe(404);
        expect(result.error).toContain('Cron job not found');
      }
    });

    it('should return error if Stage 3 is not COMPLETED', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(
        createMockCronJob({ stage3Status: StageStatus.IN_PROGRESS })
      );
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(true);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.statusCode).toBe(400);
        expect(result.error).toContain('Stage 3 must be COMPLETED');
      }
    });

    it('should return error if Stage 4 is already IN_PROGRESS', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(
        createMockCronJob({ stage4Status: StageStatus.IN_PROGRESS })
      );
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(true);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.statusCode).toBe(400);
        expect(result.error).toContain('Stage 4 is already in progress');
      }
    });

    it('should return error if Stage 4 is already COMPLETED', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(
        createMockCronJob({ stage4Status: StageStatus.COMPLETED })
      );
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(true);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.statusCode).toBe(400);
        expect(result.error).toContain('Stage 4 is already completed');
      }
    });
  });

  // ============================================================================
  // PROJECT MANAGEMENT STATUS TESTS
  // ============================================================================

  describe('Project Management Status Check', () => {
    it('should return error if project management tickets are not completed', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(createMockCronJob());
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(false);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.statusCode).toBe(400);
        expect(result.error).toContain('Project management check failed');
        expect(result.error).toContain('tickets are completed');
      }
    });

    it('should skip project management check if forceApprove is true', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(createMockCronJob());
      mockCronJobRepo.update.mockResolvedValue(undefined);
      // PM check returns false, but should be skipped due to forceApprove
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(false);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy,
        undefined,
        true // forceApprove = true
      );

      expect(result.success).toBe(true);
      // PM check should NOT have been called
      expect(mockReleaseStatusService.allPlatformsPassingProjectManagement).not.toHaveBeenCalled();
    });

    it('should proceed if project management tickets are completed', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(createMockCronJob());
      mockCronJobRepo.update.mockResolvedValue(undefined);
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(true);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(true);
      expect(mockReleaseStatusService.allPlatformsPassingProjectManagement).toHaveBeenCalledWith(mockReleaseId);
    });
  });

  // ============================================================================
  // SUCCESSFUL TRIGGER TESTS
  // ============================================================================

  describe('Successful Stage 4 Trigger', () => {
    it('should update cronJob with correct values', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(createMockCronJob());
      mockCronJobRepo.update.mockResolvedValue(undefined);
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(true);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      expect(result.success).toBe(true);
      expect(mockCronJobRepo.update).toHaveBeenCalledWith(
        mockCronJobId,
        expect.objectContaining({
          stage4Status: StageStatus.IN_PROGRESS,
          pauseType: PauseType.NONE,
          cronStatus: CronStatus.COMPLETED,
          cronStoppedAt: expect.any(Date)
        })
      );
    });

    it('should return success response with correct data', async () => {
      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(createMockCronJob());
      mockCronJobRepo.update.mockResolvedValue(undefined);
      mockReleaseStatusService.allPlatformsPassingProjectManagement.mockResolvedValue(true);

      const result = await cronJobService.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy,
        'Test comment'
      );

      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data.releaseId).toBe(mockReleaseId);
        expect(result.data.stage4Status).toBe(StageStatus.IN_PROGRESS);
        expect(result.data.approvedBy).toBe(mockApprovedBy);
        expect(result.data.approvedAt).toBeDefined();
        expect(result.data.nextStage).toBe('DISTRIBUTION');
      }
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should work without ReleaseStatusService (no PM check)', async () => {
      // Create service without status service
      const serviceWithoutStatus = new CronJobService(
        mockCronJobRepo,
        mockReleaseRepo,
        mockReleaseTaskRepo,
        mockRegressionCycleRepo,
        mockPlatformMappingRepo,
        mockStorage
      );
      // Note: NOT calling setReleaseStatusService

      mockReleaseRepo.findById.mockResolvedValue(createMockRelease());
      mockCronJobRepo.findByReleaseId.mockResolvedValue(createMockCronJob());
      mockCronJobRepo.update.mockResolvedValue(undefined);

      const result = await serviceWithoutStatus.triggerStage4(
        mockReleaseId,
        mockTenantId,
        mockApprovedBy
      );

      // Should succeed (PM check skipped when service not available)
      expect(result.success).toBe(true);
    });
  });
});

