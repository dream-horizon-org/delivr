/**
 * GlobalSchedulerService - Singleton Pattern Unit Tests
 * 
 * Unit tests verifying that GlobalSchedulerService follows the singleton pattern
 * to prevent concurrent execution issues (e.g., duplicate regression cycle creation).
 * 
 * RED Phase: These tests should FAIL initially because singleton pattern is not implemented.
 */

// ================================================================================
// MOCKS - Define FIRST (before imports)
// ================================================================================

jest.mock('../../../script/storage/storage-instance', () => ({
  getStorage: jest.fn().mockReturnValue({
    sequelize: {
      models: {}
    }
  })
}));

jest.mock('../../../script/types/release/api-types', () => ({
  hasSequelize: jest.fn().mockReturnValue(true)
}));

// ✅ Mock storage.taskExecutor instead of factory (migrated from factory pattern)
// Note: TaskExecutor is now accessed from storage instance

// Mock GitHub provider to avoid octokit import issues
jest.mock('../../../script/services/integrations/scm/providers/github/github.provider', () => ({
  GithubProvider: jest.fn()
}));

// Mock all model creation functions to avoid Sequelize complexity
jest.mock('../../../script/models/release/cron-job.sequelize.model', () => ({
  createCronJobModel: jest.fn().mockReturnValue({})
}));

jest.mock('../../../script/models/release/release.sequelize.model', () => ({
  createReleaseModel: jest.fn().mockReturnValue({})
}));

jest.mock('../../../script/models/release/release-task.sequelize.model', () => ({
  createReleaseTaskModel: jest.fn().mockReturnValue({})
}));

jest.mock('../../../script/models/release/regression-cycle.sequelize.model', () => ({
  createRegressionCycleModel: jest.fn().mockReturnValue({})
}));

jest.mock('../../../script/models/release/platform-target-mapping.sequelize.model', () => ({
  createPlatformTargetMappingModel: jest.fn().mockReturnValue({})
}));

jest.mock('../../../script/models/release/release-uploads.sequelize.model', () => ({
  createReleaseUploadModel: jest.fn().mockReturnValue({})
}));

// ================================================================================
// IMPORTS
// ================================================================================

import type { Storage } from '../../../script/storage/storage';

// ================================================================================
// HELPER FUNCTIONS
// ================================================================================

function createMockSequelizeModel() {
  return {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  };
}

function createMockStorage(): Storage {
  // ✅ Mock storage with taskExecutor and globalSchedulerService (migrated from factory)
  const mockTaskExecutor = {
    executeTask: jest.fn()
  };
  
  const mockGlobalSchedulerService = {
    processAllActiveReleases: jest.fn(),
    start: jest.fn().mockReturnValue(true),
    stop: jest.fn().mockReturnValue(true)
  };
  
  return {
    sequelize: {
      models: {},
      query: jest.fn(),
      define: jest.fn().mockReturnValue(createMockSequelizeModel()),
      transaction: jest.fn()
    },
    taskExecutor: mockTaskExecutor,
    globalSchedulerService: mockGlobalSchedulerService
  } as any;
}

// ================================================================================
// TESTS
// ================================================================================

describe('GlobalSchedulerService - Singleton Pattern', () => {
  // Dynamic import to get fresh reference after module reset
  let createGlobalSchedulerService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset the module to clear singleton instance
    jest.resetModules();
    
    // Re-import to get fresh module with reset singleton
    const module = await import('../../../script/services/release/cron-job/scheduler-factory');
    createGlobalSchedulerService = module.createGlobalSchedulerService;
  });

  describe('createGlobalSchedulerService', () => {
    it('should return the same instance on multiple calls (singleton)', async () => {
      // Arrange
      const storage = createMockStorage();

      // Act
      const instance1 = createGlobalSchedulerService(storage);
      const instance2 = createGlobalSchedulerService(storage);
      const instance3 = createGlobalSchedulerService(storage);

      // Assert
      expect(instance1).not.toBeNull();
      expect(instance2).not.toBeNull();
      expect(instance3).not.toBeNull();
      
      // ✅ CRITICAL: All calls should return the SAME instance
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(instance3);
    });

    it('should return the same instance even with different storage objects', async () => {
      // Arrange
      const storage1 = createMockStorage();
      const storage2 = createMockStorage();

      // Act
      const instance1 = createGlobalSchedulerService(storage1);
      const instance2 = createGlobalSchedulerService(storage2);

      // Assert
      expect(instance1).not.toBeNull();
      expect(instance2).not.toBeNull();
      
      // ✅ CRITICAL: Should return cached instance regardless of storage
      expect(instance1).toBe(instance2);
    });

    it('should create only ONE instance when called concurrently', async () => {
      // Arrange
      const storage = createMockStorage();
      const calls = 10;

      // Act - Call factory function concurrently
      const promises = Array.from({ length: calls }, () => 
        Promise.resolve(createGlobalSchedulerService(storage))
      );
      const instances = await Promise.all(promises);

      // Assert
      expect(instances).toHaveLength(calls);
      
      // ✅ CRITICAL: All instances should be the SAME object
      const firstInstance = instances[0];
      instances.forEach((instance) => {
        expect(instance).toBe(firstInstance);
      });
    });

    it('should return null if storage does not have Sequelize', async () => {
      // Arrange
      const hasSequelize = require('../../../script/types/release/api-types').hasSequelize;
      hasSequelize.mockReturnValueOnce(false);
      const storage = createMockStorage();

      // Act
      const instance = createGlobalSchedulerService(storage);

      // Assert
      expect(instance).toBeNull();
    });
  });

  describe('Singleton Behavior Scenarios', () => {
    it('should prevent multiple scheduler ticks from creating separate instances', async () => {
      // Arrange
      const storage = createMockStorage();

      // Act - Simulate setInterval creating instance
      const setIntervalInstance = createGlobalSchedulerService(storage);
      
      // Act - Simulate webhook handler creating instance
      const webhookInstance = createGlobalSchedulerService(storage);

      // Assert
      expect(setIntervalInstance).not.toBeNull();
      expect(webhookInstance).not.toBeNull();
      
      // ✅ CRITICAL: Both should be the SAME instance
      expect(setIntervalInstance).toBe(webhookInstance);
    });

    it('should use the same isProcessing flag across all references', async () => {
      // Arrange
      const storage = createMockStorage();

      // Act
      const instance1 = createGlobalSchedulerService(storage);
      const instance2 = createGlobalSchedulerService(storage);

      // Assert - Verify they're the same object (same internal state)
      expect(instance1).toBe(instance2);
      
      // Both references should have identical methods/state
      expect(instance1?.isRunning()).toBe(instance2?.isRunning());
    });
  });

  describe('Edge Cases', () => {
    it('should handle null storage gracefully', async () => {
      // Arrange
      const hasSequelize = require('../../../script/types/release/api-types').hasSequelize;
      hasSequelize.mockReturnValueOnce(false);

      // Act
      const instance = createGlobalSchedulerService(null as any);

      // Assert
      expect(instance).toBeNull();
    });

    it('should handle undefined storage gracefully', async () => {
      // Arrange
      const hasSequelize = require('../../../script/types/release/api-types').hasSequelize;
      hasSequelize.mockReturnValueOnce(false);

      // Act
      const instance = createGlobalSchedulerService(undefined as any);

      // Assert
      expect(instance).toBeNull();
    });
  });
});

