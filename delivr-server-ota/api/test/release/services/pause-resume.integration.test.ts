/**
 * User-Induced Pause - Integration Tests
 * 
 * Tests the pause/resume functionality with real database interactions.
 * Verifies:
 * - pauseType updates correctly in database via repositories
 * - State machine correctly skips execution when paused
 * 
 * Following TDD guidelines from MERGE_PLAN.md:
 * - Uses repositories (DTOs), not raw SQL for data creation
 * - Tests real database interactions
 */

import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
// Repositories
import { ReleaseRepository } from '../../../script/models/release/release.repository';
import { CronJobRepository } from '../../../script/models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../../script/models/release/release-task.repository';
import { RegressionCycleRepository } from '../../../script/models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '../../../script/models/release/release-platform-target-mapping.repository';
// Model creation functions
import { createReleaseModel } from '../../../script/models/release/release.sequelize.model';
import { createCronJobModel } from '../../../script/models/release/cron-job.sequelize.model';
import { createReleaseTaskModel } from '../../../script/models/release/release-task.sequelize.model';
import { createRegressionCycleModel } from '../../../script/models/release/regression-cycle.sequelize.model';
import { createPlatformTargetMappingModel } from '../../../script/models/release/platform-target-mapping.sequelize.model';
import { createReleaseUploadModel } from '../../../script/models/release/release-uploads.sequelize.model';
import { createBuildModel } from '../../../script/models/release/build.sequelize.model';
import { ReleaseUploadsRepository } from '../../../script/models/release/release-uploads.repository';
import { BuildRepository } from '../../../script/models/release/build.repository';
// State machine (for execute tests)
import { CronJobStateMachine } from '../../../script/services/release/cron-job/cron-job-state-machine';
import { TaskExecutor } from '../../../script/services/release/task-executor/task-executor';
// Enums and types
import { 
  ReleaseStatus, 
  CronStatus, 
  StageStatus,
  TaskStatus,
  TaskStage,
  TaskType,
  PauseType
} from '../../../script/models/release/release.interface';
import { initializeStorage } from '../../../script/storage/storage-instance';
import { createTestStorage } from '../../../test-helpers/release/test-storage';

// Database configuration
const DB_NAME = process.env.DB_NAME || 'codepushdb';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

// Skip tests if database is not available
const SKIP_DB_TESTS = process.env.SKIP_DB_TESTS === 'true';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Cache for repositories
let cachedRepos: {
  releaseRepo: ReleaseRepository;
  cronJobRepo: CronJobRepository;
  releaseTaskRepo: ReleaseTaskRepository;
  regressionCycleRepo: RegressionCycleRepository;
  platformMappingRepo: ReleasePlatformTargetMappingRepository;
  releaseUploadsRepo: ReleaseUploadsRepository;
  buildRepo: BuildRepository;
} | null = null;

function getOrCreateRepos(sequelize: Sequelize) {
  if (!cachedRepos) {
    const releaseModel = createReleaseModel(sequelize);
    const cronJobModel = createCronJobModel(sequelize);
    const releaseTaskModel = createReleaseTaskModel(sequelize);
    const regressionCycleModel = createRegressionCycleModel(sequelize);
    const platformMappingModel = createPlatformTargetMappingModel(sequelize);
    const releaseUploadsModel = createReleaseUploadModel(sequelize);
    const buildModel = createBuildModel(sequelize);
    
    cachedRepos = {
      releaseRepo: new ReleaseRepository(releaseModel),
      cronJobRepo: new CronJobRepository(cronJobModel),
      releaseTaskRepo: new ReleaseTaskRepository(releaseTaskModel),
      regressionCycleRepo: new RegressionCycleRepository(regressionCycleModel),
      platformMappingRepo: new ReleasePlatformTargetMappingRepository(platformMappingModel),
      releaseUploadsRepo: new ReleaseUploadsRepository(sequelize, releaseUploadsModel),
      buildRepo: new BuildRepository(buildModel)
    };
  }
  return cachedRepos;
}

// Helper to create release with required fields
async function createTestRelease(
  releaseRepo: ReleaseRepository,
  options: {
    id?: string;
    tenantId: string;
    accountId: string;
    status?: ReleaseStatus;
  }
) {
  const id = options.id ?? uuidv4();
  return releaseRepo.create({
    id,
    releaseId: `REL-${Date.now()}`,
    releaseConfigId: null,
    tenantId: options.tenantId,
    status: options.status ?? ReleaseStatus.IN_PROGRESS,
    type: 'MINOR',
    branch: `release/v${Date.now()}`,
    baseBranch: 'master',
    baseReleaseId: null,
    kickOffReminderDate: null,
    kickOffDate: new Date(),
    targetReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    releaseDate: null,
    hasManualBuildUpload: false,
    createdByAccountId: options.accountId,
    releasePilotAccountId: options.accountId,
    lastUpdatedByAccountId: options.accountId
  });
}

// Helper to create cron job with pauseType support
async function createTestCronJob(
  cronJobRepo: CronJobRepository,
  options: {
    releaseId: string;
    accountId: string;
    cronStatus?: CronStatus;
    stage1Status?: StageStatus;
    pauseType?: PauseType;
  }
) {
  const id = uuidv4();
  return cronJobRepo.create({
    id,
    releaseId: options.releaseId,
    cronCreatedByAccountId: options.accountId,
    cronStatus: options.cronStatus ?? CronStatus.RUNNING,
    stage1Status: options.stage1Status ?? StageStatus.IN_PROGRESS,
    stage2Status: StageStatus.PENDING,
    stage3Status: StageStatus.PENDING,
    pauseType: options.pauseType ?? PauseType.NONE,
    cronConfig: { enabled: true },
    upcomingRegressions: [],
    autoTransitionToStage2: true,
    autoTransitionToStage3: false
  });
}

// Helper to create release task
async function createTestTask(
  releaseTaskRepo: ReleaseTaskRepository,
  options: {
    releaseId: string;
    taskType: TaskType;
    stage: TaskStage;
    taskStatus?: TaskStatus;
  }
) {
  const id = uuidv4();
  return releaseTaskRepo.create({
    id,
    releaseId: options.releaseId,
    taskType: options.taskType,
    stage: options.stage,
    taskStatus: options.taskStatus ?? TaskStatus.PENDING
  });
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

(SKIP_DB_TESTS ? describe.skip : describe)('User-Induced Pause - Integration Tests', () => {
  let sequelize: Sequelize;
  let releaseRepo: ReleaseRepository;
  let cronJobRepo: CronJobRepository;
  let releaseTaskRepo: ReleaseTaskRepository;
  let regressionCycleRepo: RegressionCycleRepository;
  let platformMappingRepo: ReleasePlatformTargetMappingRepository;
  let releaseUploadsRepo: ReleaseUploadsRepository;
  let buildRepo: BuildRepository;
  let storage: any;
  
  const testTenantId = 'test-tenant-pause';
  const testAccountId = 'test-account-pause';

  beforeAll(async () => {
    try {
      // Initialize database connection
      sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST,
        port: DB_PORT,
        dialect: 'mysql',
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      });

      await sequelize.authenticate();
      console.log('✅ Database connection established for pause/resume integration tests');

      // Initialize repositories
      const repos = getOrCreateRepos(sequelize);
      releaseRepo = repos.releaseRepo;
      cronJobRepo = repos.cronJobRepo;
      releaseTaskRepo = repos.releaseTaskRepo;
      regressionCycleRepo = repos.regressionCycleRepo;
      platformMappingRepo = repos.platformMappingRepo;
      releaseUploadsRepo = repos.releaseUploadsRepo;
      buildRepo = repos.buildRepo;

      // Initialize storage singleton
      const testStorage = createTestStorage(sequelize);
      initializeStorage(testStorage as any);
      storage = testStorage;
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
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
    // Clean up test data before each test
    try {
      await sequelize.query(`DELETE FROM release_tasks WHERE releaseId LIKE 'test-release-pause-%'`);
      await sequelize.query(`DELETE FROM cron_jobs WHERE releaseId LIKE 'test-release-pause-%'`);
      await sequelize.query(`DELETE FROM releases WHERE id LIKE 'test-release-pause-%'`);
    } catch (error) {
      // Tables might not exist yet
    }
  });

  // ============================================================================
  // CATEGORY 1: pauseType Database Updates
  // ============================================================================

  describe('pauseType Database Updates', () => {
    it('should update pauseType to USER_REQUESTED in database', async () => {
      // Arrange: Create release and cron job
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.NONE
      });

      // Act: Update pauseType directly via repository
      await cronJobRepo.update(cronJob.id, {
        pauseType: PauseType.USER_REQUESTED
      });

      // Assert: Database should have updated pauseType
      const updatedCronJob = await cronJobRepo.findByReleaseId(releaseId);
      expect(updatedCronJob).not.toBeNull();
      expect(updatedCronJob?.pauseType).toBe(PauseType.USER_REQUESTED);
      // cronStatus should still be RUNNING (scheduler keeps running)
      expect(updatedCronJob?.cronStatus).toBe(CronStatus.RUNNING);
    });

    it('should update pauseType to NONE when resuming', async () => {
      // Arrange: Create paused release
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        pauseType: PauseType.USER_REQUESTED // Paused by user
      });

      // Act: Resume by setting pauseType to NONE
      await cronJobRepo.update(cronJob.id, {
        pauseType: PauseType.NONE
      });

      // Assert: Database should have updated pauseType
      const updatedCronJob = await cronJobRepo.findByReleaseId(releaseId);
      expect(updatedCronJob?.pauseType).toBe(PauseType.NONE);
    });

    it('should persist AWAITING_STAGE_TRIGGER pauseType', async () => {
      // Arrange: Create release and cron job
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId
      });
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        stage1Status: StageStatus.COMPLETED,
        pauseType: PauseType.NONE
      });

      // Act: Simulate stage completion setting AWAITING_STAGE_TRIGGER
      await cronJobRepo.update(cronJob.id, {
        stage1Status: StageStatus.COMPLETED,
        pauseType: PauseType.AWAITING_STAGE_TRIGGER
      });

      // Assert: pauseType should be AWAITING_STAGE_TRIGGER
      const updatedCronJob = await cronJobRepo.findByReleaseId(releaseId);
      expect(updatedCronJob?.pauseType).toBe(PauseType.AWAITING_STAGE_TRIGGER);
      expect(updatedCronJob?.stage1Status).toBe(StageStatus.COMPLETED);
    });

    it('should persist TASK_FAILURE pauseType', async () => {
      // Arrange: Create release
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId
      });
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        pauseType: PauseType.NONE
      });

      // Act: Simulate task failure setting TASK_FAILURE
      await cronJobRepo.update(cronJob.id, {
        pauseType: PauseType.TASK_FAILURE
      });

      // Assert: pauseType should be TASK_FAILURE
      const updatedCronJob = await cronJobRepo.findByReleaseId(releaseId);
      expect(updatedCronJob?.pauseType).toBe(PauseType.TASK_FAILURE);
    });
  });

  // ============================================================================
  // CATEGORY 2: State Machine Pause Skip Tests
  // ============================================================================

  describe('StateMachine - Pause Skip Integration', () => {
    it('should skip execution when pauseType is USER_REQUESTED', async () => {
      // Arrange: Create paused release with pending tasks
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        status: ReleaseStatus.IN_PROGRESS
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        cronStatus: CronStatus.RUNNING,
        stage1Status: StageStatus.IN_PROGRESS,
        pauseType: PauseType.USER_REQUESTED // Paused
      });
      await createTestTask(releaseTaskRepo, {
        releaseId,
        taskType: TaskType.FORK_BRANCH,
        stage: TaskStage.KICKOFF,
        taskStatus: TaskStatus.PENDING
      });

      // Create mock task executor to track if it was called
      const mockTaskExecutor = {
        executeTask: jest.fn().mockResolvedValue(undefined)
      } as unknown as TaskExecutor;

      // Create state machine
      const stateMachine = new CronJobStateMachine(
        releaseId,
        cronJobRepo,
        releaseRepo,
        releaseTaskRepo,
        regressionCycleRepo,
        mockTaskExecutor,
        storage,
        platformMappingRepo,
        releaseUploadsRepo,  // ✅ Required - actively initialized in aws-storage.ts
        buildRepo  // ✅ Required - actively initialized in aws-storage.ts
      );
      await stateMachine.initialize();

      // Act: Execute state machine
      await stateMachine.execute();

      // Assert: Task executor should NOT have been called (skipped due to pause)
      expect(mockTaskExecutor.executeTask).not.toHaveBeenCalled();
    });

    it('should skip execution when pauseType is AWAITING_STAGE_TRIGGER', async () => {
      // Arrange: Create release waiting for stage trigger
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        status: ReleaseStatus.IN_PROGRESS
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        cronStatus: CronStatus.RUNNING,
        stage1Status: StageStatus.COMPLETED,
        pauseType: PauseType.AWAITING_STAGE_TRIGGER // Waiting for manual trigger
      });

      // Create mock task executor
      const mockTaskExecutor = {
        executeTask: jest.fn().mockResolvedValue(undefined)
      } as unknown as TaskExecutor;

      // Create state machine
      const stateMachine = new CronJobStateMachine(
        releaseId,
        cronJobRepo,
        releaseRepo,
        releaseTaskRepo,
        regressionCycleRepo,
        mockTaskExecutor,
        storage,
        platformMappingRepo,
        releaseUploadsRepo,  // ✅ Required - actively initialized in aws-storage.ts
        buildRepo  // ✅ Required - actively initialized in aws-storage.ts
      );
      await stateMachine.initialize();

      // Act: Execute state machine
      await stateMachine.execute();

      // Assert: Task executor should NOT have been called
      expect(mockTaskExecutor.executeTask).not.toHaveBeenCalled();
    });

    it('should skip execution when pauseType is TASK_FAILURE', async () => {
      // Arrange: Create release paused due to task failure
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        status: ReleaseStatus.IN_PROGRESS
      });
      await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        cronStatus: CronStatus.RUNNING,
        stage1Status: StageStatus.IN_PROGRESS,
        pauseType: PauseType.TASK_FAILURE // Paused due to failure
      });

      // Create mock task executor
      const mockTaskExecutor = {
        executeTask: jest.fn().mockResolvedValue(undefined)
      } as unknown as TaskExecutor;

      // Create state machine
      const stateMachine = new CronJobStateMachine(
        releaseId,
        cronJobRepo,
        releaseRepo,
        releaseTaskRepo,
        regressionCycleRepo,
        mockTaskExecutor,
        storage,
        platformMappingRepo,
        releaseUploadsRepo,  // ✅ Required - actively initialized in aws-storage.ts
        buildRepo  // ✅ Required - actively initialized in aws-storage.ts
      );
      await stateMachine.initialize();

      // Act: Execute state machine
      await stateMachine.execute();

      // Assert: Task executor should NOT have been called
      expect(mockTaskExecutor.executeTask).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CATEGORY 3: Full Pause/Resume Cycle Test
  // ============================================================================

  describe('Full Pause/Resume Cycle', () => {
    it('should complete full pause → verify paused → resume → verify active cycle', async () => {
      // Arrange: Create active release
      const releaseId = `test-release-pause-${uuidv4()}`;
      await createTestRelease(releaseRepo, {
        id: releaseId,
        tenantId: testTenantId,
        accountId: testAccountId,
        status: ReleaseStatus.IN_PROGRESS
      });
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId,
        accountId: testAccountId,
        cronStatus: CronStatus.RUNNING,
        pauseType: PauseType.NONE
      });

      // Step 1: Verify initial state
      let currentCronJob = await cronJobRepo.findByReleaseId(releaseId);
      expect(currentCronJob?.pauseType).toBe(PauseType.NONE);

      // Step 2: Pause (simulate service call)
      await cronJobRepo.update(cronJob.id, {
        pauseType: PauseType.USER_REQUESTED
      });

      // Step 3: Verify paused state
      currentCronJob = await cronJobRepo.findByReleaseId(releaseId);
      expect(currentCronJob?.pauseType).toBe(PauseType.USER_REQUESTED);
      expect(currentCronJob?.cronStatus).toBe(CronStatus.RUNNING); // Scheduler still running

      // Step 4: Resume (simulate service call)
      await cronJobRepo.update(cronJob.id, {
        pauseType: PauseType.NONE
      });

      // Step 5: Verify active state
      currentCronJob = await cronJobRepo.findByReleaseId(releaseId);
      expect(currentCronJob?.pauseType).toBe(PauseType.NONE);
      expect(currentCronJob?.cronStatus).toBe(CronStatus.RUNNING);

      console.log('✅ Full pause/resume cycle completed successfully');
    });
  });
});
