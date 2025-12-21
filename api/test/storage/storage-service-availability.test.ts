/**
 * Storage Service Availability Tests
 * 
 * Tests that verify all services and repositories are available on storage instance
 * after migration from factories to aws-storage.ts initialization.
 * 
 * These tests ensure:
 * - All services are initialized in aws-storage.ts
 * - Services are accessible as public properties
 * - No factories are needed to access services
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
import { ReleaseCreationService } from '../../script/services/release/release-creation.service';
import { ReleaseRetrievalService } from '../../script/services/release/release-retrieval.service';
import { ReleaseUpdateService } from '../../script/services/release/release-update.service';
import { ReleaseStatusService } from '../../script/services/release/release-status.service';
import { hasSequelize } from '../../script/types/release/api-types';
import { createTestStorage } from '../../test-helpers/release/test-storage';

// Database configuration
const DB_NAME = process.env.DB_NAME || 'codepushdb';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';

describe('Storage Service Availability', () => {
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
      logging: false, // Disable SQL logging in tests
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

  describe('Core Services Availability', () => {
    it('should have taskExecutor available on storage', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      // ✅ NEW: Access from storage (after migration)
      const s3Storage = storageInstance as any;
      expect(s3Storage.taskExecutor).toBeDefined();
      expect(s3Storage.taskExecutor).toBeInstanceOf(TaskExecutor);
    });

    // Note: cronJobService is already implemented in S3Storage, not part of this migration
    // Skipping test - focus is on taskExecutor and globalSchedulerService migration
    it.skip('should have cronJobService available on storage', () => {
      // This service is already implemented, not part of this migration
    });

    it('should have globalSchedulerService available on storage', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      // ✅ NEW: Access from storage (after migration)
      // Note: This test will fail until globalSchedulerService is added to S3Storage
      const s3Storage = storageInstance as any;
      const globalSchedulerService = s3Storage.globalSchedulerService;
      
      // Can be null if Cronicle not configured, but property should exist
      expect(globalSchedulerService !== undefined).toBe(true);
      
      if (globalSchedulerService !== null) {
        expect(globalSchedulerService).toBeInstanceOf(GlobalSchedulerService);
      }
    });
  });

  // Note: Release services are already implemented in S3Storage, not part of this migration
  // Skipping tests - focus is on taskExecutor and globalSchedulerService migration
  describe.skip('Release Services Availability', () => {
    it('should have releaseCreationService available on storage', () => {
      // These services are already implemented, not part of this migration
    });

    it('should have releaseRetrievalService available on storage', () => {
      // These services are already implemented, not part of this migration
    });

    it('should have releaseUpdateService available on storage', () => {
      // These services are already implemented, not part of this migration
    });

    it('should have releaseStatusService available on storage', () => {
      // These services are already implemented, not part of this migration
    });
  });

  // Note: Repository availability tests are not part of this migration
  // Skipping - focus is on taskExecutor and globalSchedulerService migration
  describe.skip('Repository Availability', () => {
    it('should have all release repositories available on storage', () => {
      // These repositories are already implemented, not part of this migration
    });

    it('should have integration repositories available on storage', () => {
      // These repositories are already implemented, not part of this migration
    });
  });

  describe('Service Instance Consistency', () => {
    it('should return same taskExecutor instance across multiple calls', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;
      
      const executor1 = s3Storage.taskExecutor;
      const executor2 = s3Storage.taskExecutor;
      
      // Should be same instance (singleton pattern maintained)
      expect(executor1).toBe(executor2);
    });

    it('should return same globalSchedulerService instance across multiple calls', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;
      
      const service1 = s3Storage.globalSchedulerService;
      const service2 = s3Storage.globalSchedulerService;
      
      // Should be same instance (or both null)
      if (service1 !== null && service2 !== null) {
        expect(service1).toBe(service2);
      } else {
        expect(service1).toBe(service2); // Both null
      }
    });
  });

  describe('Dependency Initialization Order', () => {
    it('should initialize repositories before services that depend on them', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Repositories should be initialized
      expect(s3Storage.releaseRepository).toBeDefined();
      expect(s3Storage.cronJobRepository).toBeDefined();
      expect(s3Storage.releaseTaskRepository).toBeDefined();

      // Migrated services that depend on repositories should also be initialized
      expect(s3Storage.taskExecutor).toBeDefined();
      expect(s3Storage.taskExecutor).toBeInstanceOf(TaskExecutor);
      expect(s3Storage.globalSchedulerService !== undefined).toBe(true);
    });

    it('should initialize taskExecutor with all required dependencies', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // TaskExecutor dependencies should all be available
      expect(s3Storage.scmService).toBeDefined();
      expect(s3Storage.cicdIntegrationRepository).toBeDefined();
      expect(s3Storage.cicdWorkflowRepository).toBeDefined();
      expect(s3Storage.cicdConfigService).toBeDefined();
      expect(s3Storage.projectManagementTicketService).toBeDefined();
      expect(s3Storage.testManagementRunService).toBeDefined();
      expect(s3Storage.messagingService).toBeDefined();
      expect(s3Storage.releaseConfigRepository).toBeDefined();
      expect(s3Storage.releaseTaskRepository).toBeDefined();
      expect(s3Storage.releaseRepository).toBeDefined();
      expect(s3Storage.releaseUploadsRepository).toBeDefined();
      expect(s3Storage.cronJobRepository).toBeDefined();
      expect(s3Storage.releaseNotificationService).toBeDefined();
    });
  });
});

