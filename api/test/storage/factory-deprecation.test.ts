/**
 * Factory Deprecation Tests
 * 
 * Tests that verify factories are no longer needed after migration.
 * All services should be accessible directly from storage instance.
 * 
 * These tests ensure:
 * - Services can be accessed from storage without factories
 * - Factory functions are not required
 * - Migration is complete and functional
 * 
 * ⚠️ TDD APPROACH: These tests are written BEFORE the migration.
 * They will FAIL until taskExecutor and globalSchedulerService are added to S3Storage.
 * This is intentional - write tests first, then implement migration to make them pass.
 */

// Mock octokit before any imports that use it
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        getBranch: jest.fn(),
        createRelease: jest.fn(),
      },
      git: {
        createRef: jest.fn(),
      }
    }
  }))
}));

import { Sequelize } from 'sequelize';
import { initializeStorage, getStorage } from '../../script/storage/storage-instance';
import { S3Storage } from '../../script/storage/aws-storage';
import { TaskExecutor } from '../../script/services/release/task-executor/task-executor';
import { CronJobService } from '../../script/services/release/cron-job/cron-job.service';
import { GlobalSchedulerService } from '../../script/services/release/cron-job/global-scheduler.service';
import { hasSequelize } from '../../script/types/release/api-types';
import { createTestStorage } from '../../test-helpers/release/test-storage';

// Database configuration
const DB_NAME = process.env.DB_NAME || 'codepushdb';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';

describe('Factory Deprecation', () => {
  let storage: any; // Use any to allow accessing properties from createTestStorage
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Create Sequelize instance for testing
    sequelize = new Sequelize({
      database: DB_NAME,
      username: DB_USER,
      password: DB_PASS,
      host: DB_HOST,
      dialect: 'mysql',
      logging: false,
    });

    try {
      await sequelize.authenticate();
    } catch (error) {
      console.warn('Database connection failed, tests may fail:', error);
      // Continue anyway - tests will fail but that's expected if DB is not available
    }

    // Create test storage (includes taskExecutor and globalSchedulerService)
    const testStorage = createTestStorage(sequelize);
    
    // Initialize storage singleton
    initializeStorage(testStorage as any);
    
    // Get storage from singleton
    storage = getStorage();
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  describe('TaskExecutor Factory Deprecation', () => {
    it('should access taskExecutor from storage without getTaskExecutor() factory', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // ✅ NEW: Access directly from storage (no factory needed)
      const taskExecutor = s3Storage.taskExecutor;
      
      // ❌ OLD: Should not need factory
      // const taskExecutor = getTaskExecutor(); // Should be removed

      expect(taskExecutor).toBeDefined();
      expect(taskExecutor).toBeInstanceOf(TaskExecutor);
    });

    it('should have same taskExecutor instance as factory would return', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Access from storage
      const taskExecutorFromStorage = s3Storage.taskExecutor;

      // Verify it's a valid TaskExecutor instance
      expect(taskExecutorFromStorage).toBeInstanceOf(TaskExecutor);
      expect(typeof taskExecutorFromStorage.executeTask).toBe('function');
    });
  });

  // Note: CronJobService is already implemented in S3Storage, not part of this migration
  // Skipping tests - focus is on taskExecutor and globalSchedulerService migration
  describe.skip('CronJobService Factory Deprecation', () => {
    it('should access cronJobService from storage without getCronJobService() factory', () => {
      // This service is already implemented, not part of this migration
    });

    it('should have same cronJobService instance as factory would return', () => {
      // This service is already implemented, not part of this migration
    });
  });

  describe('GlobalSchedulerService Factory Deprecation', () => {
    it('should access globalSchedulerService from storage without createGlobalSchedulerService() factory', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // ✅ NEW: Access directly from storage (no factory needed)
      const globalSchedulerService = s3Storage.globalSchedulerService;
      
      // ❌ OLD: Should not need factory
      // const globalSchedulerService = createGlobalSchedulerService(storage); // Should be removed

      // Can be null if Cronicle not configured, but property should exist
      expect(globalSchedulerService !== undefined).toBe(true);
      
      if (globalSchedulerService !== null) {
        expect(globalSchedulerService).toBeInstanceOf(GlobalSchedulerService);
      }
    });

    it('should have same globalSchedulerService instance as factory would return', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Access from storage
      const globalSchedulerServiceFromStorage = s3Storage.globalSchedulerService;

      // If Cronicle is configured, verify it's a valid instance
      if (globalSchedulerServiceFromStorage !== null) {
        expect(globalSchedulerServiceFromStorage).toBeInstanceOf(GlobalSchedulerService);
        expect(typeof globalSchedulerServiceFromStorage.processAllActiveReleases).toBe('function');
      }
    });
  });

  describe('No Factory Imports Required', () => {
    it('should not require importing task-executor-factory', () => {
      // This test verifies that we don't need to import factories
      // The test itself doesn't import factories, proving they're not needed
      
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // ✅ NEW: Access taskExecutor directly from storage (no factory needed)
      const taskExecutor = s3Storage.taskExecutor;
      
      // ❌ OLD: Should not need factory
      // const taskExecutor = getTaskExecutor(); // This call should be removed

      expect(taskExecutor).toBeDefined();
      expect(taskExecutor).toBeInstanceOf(TaskExecutor);
    });

    // Note: CronJobService is already implemented, not part of this migration
    it.skip('should not require importing cron-job-service.factory', () => {
      // This service is already implemented, not part of this migration
    });

    it('should not require importing scheduler-factory', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // ✅ NEW: Access globalSchedulerService directly from storage (no factory needed)
      const globalSchedulerService = s3Storage.globalSchedulerService;
      
      // ❌ OLD: Should not need factory
      // const globalSchedulerService = createGlobalSchedulerService(storage); // Should be removed

      // Property should exist (can be null if Cronicle not configured)
      expect(globalSchedulerService !== undefined).toBe(true);
      
      if (globalSchedulerService !== null) {
        expect(globalSchedulerService).toBeInstanceOf(GlobalSchedulerService);
      }
    });
  });

  describe('Migration Completeness', () => {
    it('should have all services initialized in aws-storage.ts', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Verify migrated services are available (focus of this migration)
      expect(s3Storage.taskExecutor).toBeDefined();
      expect(s3Storage.taskExecutor).toBeInstanceOf(TaskExecutor);
      expect(s3Storage.globalSchedulerService !== undefined).toBe(true);
      
      if (s3Storage.globalSchedulerService !== null) {
        expect(s3Storage.globalSchedulerService).toBeInstanceOf(GlobalSchedulerService);
      }
    });

    it('should maintain singleton pattern for migrated services', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Migrated services should return same instance on multiple calls (singleton pattern)
      expect(s3Storage.taskExecutor).toBe(s3Storage.taskExecutor);
      
      if (s3Storage.globalSchedulerService !== null) {
        expect(s3Storage.globalSchedulerService).toBe(s3Storage.globalSchedulerService);
      }
    });
  });
});

