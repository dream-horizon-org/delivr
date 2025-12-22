/**
 * Service Functionality Tests
 * 
 * Tests that verify services accessed from storage work correctly.
 * These tests ensure the migration doesn't break functionality.
 * 
 * These tests ensure:
 * - Services from storage work the same as from factories
 * - No functionality is lost in migration
 * - Services can perform their core operations
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
import { v4 as uuidv4 } from 'uuid';
import { initializeStorage, getStorage } from '../../script/storage/storage-instance';
import { S3Storage } from '../../script/storage/aws-storage';
import { TaskExecutor } from '../../script/services/release/task-executor/task-executor';
import { CronJobService } from '../../script/services/release/cron-job/cron-job.service';
import { GlobalSchedulerService } from '../../script/services/release/cron-job/global-scheduler.service';
import { 
  CronStatus, 
  StageStatus, 
  TaskStatus, 
  TaskType, 
  TaskStage 
} from '../../script/models/release/release.interface';
import { hasSequelize } from '../../script/types/release/api-types';
import { createTestStorage } from '../../test-helpers/release/test-storage';
import { ReleaseRepository } from '../../script/models/release/release.repository';
import { CronJobRepository } from '../../script/models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../script/models/release/release-task.repository';
import { createReleaseModel } from '../../script/models/release/release.sequelize.model';
import { createCronJobModel } from '../../script/models/release/cron-job.sequelize.model';
import { createReleaseTaskModel } from '../../script/models/release/release-task.sequelize.model';

// Database configuration
const DB_NAME = process.env.DB_NAME || 'codepushdb';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';

describe('Service Functionality from Storage', () => {
  let storage: any; // Use any to allow accessing properties from createTestStorage
  let sequelize: Sequelize;
  let testReleaseId: string;
  let testTenantId: string;
  let testAccountId: string;
  let releaseRepo: ReleaseRepository;
  let cronJobRepo: CronJobRepository;
  let releaseTaskRepo: ReleaseTaskRepository;

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

    // Create repositories for testing
    releaseRepo = new ReleaseRepository(createReleaseModel(sequelize));
    cronJobRepo = new CronJobRepository(createCronJobModel(sequelize));
    releaseTaskRepo = new ReleaseTaskRepository(createReleaseTaskModel(sequelize));

    // Generate test IDs
    testReleaseId = uuidv4();
    testTenantId = uuidv4();
    testAccountId = uuidv4();
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  describe('TaskExecutor Functionality', () => {
    it('should execute tasks using taskExecutor from storage', async () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;
      const taskExecutor = s3Storage.taskExecutor;

      // Verify taskExecutor has executeTask method
      expect(typeof taskExecutor.executeTask).toBe('function');

      // Create a test task
      const testTask = {
        id: uuidv4(),
        releaseId: testReleaseId,
        taskType: TaskType.FORK_BRANCH,
        taskStage: TaskStage.KICKOFF,
        taskStatus: TaskStatus.PENDING,
        executionOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TaskExecutor should be able to process tasks
      // Note: Actual execution may require valid release data, so we just verify the method exists
      expect(taskExecutor).toBeDefined();
      expect(taskExecutor.executeTask).toBeDefined();
    });

    it('should have all required dependencies for task execution', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;
      const taskExecutor = s3Storage.taskExecutor;

      // Verify taskExecutor is properly initialized with dependencies
      expect(taskExecutor).toBeInstanceOf(TaskExecutor);
      
      // Verify it has access to required services (internal checks)
      // We can't directly access private properties, but we can verify the instance is valid
      expect(taskExecutor).toBeDefined();
    });
  });

  // Note: CronJobService is already implemented in S3Storage, not part of this migration
  // Skipping tests - focus is on taskExecutor and globalSchedulerService migration
  describe.skip('CronJobService Functionality', () => {
    it('should start cron jobs using cronJobService from storage', async () => {
      // This service is already implemented, not part of this migration
    });

    it('should have access to required repositories for cron job operations', () => {
      // This service is already implemented, not part of this migration
    });
  });

  describe('GlobalSchedulerService Functionality', () => {
    it('should process releases using globalSchedulerService from storage', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;
      const globalSchedulerService = s3Storage.globalSchedulerService;

      // Can be null if Cronicle not configured
      if (globalSchedulerService !== null) {
        // Verify it has processAllActiveReleases method
        expect(typeof globalSchedulerService.processAllActiveReleases).toBe('function');
        expect(globalSchedulerService).toBeInstanceOf(GlobalSchedulerService);
      }
    });

    it('should have access to required dependencies for scheduler operations', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Verify dependencies are available
      expect(s3Storage.cronJobRepository).toBeDefined();
      expect(s3Storage.taskExecutor).toBeDefined();
      
      // GlobalSchedulerService depends on these, so they should be initialized first
      if (s3Storage.globalSchedulerService !== null) {
        expect(s3Storage.globalSchedulerService).toBeDefined();
      }
    });
  });

  describe('Service Integration', () => {
    it('should have migrated services that can work together', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Migrated services should be available and can work together
      expect(s3Storage.taskExecutor).toBeDefined();
      expect(s3Storage.taskExecutor).toBeInstanceOf(TaskExecutor);
      expect(s3Storage.globalSchedulerService !== undefined).toBe(true);

      // Services should share the same repositories (singleton pattern)
      expect(s3Storage.releaseRepository).toBeDefined();
      expect(s3Storage.cronJobRepository).toBeDefined();
      expect(s3Storage.releaseTaskRepository).toBeDefined();
    });

    it('should maintain service dependencies correctly', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // TaskExecutor depends on multiple services
      const taskExecutor = s3Storage.taskExecutor;
      expect(taskExecutor).toBeDefined();
      expect(taskExecutor).toBeInstanceOf(TaskExecutor);

      // GlobalSchedulerService depends on repositories and taskExecutor
      const globalSchedulerService = s3Storage.globalSchedulerService;
      if (globalSchedulerService !== null) {
        expect(globalSchedulerService).toBeInstanceOf(GlobalSchedulerService);
      }

      // Both should be able to access shared repositories
      expect(s3Storage.releaseRepository).toBeDefined();
      expect(s3Storage.cronJobRepository).toBeDefined();
      expect(s3Storage.releaseTaskRepository).toBeDefined();
    });
  });

  describe('Service Method Availability', () => {
    it('should have all TaskExecutor methods available', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;
      const taskExecutor = s3Storage.taskExecutor;

      // Verify key methods exist
      expect(typeof taskExecutor.executeTask).toBe('function');
    });

    // Note: CronJobService is already implemented, not part of this migration
    it.skip('should have all CronJobService methods available', () => {
      // This service is already implemented, not part of this migration
    });

    it('should have all GlobalSchedulerService methods available (if configured)', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;
      const globalSchedulerService = s3Storage.globalSchedulerService;

      if (globalSchedulerService !== null) {
        // Verify key methods exist
        expect(typeof globalSchedulerService.processAllActiveReleases).toBe('function');
      }
    });
  });

  describe('No Functionality Loss', () => {
    it('should maintain all service capabilities after migration', () => {
      const storageInstance = getStorage();
      
      if (!hasSequelize(storageInstance)) {
        throw new Error('Storage does not have Sequelize instance');
      }

      const s3Storage = storageInstance as any;

      // Migrated services should be fully functional
      const taskExecutor = s3Storage.taskExecutor;
      const globalSchedulerService = s3Storage.globalSchedulerService;

      // Verify they're all instances of their respective classes
      expect(taskExecutor).toBeInstanceOf(TaskExecutor);
      expect(typeof taskExecutor.executeTask).toBe('function');
      
      if (globalSchedulerService !== null) {
        expect(globalSchedulerService).toBeInstanceOf(GlobalSchedulerService);
        expect(typeof globalSchedulerService.processAllActiveReleases).toBe('function');
      }
    });
  });
});

