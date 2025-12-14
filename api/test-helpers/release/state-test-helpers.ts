/**
 * State Pattern Test Helpers
 * 
 * Shared test utilities for State Pattern tests
 */

import { TaskStage, StageStatus, TaskStatus, CronStatus, PauseType } from '../../script/models/release/release.interface';
import { Sequelize } from 'sequelize';

export const mockReleaseId = 'release-123';
export const mockCronJobId = 'cron-456';
export const mockTenantId = 'tenant-789';

type MockCronJobOptions = {
  stage1Status?: StageStatus;
  stage2Status?: StageStatus;
  stage3Status?: StageStatus;
  cronStatus?: CronStatus;
  pauseType?: PauseType;
  autoTransitionToStage2?: boolean;
  autoTransitionToStage3?: boolean;
  upcomingRegressions?: any;
};

export const createMockCronJob = (options: MockCronJobOptions = {}) => ({
  id: mockCronJobId,
  releaseId: mockReleaseId,
  cronStatus: options.cronStatus ?? CronStatus.RUNNING,
  pauseType: options.pauseType ?? PauseType.NONE,
  stage1Status: options.stage1Status ?? StageStatus.PENDING,
  stage2Status: options.stage2Status ?? StageStatus.PENDING,
  stage3Status: options.stage3Status ?? StageStatus.PENDING,
  autoTransitionToStage2: options.autoTransitionToStage2 ?? true,
  autoTransitionToStage3: options.autoTransitionToStage3 ?? true,
  cronConfig: {
    kickOffReminder: true,
    preRegressionBuilds: true,
    automationBuilds: true,
    testFlightBuilds: false,
    automationRuns: false
  },
  upcomingRegressions: options.upcomingRegressions ?? null,
  createdAt: new Date(),
  updatedAt: new Date()
});

export const createMockRelease = (overrides = {}) => ({
  id: mockReleaseId,
  tenantId: mockTenantId,
  name: 'Release 1.0',
  version: '1.0.0',
  releaseConfigId: 'config-123',
  createdByAccountId: 'account-123',
  ...overrides
});

export const createMockTask = (taskType: string, taskStatus: TaskStatus = TaskStatus.PENDING) => ({
  id: `task-${taskType}`,
  releaseId: mockReleaseId,
  taskType,
  taskStatus,
  taskStage: TaskStage.KICKOFF,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Individual mock creators (exported for flexibility)
// Note: These create mocks matching the new Repository interfaces

export const createMockCronJobDTO = () => {
  // Create shared mock functions so both old and new method names work
  const findByReleaseIdMock = jest.fn();
  const findByIdMock = jest.fn();
  const createMock = jest.fn();
  const updateMock = jest.fn();
  
  return {
    // Required base Repository properties (mocked)
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
    delete: jest.fn(),
    // Repository interface methods (new)
    findByReleaseId: findByReleaseIdMock,
    findById: findByIdMock,
    findRunning: jest.fn(),
    create: createMock,
    update: updateMock,
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
    isLocked: jest.fn().mockResolvedValue(false),
    // Legacy method names pointing to same mocks
    getByReleaseId: findByReleaseIdMock,
    get: findByIdMock
  };
};

export const createMockReleaseDTO = () => {
  const findByIdMock = jest.fn();
  const createMock = jest.fn();
  const updateMock = jest.fn();
  
  return {
    // Required base Repository properties (mocked)
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
    // Repository interface methods (new)
    findById: findByIdMock,
    findByTenantId: jest.fn(),
    create: createMock,
    update: updateMock,
    delete: jest.fn(),
    // Legacy method names pointing to same mocks
    get: findByIdMock
  };
};

export const createMockReleaseTasksDTO = () => {
  const findByIdMock = jest.fn();
  const findByReleaseAndStageMock = jest.fn();
  const findByTaskTypeMock = jest.fn();
  const findByRegressionCycleIdMock = jest.fn();
  const createMock = jest.fn();
  const updateMock = jest.fn();
  
  return {
    // Required base Repository properties (mocked)
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
    delete: jest.fn(),
    // Repository interface methods (new)
    findById: findByIdMock,
    findByReleaseId: jest.fn(),
    findByReleaseIdAndStage: findByReleaseAndStageMock,
    findByTaskType: findByTaskTypeMock,
    findByRegressionCycleId: findByRegressionCycleIdMock,
    create: createMock,
    update: updateMock,
    bulkCreate: jest.fn(),
    // Legacy method names pointing to same mocks
    findByReleaseAndStage: findByReleaseAndStageMock,
    getByReleaseAndStage: findByReleaseAndStageMock,
    getById: findByIdMock,
    updateById: updateMock,
    getByTaskType: findByTaskTypeMock,
    getByRegressionCycle: findByRegressionCycleIdMock
  };
};

export const createMockRegressionCycleDTO = () => {
  const findByIdMock = jest.fn();
  const findByReleaseIdMock = jest.fn();
  const findLatestMock = jest.fn();
  const createMock = jest.fn();
  const updateMock = jest.fn();
  
  return {
    // Required base Repository properties (mocked)
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
    delete: jest.fn(),
    // Repository interface methods (new) - all point to same mock functions
    findById: findByReleaseIdMock,  // Note: findById also uses findByReleaseIdMock for simplicity
    findByReleaseId: findByReleaseIdMock,
    findLatest: findLatestMock,
    findPrevious: jest.fn(),
    create: createMock,
    update: updateMock,
    getCycleCount: jest.fn(),
    getTagCount: jest.fn(),
    // Legacy method names pointing to same mocks (tests use these)
    getByReleaseId: findByReleaseIdMock,
    getByRelease: findByReleaseIdMock,
    getLatest: findLatestMock,
    get: findByIdMock
  };
};

export const createMockTaskExecutor = () => ({
  executeTask: jest.fn().mockResolvedValue({
    success: true,
    externalId: 'test-123',
    externalData: {}
  })
});

export const createMockStorage = () => {
  // Create a mock Sequelize instance that passes instanceof checks
  const mockSequelize = Object.create(Sequelize.prototype);
  mockSequelize.models = {
    release: {
      findByPk: jest.fn()
    },
    platform: {},
    regressionCycle: {},
    // Note: Capital "C" to match checkIntegrationAvailability expectations
    ReleaseConfig: {
      findByPk: jest.fn().mockResolvedValue({
        id: 'config-123',
        projectManagementConfigId: 'pm-config-123',
        testManagementConfigId: 'tm-config-123',
        toJSON: jest.fn().mockReturnValue({
          id: 'config-123',
          projectManagementConfigId: 'pm-config-123',
          testManagementConfigId: 'tm-config-123'
        })
      })
    }
  };
  
  return {
    sequelize: mockSequelize
  };
};

// Convenience function that returns all mocks at once
// Using 'as any' to bypass strict TypeScript checking for test mocks
export const createMockStateMachineDependencies = () => ({
  mockCronJobDTO: createMockCronJobDTO() as any,
  mockReleaseDTO: createMockReleaseDTO() as any,
  mockReleaseTasksDTO: createMockReleaseTasksDTO() as any,
  mockRegressionCycleDTO: createMockRegressionCycleDTO() as any,
  mockTaskExecutor: createMockTaskExecutor() as any,
  mockStorage: createMockStorage(),
  mockPlatformMappingRepo: createMockPlatformMappingRepo() as any,
  mockReleaseUploadsRepo: createMockReleaseUploadsRepo() as any
});

/**
 * Expected State Pattern API
 * 
 * This defines what we expect the State Pattern to look like.
 * Tests will verify implementations match this interface.
 */
export interface ICronJobState {
  /**
   * Execute the state's logic (run tasks, create cycles, etc.)
   */
  execute(): Promise<void>;

  /**
   * Check if the state is complete (all tasks done)
   */
  isComplete(): Promise<boolean>;

  /**
   * Transition to the next state
   */
  transitionToNext(): Promise<void>;

  /**
   * Get the stage this state represents
   */
  getStage(): TaskStage;
}

export interface ICronJobStateMachine {
  /**
   * Execute the current state
   */
  execute(): Promise<void>;

  /**
   * Get current state
   */
  getCurrentState(): ICronJobState;

  /**
   * Set current state (for transitions)
   */
  setState(state: ICronJobState): void;

  /**
   * Check if workflow is complete
   */
  isWorkflowComplete(): boolean;

  /**
   * Get dependencies (for states to access)
   */
  getCronJobDTO(): any;
  getReleaseDTO(): any;
  getReleaseTasksDTO(): any;
  getRegressionCycleDTO(): any;
  getTaskExecutor(): any;
  getStorage(): any;
  getReleaseId(): string;
  getCronJobId(): string;
}

// ================================================================================
// MANUAL BUILD UPLOAD MOCK CREATORS
// ================================================================================

/**
 * Mock creator for ReleaseUploadsRepository
 * Used for testing manual build upload flow
 */
export const createMockReleaseUploadsRepo = () => {
  const createMock = jest.fn();
  const findByIdMock = jest.fn();
  const findUnusedMock = jest.fn();
  const findUnusedByPlatformMock = jest.fn();
  const markAsUsedMock = jest.fn();
  const upsertMock = jest.fn();
  const deleteMock = jest.fn();
  const checkAllPlatformsReadyMock = jest.fn();
  const findByTaskIdMock = jest.fn();
  const findByCycleIdMock = jest.fn();
  const markMultipleAsUsedMock = jest.fn();

  return {
    // Repository interface methods
    create: createMock,
    findById: findByIdMock,
    findByReleaseAndStage: jest.fn(),
    findUnused: findUnusedMock,
    findUnusedByPlatform: findUnusedByPlatformMock,
    findByTaskId: findByTaskIdMock,
    findByCycleId: findByCycleIdMock,
    markAsUsed: markAsUsedMock,
    markMultipleAsUsed: markMultipleAsUsedMock,
    upsert: upsertMock,
    delete: deleteMock,
    deleteUnused: jest.fn(),
    checkAllPlatformsReady: checkAllPlatformsReadyMock,
    getUploadCount: jest.fn(),
    // Required base properties
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
  };
};

/**
 * Mock creator for BuildRepository
 * Used for testing build creation and status tracking
 */
export const createMockBuildRepo = () => {
  const createMock = jest.fn();
  const findByIdMock = jest.fn();
  const findByTaskIdMock = jest.fn();
  const findByTaskAndQueueLocationMock = jest.fn();
  const getTaskBuildStatusMock = jest.fn();
  const resetFailedBuildsForTaskMock = jest.fn();

  return {
    // Repository interface methods
    create: createMock,
    findById: findByIdMock,
    findByTaskId: findByTaskIdMock,
    findByTaskAndQueueLocation: findByTaskAndQueueLocationMock,
    getTaskBuildStatus: getTaskBuildStatusMock,
    getFailedBuildsCount: jest.fn(),
    getFailedTriggerBuilds: jest.fn(),
    getFailedWorkflowBuilds: jest.fn(),
    resetFailedBuildsForTask: resetFailedBuildsForTaskMock,
    update: jest.fn(),
    delete: jest.fn(),
    // Required base properties
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
  };
};

/**
 * Mock creator for PlatformMappingRepository
 * Used for testing platform-specific operations
 */
export const createMockPlatformMappingRepo = () => {
  const findByReleaseIdMock = jest.fn();

  return {
    // Repository interface methods
    findByReleaseId: findByReleaseIdMock,
    getByReleaseId: findByReleaseIdMock, // Legacy alias
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    // Required base properties
    sequelize: {} as any,
    model: {} as any,
    toPlainObject: jest.fn((obj) => obj),
  };
};

/**
 * Mock creator for CICDService
 * Used for testing S3 uploads and CI/CD operations
 */
export const createMockCICDService = () => {
  return {
    uploadToS3: jest.fn(),
    triggerJob: jest.fn(),
    reTriggerJob: jest.fn(),
    getJobStatus: jest.fn(),
  };
};

/**
 * Mock creator for UploadValidationService
 * Used for testing upload validation rules
 */
export const createMockUploadValidationService = () => {
  return {
    validateUpload: jest.fn(),
    isUploadWindowOpen: jest.fn(),
    getUploadWindowStatus: jest.fn(),
  };
};

/**
 * Mock release upload entry
 */
export const createMockReleaseUpload = (overrides: Partial<{
  id: string;
  releaseId: string;
  platform: string;
  stage: string;
  artifactPath: string;
  isUsed: boolean;
  usedByTaskId: string | null;
  usedByCycleId: string | null;
}> = {}) => ({
  id: overrides.id ?? `upload-${Date.now()}`,
  tenantId: mockTenantId,
  releaseId: overrides.releaseId ?? mockReleaseId,
  platform: overrides.platform ?? 'ANDROID',
  stage: overrides.stage ?? 'REGRESSION',
  artifactPath: overrides.artifactPath ?? 's3://bucket/path/to/build.apk',
  isUsed: overrides.isUsed ?? false,
  usedByTaskId: overrides.usedByTaskId ?? null,
  usedByCycleId: overrides.usedByCycleId ?? null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * Convenience function for manual build upload test dependencies
 */
export const createMockManualUploadDependencies = () => ({
  mockReleaseUploadsRepo: createMockReleaseUploadsRepo() as any,
  mockBuildRepo: createMockBuildRepo() as any,
  mockPlatformMappingRepo: createMockPlatformMappingRepo() as any,
  mockCICDService: createMockCICDService() as any,
  mockUploadValidationService: createMockUploadValidationService() as any,
  mockReleaseRepo: createMockReleaseDTO() as any,
  mockCronJobRepo: createMockCronJobDTO() as any,
  mockTaskRepo: createMockReleaseTasksDTO() as any,
});

