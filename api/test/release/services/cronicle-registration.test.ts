/**
 * Cronicle Release Tick Registration Tests
 * 
 * TDD tests for registerCronicleReleaseTick() function.
 * Tests the registration of a Cronicle job that triggers the release orchestration webhook.
 * 
 * Note: We mock the scheduler-factory module dependencies to avoid import chain issues
 * with external packages like octokit.
 */

// Mock the heavy dependencies BEFORE importing the module
jest.mock('~services/release/task-executor/task-executor-factory', () => ({
  getTaskExecutor: jest.fn()
}));

jest.mock('~services/release/cron-job/cron-job-state-machine', () => ({
  CronJobStateMachine: jest.fn()
}));

jest.mock('~services/release/cron-job/global-scheduler.service', () => ({
  GlobalSchedulerService: jest.fn(),
  getSchedulerType: jest.fn().mockReturnValue('cronicle')
}));

jest.mock('~models/release/cron-job.repository', () => ({
  CronJobRepository: jest.fn()
}));

jest.mock('~models/release/release.repository', () => ({
  ReleaseRepository: jest.fn()
}));

jest.mock('~models/release/release-task.repository', () => ({
  ReleaseTaskRepository: jest.fn()
}));

jest.mock('~models/release/regression-cycle.repository', () => ({
  RegressionCycleRepository: jest.fn()
}));

jest.mock('~models/release/release-platform-target-mapping.repository', () => ({
  ReleasePlatformTargetMappingRepository: jest.fn()
}));

jest.mock('~models/release/release-uploads.repository', () => ({
  ReleaseUploadsRepository: jest.fn()
}));

jest.mock('~models/release/cron-job.sequelize.model', () => ({
  createCronJobModel: jest.fn()
}));

jest.mock('~models/release/release.sequelize.model', () => ({
  createReleaseModel: jest.fn()
}));

jest.mock('~models/release/release-task.sequelize.model', () => ({
  createReleaseTaskModel: jest.fn()
}));

jest.mock('~models/release/regression-cycle.sequelize.model', () => ({
  createRegressionCycleModel: jest.fn()
}));

jest.mock('~models/release/platform-target-mapping.sequelize.model', () => ({
  createPlatformTargetMappingModel: jest.fn()
}));

jest.mock('~models/release/release-uploads.sequelize.model', () => ({
  createReleaseUploadModel: jest.fn()
}));

jest.mock('~types/release/api-types', () => ({
  hasSequelize: jest.fn()
}));

// Import AFTER mocks are set up
import { registerCronicleReleaseTick } from '~services/release/cron-job/scheduler-factory';
import type { CronicleService } from '~services/cronicle';

// ============================================================================
// MOCK HELPERS
// ============================================================================

type MockCronicleServiceOverrides = {
  findCategoryByTitle?: jest.Mock;
  createJob?: jest.Mock;
  buildDirectUrl?: jest.Mock;
};

const createMockCronicleService = (overrides: MockCronicleServiceOverrides = {}): CronicleService => ({
  getJob: jest.fn().mockResolvedValue(null),
  createJob: jest.fn().mockResolvedValue('auto-generated-job-id'),
  updateJob: jest.fn().mockResolvedValue(undefined),
  deleteJob: jest.fn().mockResolvedValue(undefined),
  setJobEnabled: jest.fn().mockResolvedValue(undefined),
  runJobNow: jest.fn().mockResolvedValue('run-id'),
  getCategories: jest.fn().mockResolvedValue([]),
  findCategoryByTitle: jest.fn().mockResolvedValue(null),  // Category doesn't exist by default
  createCategory: jest.fn().mockResolvedValue('category-id'),
  buildWebhookUrl: jest.fn().mockReturnValue('http://localhost:3000/api/internal/cron/releases'),
  buildDirectUrl: jest.fn().mockReturnValue('http://localhost:3000/internal/cron/releases'),
  ping: jest.fn().mockResolvedValue(true),
  ...overrides
});

// ============================================================================
// EXPECTED CONSTANTS
// ============================================================================

const EXPECTED_CATEGORY = 'Release Orchestration';
const EXPECTED_WEBHOOK_PATH = '/internal/cron/releases';

// ============================================================================
// TESTS
// ============================================================================

describe('registerCronicleReleaseTick()', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Creation', () => {
    
    it('should create job when category does not exist', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService({
        findCategoryByTitle: jest.fn().mockResolvedValue(null)  // Category doesn't exist
      });

      // Act
      const result = await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.findCategoryByTitle).toHaveBeenCalledWith(EXPECTED_CATEGORY);
      expect(mockCronicleService.createJob).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
    });

    it('should skip creation when category already exists (single job per category)', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService({
        findCategoryByTitle: jest.fn().mockResolvedValue('existing-category-id')  // Category exists
      });

      // Act
      const result = await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.findCategoryByTitle).toHaveBeenCalledWith(EXPECTED_CATEGORY);
      expect(mockCronicleService.createJob).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.created).toBe(false);
      expect(result.alreadyExists).toBe(true);
    });
  });

  describe('Job Configuration', () => {
    
    it('should create job without providing ID (let Cronicle auto-generate)', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService();

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert - createJob should be called WITHOUT an 'id' field
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.not.objectContaining({
          id: expect.anything()
        })
      );
    });

    it('should create job with correct title', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService();

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Release Orchestration')
        })
      );
    });

    it('should create job with cron timing for every minute', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService();

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          timing: { type: 'cron', value: '* * * * *' }  // Every minute
        })
      );
    });

    it('should use buildDirectUrl for webhook URL', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService({
        buildDirectUrl: jest.fn().mockReturnValue('http://server/internal/cron/releases')
      });

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.buildDirectUrl).toHaveBeenCalledWith(EXPECTED_WEBHOOK_PATH);
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            method: 'POST',
            url: 'http://server/internal/cron/releases'
          })
        })
      );
    });

    it('should create job with no retries (next tick will handle)', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService();

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          retries: 0
        })
      );
    });

    it('should create job with catchUp disabled', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService();

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          catchUp: false
        })
      );
    });

    it('should create job as enabled', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService();

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true
        })
      );
    });

    it('should create job with category title (not ID)', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService();

      // Act
      await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(mockCronicleService.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          category: EXPECTED_CATEGORY
        })
      );
    });
  });

  describe('Error Handling', () => {
    
    it('should handle findCategoryByTitle error gracefully', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService({
        findCategoryByTitle: jest.fn().mockRejectedValue(new Error('Cronicle unavailable'))
      });

      // Act
      const result = await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cronicle unavailable');
    });

    it('should handle createJob error gracefully', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService({
        findCategoryByTitle: jest.fn().mockResolvedValue(null),
        createJob: jest.fn().mockRejectedValue(new Error('Failed to create job'))
      });

      // Act
      const result = await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create job');
    });

    it('should return failure when cronicleService is null', async () => {
      // Act
      const result = await registerCronicleReleaseTick(null);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should return failure when cronicleService is undefined', async () => {
      // Act
      const result = await registerCronicleReleaseTick(undefined);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  describe('Result Object', () => {
    
    it('should return auto-generated jobId when job is created', async () => {
      // Arrange
      const autoGeneratedId = 'cronicle-auto-id-12345';
      const mockCronicleService = createMockCronicleService({
        createJob: jest.fn().mockResolvedValue(autoGeneratedId)
      });

      // Act
      const result = await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(result.jobId).toBe(autoGeneratedId);
    });

    it('should NOT return jobId when category already exists (we dont know the job ID)', async () => {
      // Arrange
      const mockCronicleService = createMockCronicleService({
        findCategoryByTitle: jest.fn().mockResolvedValue('existing-category-id')
      });

      // Act
      const result = await registerCronicleReleaseTick(mockCronicleService);

      // Assert
      expect(result.jobId).toBeUndefined();
      expect(result.alreadyExists).toBe(true);
    });
  });
});
