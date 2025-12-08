/**
 * State Pattern Test Helpers
 * 
 * Shared test utilities for State Pattern tests
 */

import { TaskStage, StageStatus, TaskStatus, CronStatus } from '../../script/models/release/release.interface';
import { Sequelize } from 'sequelize';

export const mockReleaseId = 'release-123';
export const mockCronJobId = 'cron-456';
export const mockTenantId = 'tenant-789';

type MockCronJobOptions = {
  stage1Status?: StageStatus;
  stage2Status?: StageStatus;
  stage3Status?: StageStatus;
  cronStatus?: CronStatus;
  autoTransitionToStage2?: boolean;
  autoTransitionToStage3?: boolean;
  upcomingRegressions?: any;
};

export const createMockCronJob = (options: MockCronJobOptions = {}) => ({
  id: mockCronJobId,
  releaseId: mockReleaseId,
  cronStatus: options.cronStatus ?? CronStatus.RUNNING,
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
  mockStorage: createMockStorage()
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

