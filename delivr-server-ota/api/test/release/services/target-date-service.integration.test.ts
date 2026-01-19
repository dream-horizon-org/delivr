/**
 * Target Date Validation - Service Integration Tests
 * 
 * Tests the target date and slot validation at the service layer
 * with real database interactions.
 * 
 * Verifies:
 * - targetReleaseDate change validation in ReleaseUpdateService
 * - Slot validation against targetReleaseDate
 * - delayReason requirement for extending dates
 * - In-progress slot blocking for shortening dates
 */

import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Repositories
import { ReleaseRepository } from '../../../script/models/release/release.repository';
import { CronJobRepository } from '../../../script/models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../../script/models/release/release-task.repository';
import { RegressionCycleRepository } from '../../../script/models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '../../../script/models/release/release-platform-target-mapping.repository';
import { BuildRepository } from '../../../script/models/release/build.repository';

// Models
import { createReleaseModel } from '../../../script/models/release/release.sequelize.model';
import { createCronJobModel } from '../../../script/models/release/cron-job.sequelize.model';
import { createReleaseTaskModel } from '../../../script/models/release/release-task.sequelize.model';
import { createRegressionCycleModel } from '../../../script/models/release/regression-cycle.sequelize.model';
import { createPlatformTargetMappingModel } from '../../../script/models/release/platform-target-mapping.sequelize.model';
import { createBuildModel } from '../../../script/models/release/build.sequelize.model';

// Service under test
import { ReleaseUpdateService } from '../../../script/services/release/release-update.service';

// Enums & Types
import {
  ReleaseStatus,
  CronStatus,
  StageStatus,
  PauseType,
  RegressionCycleStatus
} from '../../../script/models/release/release.interface';

// Storage
import { initializeStorage } from '../../../script/storage/storage-instance';
import { createTestStorage } from '../../../test-helpers/release/test-storage';

// Database configuration
const DB_NAME = process.env.DB_NAME ?? 'codepushdb';
const DB_USER = process.env.DB_USER ?? 'root';
const DB_PASS = process.env.DB_PASS ?? 'root';
const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT ?? '3306', 10);

const SKIP_DB_TESTS = process.env.SKIP_DB_TESTS === 'true';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createFutureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

let cachedRepos: {
  releaseRepo: ReleaseRepository;
  cronJobRepo: CronJobRepository;
  releaseTaskRepo: ReleaseTaskRepository;
  regressionCycleRepo: RegressionCycleRepository;
  platformMappingRepo: ReleasePlatformTargetMappingRepository;
  buildRepo: BuildRepository;
} | null = null;

function getOrCreateRepos(sequelize: Sequelize) {
  if (!cachedRepos) {
    const releaseModel = createReleaseModel(sequelize);
    const cronJobModel = createCronJobModel(sequelize);
    const releaseTaskModel = createReleaseTaskModel(sequelize);
    const regressionCycleModel = createRegressionCycleModel(sequelize);
    const platformMappingModel = createPlatformTargetMappingModel(sequelize);
    const buildModel = createBuildModel(sequelize);

    cachedRepos = {
      releaseRepo: new ReleaseRepository(releaseModel),
      cronJobRepo: new CronJobRepository(cronJobModel),
      releaseTaskRepo: new ReleaseTaskRepository(releaseTaskModel),
      regressionCycleRepo: new RegressionCycleRepository(regressionCycleModel),
      platformMappingRepo: new ReleasePlatformTargetMappingRepository(platformMappingModel as any),
      buildRepo: new BuildRepository(buildModel as any)
    };
  }
  return cachedRepos;
}

async function createTestRelease(
  releaseRepo: ReleaseRepository,
  options: {
    id?: string;
    tenantId: string;
    accountId: string;
    status?: ReleaseStatus;
    targetReleaseDate: Date;
  }
) {
  const id = options.id ?? uuidv4();
  return releaseRepo.create({
    id,
    releaseId: `REL-TARGET-DATE-${Date.now()}`,
    releaseConfigId: null,
    tenantId: options.tenantId,
    status: options.status ?? ReleaseStatus.IN_PROGRESS,
    type: 'MINOR',
    branch: `release/v${Date.now()}`,
    baseBranch: 'master',
    baseReleaseId: null,
    kickOffReminderDate: null,
    kickOffDate: new Date(),
    targetReleaseDate: options.targetReleaseDate,
    releaseDate: null,
    hasManualBuildUpload: false,
    createdByAccountId: options.accountId,
    releasePilotAccountId: options.accountId,
    lastUpdatedByAccountId: options.accountId
  });
}

async function createTestCronJob(
  cronJobRepo: CronJobRepository,
  options: {
    releaseId: string;
    accountId: string;
    upcomingRegressions?: Array<{ date: string; config?: Record<string, unknown> }>;
    stage2Status?: StageStatus;
    stage3Status?: StageStatus;
  }
) {
  const id = uuidv4();
  return cronJobRepo.create({
    id,
    releaseId: options.releaseId,
    cronCreatedByAccountId: options.accountId,
    cronStatus: CronStatus.RUNNING,
    stage1Status: StageStatus.COMPLETED,
    stage2Status: options.stage2Status ?? StageStatus.IN_PROGRESS,
    stage3Status: options.stage3Status ?? StageStatus.PENDING,
    pauseType: PauseType.NONE,
    cronConfig: { enabled: true },
    upcomingRegressions: options.upcomingRegressions ?? [],
    autoTransitionToStage2: true,
    autoTransitionToStage3: true
  });
}

async function createTestRegressionCycle(
  regressionCycleRepo: RegressionCycleRepository,
  options: {
    releaseId: string;
    cycleTag: string;
    status: RegressionCycleStatus;
  }
) {
  const id = uuidv4();
  return regressionCycleRepo.create({
    id,
    releaseId: options.releaseId,
    cycleTag: options.cycleTag,
    status: options.status
  });
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

(SKIP_DB_TESTS ? describe.skip : describe)('Target Date Validation - Service Integration', () => {
  let sequelize: Sequelize;
  let releaseRepo: ReleaseRepository;
  let cronJobRepo: CronJobRepository;
  let releaseTaskRepo: ReleaseTaskRepository;
  let regressionCycleRepo: RegressionCycleRepository;
  let platformMappingRepo: ReleasePlatformTargetMappingRepository;
  let buildRepo: BuildRepository;
  let updateService: ReleaseUpdateService;
  let storage: any;

  const testTenantId = 'test-tenant-target-date';
  const testAccountId = 'test-account-target-date';

  beforeAll(async () => {
    try {
      sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST,
        port: DB_PORT,
        dialect: 'mysql',
        logging: false,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
      });

      await sequelize.authenticate();
      console.log('✅ Database connected for target date service tests');

      const repos = getOrCreateRepos(sequelize);
      releaseRepo = repos.releaseRepo;
      cronJobRepo = repos.cronJobRepo;
      releaseTaskRepo = repos.releaseTaskRepo;
      regressionCycleRepo = repos.regressionCycleRepo;
      platformMappingRepo = repos.platformMappingRepo;
      buildRepo = repos.buildRepo;

      // Initialize storage
      const testStorage = createTestStorage(sequelize);
      initializeStorage(testStorage as any);
      storage = testStorage;

      // Create mock CronJobService (only startCronJob method is used)
      const mockCronJobService = {
        startCronJob: jest.fn().mockResolvedValue(undefined)
      } as any;

      // Mock ActivityLogService (4th parameter)
      const mockActivityLogService = {
        registerActivityLogs: jest.fn().mockResolvedValue(undefined),
        registerConfigActivityLogs: jest.fn().mockResolvedValue(undefined)
      } as any;

      // Mock ReleaseConfigService
      const mockReleaseConfigService = {
        getConfigByIdVerbose: jest.fn().mockResolvedValue(null)
      } as any;

      // Create ReleaseUpdateService with all dependencies
      updateService = new ReleaseUpdateService(
        releaseRepo,
        cronJobRepo,
        platformMappingRepo,
        mockActivityLogService,
        mockCronJobService,
        releaseTaskRepo,
        buildRepo,
        regressionCycleRepo,
        mockReleaseConfigService
      );
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
      console.log('✅ Database connection closed');
    }
  });

  beforeEach(async () => {
    // Clean up test data
    try {
      await sequelize.query(`DELETE FROM regression_cycles WHERE releaseId LIKE 'test-release-target-%'`);
      await sequelize.query(`DELETE FROM release_tasks WHERE releaseId LIKE 'test-release-target-%'`);
      await sequelize.query(`DELETE FROM cron_jobs WHERE releaseId LIKE 'test-release-target-%'`);
      await sequelize.query(`DELETE FROM releases WHERE id LIKE 'test-release-target-%'`);
    } catch (error) {
      // Tables might not exist yet
    }
  });

  // ============================================================================
  // TARGET DATE CHANGE - EXTENDING
  // ============================================================================

  describe('Extending targetReleaseDate', () => {
    it('should reject extending without delayReason', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const originalTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20); // Extending

      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate: originalTargetDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: []
      });

      // Act & Assert
      await expect(updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          targetReleaseDate: newTargetDate.toISOString()
          // No delayReason provided
        }
      })).rejects.toThrow('delayReason is required when extending targetReleaseDate');
    });

    it('should accept extending with delayReason', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const originalTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20); // Extending

      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate: originalTargetDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: []
      });

      // Act
      const result = await updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          targetReleaseDate: newTargetDate.toISOString(),
          delayReason: 'Additional security testing required'
        }
      });

      // Assert
      expect(result).toBeDefined();
      // DB stores with second precision, so compare within 1000ms
      const timeDiff = Math.abs((result.targetReleaseDate?.getTime() ?? 0) - newTargetDate.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  // ============================================================================
  // TARGET DATE CHANGE - SHORTENING
  // ============================================================================

  describe('Shortening targetReleaseDate', () => {
    it('should reject shortening when existing slots exceed new date', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const originalTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(8); // Shortening significantly
      const slotDate = createFutureDate(10); // This slot exceeds the new target

      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate: originalTargetDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: [
          { date: slotDate.toISOString(), config: {} }
        ]
      });

      // Act & Assert
      await expect(updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          targetReleaseDate: newTargetDate.toISOString()
        }
      })).rejects.toThrow('exceed new targetReleaseDate');
    });

    it('should reject shortening when any slot cycle is IN_PROGRESS', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const originalTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(15); // Shortening
      const slotDate = createFutureDate(5); // Slot is valid but cycle is in progress

      const release = await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate: originalTargetDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: [
          { date: slotDate.toISOString(), config: {} }
        ]
      });
      // Create an IN_PROGRESS regression cycle
      await createTestRegressionCycle(regressionCycleRepo, {
        releaseId,
        cycleTag: '1.0.0-RC1',
        status: RegressionCycleStatus.IN_PROGRESS
      });

      // Act & Assert
      await expect(updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          targetReleaseDate: newTargetDate.toISOString()
        }
      })).rejects.toThrow('in progress');
    });

    it('should accept shortening when all slots are before new date and not in progress', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const originalTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(15); // Shortening
      const slotDate = createFutureDate(5); // Valid - before new target

      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate: originalTargetDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: [
          { date: slotDate.toISOString(), config: {} }
        ]
      });

      // Act
      const result = await updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          targetReleaseDate: newTargetDate.toISOString()
          // No delayReason needed for shortening
        }
      });

      // Assert
      expect(result).toBeDefined();
      // DB stores with second precision, so compare within 1000ms
      const timeDiff = Math.abs((result.targetReleaseDate?.getTime() ?? 0) - newTargetDate.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  // ============================================================================
  // SLOT UPDATES - VALIDATION AGAINST TARGET DATE
  // ============================================================================

  describe('Slot Updates Against targetReleaseDate', () => {
    it('should reject adding slot with date >= targetReleaseDate', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const targetReleaseDate = createFutureDate(10);
      const invalidSlotDate = createFutureDate(15); // After target

      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: [],
        stage3Status: StageStatus.PENDING
      });

      // Act & Assert
      await expect(updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          cronJob: {
            upcomingRegressions: [
              { date: invalidSlotDate.toISOString(), config: {} }
            ]
          }
        }
      })).rejects.toThrow('before targetReleaseDate');
    });

    it('should accept adding slot with date < targetReleaseDate', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const targetReleaseDate = createFutureDate(15);
      const validSlotDate = createFutureDate(5); // Before target

      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: [],
        stage3Status: StageStatus.PENDING
      });

      // Act
      const result = await updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          cronJob: {
            upcomingRegressions: [
              { date: validSlotDate.toISOString(), config: {} }
            ]
          }
        }
      });

      // Assert
      expect(result).toBeDefined();
    });

    it('should reject if any slot in array exceeds targetReleaseDate', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const targetReleaseDate = createFutureDate(10);
      const validSlotDate = createFutureDate(5);
      const invalidSlotDate = createFutureDate(12); // After target

      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: [],
        stage3Status: StageStatus.PENDING
      });

      // Act & Assert
      await expect(updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          cronJob: {
            upcomingRegressions: [
              { date: validSlotDate.toISOString(), config: {} },
              { date: invalidSlotDate.toISOString(), config: {} } // Invalid
            ]
          }
        }
      })).rejects.toThrow('before targetReleaseDate');
    });
  });

  // ============================================================================
  // NO CHANGE SCENARIOS
  // ============================================================================

  describe('No Change Scenarios', () => {
    it('should accept update when targetReleaseDate unchanged', async () => {
      // Arrange
      const releaseId = `test-release-target-${uuidv4()}`;
      const targetReleaseDate = createFutureDate(10);

      const release = await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        targetReleaseDate
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        upcomingRegressions: []
      });

      // Fetch the stored release to get the exact date as stored in DB
      const storedRelease = await releaseRepo.findById(releaseId);
      const storedTargetDate = storedRelease!.targetReleaseDate!;

      // Act - Update with the EXACT same date from DB (no delayReason needed)
      const result = await updateService.updateRelease({
        releaseId,
        accountId: testAccountId,
        updates: {
          targetReleaseDate: storedTargetDate.toISOString()
          // No delayReason - should be OK since date is unchanged
        }
      });

      // Assert
      expect(result).toBeDefined();
    });
  });
});

