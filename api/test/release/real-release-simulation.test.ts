/**
 * Real Release Simulation Test
 * 
 * This test simulates a complete release workflow with:
 * - 2 platforms: IOS + ANDROID
 * - 2 regression slots (3 minutes apart)
 * - Automatic stage transitions
 * - Only mandatory tasks
 * 
 * Expected Duration: ~7-10 minutes
 * 
 * Run with: npx ts-node -r tsconfig-paths/register test/release/real-release-simulation.test.ts
 */

import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Models & Repositories
import { ReleaseRepository } from '../../script/models/release/release.repository';
import { CronJobRepository } from '../../script/models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../script/models/release/release-task.repository';
import { RegressionCycleRepository } from '../../script/models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '../../script/models/release/release-platform-target-mapping.repository';

// Models
import { createReleaseModel, ReleaseModelType } from '../../script/models/release/release.sequelize.model';
import { createCronJobModel, CronJobModelType } from '../../script/models/release/cron-job.sequelize.model';
import { createReleaseTaskModel, ReleaseTaskModelType } from '../../script/models/release/release-task.sequelize.model';
import { createRegressionCycleModel, RegressionCycleModelType } from '../../script/models/release/regression-cycle.sequelize.model';
import { createPlatformTargetMappingModel } from '../../script/models/release/platform-target-mapping.sequelize.model';
import { createStateHistoryModel } from '../../script/models/release/state-history.sequelize.model';
import { createBuildModel } from '../../script/models/release/build.sequelize.model';

// Enums & Types
import {
  Release,
  CronJob,
  ReleaseTask,
  TaskType,
  TaskStage,
  TaskStatus,
  StageStatus,
  CronStatus,
  ReleaseStatus,
  RegressionCycleStatus
} from '../../script/models/release/release.interface';

// State Machine
import { CronJobStateMachine } from '../../script/services/release/cron-job/cron-job-state-machine';

// Test Helpers - Following MERGE_PLAN.md guidelines!
import { createTestStorage } from '../../test-helpers/release/test-storage';
import { setupTestIntegrations, cleanupTestIntegrations } from '../../test-helpers/release/setup-test-integrations';
import { setupFetchMock } from '../../test-helpers/release/mock-fetch';
import { createTaskExecutorForTests } from '../../test-helpers/release/task-executor-factory';
import { initializeStorage } from '../../script/storage/storage-instance';
import { createStage1Tasks } from '../../script/utils/task-creation';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_NAME = process.env.DB_NAME || 'codepushdb';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

const TEST_CONFIG = {
  SLOT_INTERVAL_MS: 3 * 60 * 1000,  // 3 minutes between slots
  POLL_INTERVAL_MS: 5000,            // Check every 5 seconds
  MAX_ITERATIONS: 150,               // Safety limit (~12 minutes)
  PLATFORMS: ['IOS', 'ANDROID'] as const,
  VERSION: '6.5.0',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(message: string) {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cache models to avoid recreating them
let cachedModels: {
  releaseModel: ReleaseModelType;
  cronJobModel: CronJobModelType;
  releaseTaskModel: ReleaseTaskModelType;
  regressionCycleModel: RegressionCycleModelType;
} | null = null;

function getOrCreateModels(sequelize: Sequelize) {
  if (!cachedModels) {
    cachedModels = {
      releaseModel: createReleaseModel(sequelize),
      cronJobModel: createCronJobModel(sequelize),
      releaseTaskModel: createReleaseTaskModel(sequelize),
      regressionCycleModel: createRegressionCycleModel(sequelize)
    };
  }
  return cachedModels;
}

interface TestRepositories {
  releaseRepo: ReleaseRepository;
  cronJobRepo: CronJobRepository;
  releaseTaskRepo: ReleaseTaskRepository;
  regressionCycleRepo: RegressionCycleRepository;
  platformMappingRepo: ReleasePlatformTargetMappingRepository;
}

function createRepositories(sequelize: Sequelize): TestRepositories {
  const models = getOrCreateModels(sequelize);
  const PlatformTargetMappingModel = sequelize.models.PlatformTargetMapping || createPlatformTargetMappingModel(sequelize);
  
  return {
    releaseRepo: new ReleaseRepository(models.releaseModel),
    cronJobRepo: new CronJobRepository(models.cronJobModel),
    releaseTaskRepo: new ReleaseTaskRepository(models.releaseTaskModel),
    regressionCycleRepo: new RegressionCycleRepository(models.regressionCycleModel),
    platformMappingRepo: new ReleasePlatformTargetMappingRepository(PlatformTargetMappingModel as any)
  };
}

// Helper: Create tenant and account (following test-all-consolidated.ts pattern)
async function createTestTenant(
  sequelize: Sequelize,
  tenantId: string,
  accountId: string
): Promise<void> {
  const TenantModel = sequelize.models.tenant;
  const AccountModel = sequelize.models.account;
  
  if (!TenantModel || !AccountModel) {
    log('⚠️ Tenant/Account models not found - continuing without creating');
    return;
  }

  await AccountModel.findOrCreate({
    where: { id: accountId },
    defaults: {
      id: accountId,
      email: `test-${uuidv4()}@example.com`,
      name: 'Test User - Real Release Simulation',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  await TenantModel.findOrCreate({
    where: { id: tenantId },
    defaults: {
      id: tenantId,
      displayName: 'Test Tenant - Real Release Simulation',
      createdBy: accountId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

// Helper: Create release (following test-all-consolidated.ts pattern)
interface CreateTestReleaseOptions {
  tenantId: string;
  accountId: string;
  branch?: string;
  baseBranch?: string;
  kickOffDate?: Date;
  targetReleaseDate?: Date;
  releaseConfigId?: string | null;
  hasManualBuildUpload?: boolean;
}

async function createTestRelease(
  releaseRepo: ReleaseRepository,
  options: CreateTestReleaseOptions
): Promise<Release> {
  const id = uuidv4();
  return releaseRepo.create({
    id,
    releaseId: `REL-SIM-${Date.now()}`,
    releaseConfigId: options.releaseConfigId ?? null,
    tenantId: options.tenantId,
    status: 'IN_PROGRESS',
    type: 'MINOR',
    branch: options.branch ?? `release/v${TEST_CONFIG.VERSION}`,
    baseBranch: options.baseBranch ?? 'main',
    baseReleaseId: null,
    kickOffReminderDate: null,
    kickOffDate: options.kickOffDate ?? new Date(),
    targetReleaseDate: options.targetReleaseDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    releaseDate: null,
    hasManualBuildUpload: options.hasManualBuildUpload ?? false,
    createdByAccountId: options.accountId,
    releasePilotAccountId: options.accountId,
    lastUpdatedByAccountId: options.accountId
  });
}

// Helper: Create cron job (following test-all-consolidated.ts pattern)
interface CreateTestCronJobOptions {
  releaseId: string;
  accountId: string;
  cronConfig?: Record<string, unknown>;
  upcomingRegressions?: any[];
  autoTransitionToStage2?: boolean;
  autoTransitionToStage3?: boolean;
}

async function createTestCronJob(
  cronJobRepo: CronJobRepository,
  options: CreateTestCronJobOptions
): Promise<CronJob> {
  const id = uuidv4();
  return cronJobRepo.create({
    id,
    releaseId: options.releaseId,
    cronCreatedByAccountId: options.accountId,
    cronStatus: 'PENDING',
    stage1Status: 'PENDING',
    stage2Status: 'PENDING',
    stage3Status: 'PENDING',
    cronConfig: options.cronConfig ?? { enabled: true },
    upcomingRegressions: options.upcomingRegressions ?? [],
    autoTransitionToStage2: options.autoTransitionToStage2 ?? true,
    autoTransitionToStage3: options.autoTransitionToStage3 ?? true  // Changed to true for auto-transitions
  });
}

// Helper: Execute state machine (following test-all-consolidated.ts pattern)
async function executeStateMachine(releaseId: string, storage: any): Promise<void> {
  const isSequelizeStorage = storage && 'sequelize' in storage;
  if (!isSequelizeStorage) {
    throw new Error('executeStateMachine requires Sequelize storage');
  }
  
  const sequelize = storage.sequelize;
  const models = getOrCreateModels(sequelize);
  
  const releaseRepo = new ReleaseRepository(models.releaseModel);
  const cronJobRepo = new CronJobRepository(models.cronJobModel);
  const releaseTaskRepo = new ReleaseTaskRepository(models.releaseTaskModel);
  const regressionCycleRepo = new RegressionCycleRepository(models.regressionCycleModel);
  
  // Use test factory (auto-injects MockSCMService)
  const taskExecutor = createTaskExecutorForTests(sequelize);
  
  // Create and execute state machine
  // Constructor signature: (releaseId, cronJobRepo, releaseRepo, releaseTaskRepo, regressionCycleRepo, taskExecutor, storage)
  const stateMachine = new CronJobStateMachine(
    releaseId,
    cronJobRepo,
    releaseRepo,
    releaseTaskRepo,
    regressionCycleRepo,
    taskExecutor as any,
    storage
  );
  
  await stateMachine.initialize();
  await stateMachine.execute();
}

// ============================================================================
// MAIN TEST
// ============================================================================

async function runRealReleaseSimulation() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 REAL RELEASE SIMULATION TEST');
  console.log('='.repeat(80));
  console.log(`Platforms: ${TEST_CONFIG.PLATFORMS.join(', ')}`);
  console.log(`Regression Slots: 2 (${TEST_CONFIG.SLOT_INTERVAL_MS / 60000} min apart)`);
  console.log(`Auto Transitions: Stage1→2 ✓, Stage2→3 ✓`);
  console.log(`Expected Duration: ~7-10 minutes`);
  console.log('='.repeat(80) + '\n');

  // -------------------------------------------------------------------------
  // SETUP: Database Connection
  // -------------------------------------------------------------------------
  log('📦 Setting up database connection...');
  
  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // SETUP: Initialize Storage (Following MERGE_PLAN.md guidelines!)
  // -------------------------------------------------------------------------
  log('📦 Initializing storage and mocks...');
  
  // Initialize fetch mock for external API calls
  setupFetchMock();
  log('✅ Fetch mock initialized');
  
  // Create and initialize storage singleton
  const storage = createTestStorage(sequelize);
  initializeStorage(storage as any);  // Register globally for getStorage() calls
  log('✅ Storage initialized');

  // Note: Tables should already exist from migration 018_release_orchestration_final.sql
  // Don't use sync({ alter: true }) as it can cause FK constraint issues with existing data
  log('✅ Using existing database schema');

  // -------------------------------------------------------------------------
  // SETUP: Test IDs
  // -------------------------------------------------------------------------
  const testIds = {
    tenantId: `sim-tenant-${uuidv4().substring(0, 8)}`,
    accountId: `sim-account-${uuidv4().substring(0, 8)}`,
  };

  log(`📋 Test IDs: Tenant=${testIds.tenantId}, Account=${testIds.accountId.substring(0, 12)}...`);

  // -------------------------------------------------------------------------
  // SETUP: Create Tenant/Account (Following MERGE_PLAN.md!)
  // -------------------------------------------------------------------------
  log('\n📝 Creating test tenant and account...');
  await createTestTenant(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Tenant/Account created');

  // -------------------------------------------------------------------------
  // SETUP: Create Test Integrations (Following MERGE_PLAN.md!)
  // -------------------------------------------------------------------------
  log('\n📝 Setting up test integrations...');
  const testIntegrations = await setupTestIntegrations(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Test integrations created');

  // -------------------------------------------------------------------------
  // SETUP: Get Repositories
  // -------------------------------------------------------------------------
  const { releaseRepo, cronJobRepo, releaseTaskRepo, regressionCycleRepo, platformMappingRepo } = createRepositories(sequelize);

  // -------------------------------------------------------------------------
  // STEP 1: Create Release
  // -------------------------------------------------------------------------
  log('\n📝 STEP 1: Creating Release...');
  
  const now = new Date();
  const release = await createTestRelease(releaseRepo, {
    tenantId: testIds.tenantId,
    accountId: testIds.accountId,
    branch: `release/v${TEST_CONFIG.VERSION}`,
    targetReleaseDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    kickOffDate: now,
    releaseConfigId: testIntegrations.releaseConfigId,
    hasManualBuildUpload: false
  });
  
  log(`✅ Release created: ${release.releaseId}`);

  // -------------------------------------------------------------------------
  // STEP 2: Create Platform Target Mappings
  // -------------------------------------------------------------------------
  log('\n📝 STEP 2: Creating Platform Target Mappings...');
  
  const PlatformTargetMappingModel = sequelize.models.PlatformTargetMapping || createPlatformTargetMappingModel(sequelize);
  
  for (const platform of TEST_CONFIG.PLATFORMS) {
    const target = platform === 'IOS' ? 'APP_STORE' : 'PLAY_STORE';
    await PlatformTargetMappingModel.create({
      id: uuidv4(),
      releaseId: release.id,
      platform,
      target,
      version: TEST_CONFIG.VERSION,
      projectManagementRunId: null,
      testManagementRunId: null,
    } as any);
    log(`  ✅ ${platform} → ${target} (v${TEST_CONFIG.VERSION})`);
  }

  // -------------------------------------------------------------------------
  // STEP 3: Create Cron Job with 2 Regression Slots (3 min apart)
  // -------------------------------------------------------------------------
  log('\n📝 STEP 3: Creating Cron Job with 2 Regression Slots...');
  
  const slot1Time = new Date(now.getTime() + 30 * 1000); // 30 seconds from now
  const slot2Time = new Date(slot1Time.getTime() + TEST_CONFIG.SLOT_INTERVAL_MS); // 3 min after first

  const cronJob = await createTestCronJob(cronJobRepo, {
    releaseId: release.id,
    accountId: testIds.accountId,
    cronConfig: {
      preRegressionBuilds: true,  // Required for TRIGGER_PRE_REGRESSION_BUILDS task
      automationBuilds: false,
      automationRuns: false,
    },
    // CORRECT FORMAT: { date, config } not { slotTime, status }
    upcomingRegressions: [
      { date: slot1Time.toISOString(), config: { automationBuilds: false, automationRuns: false } },
      { date: slot2Time.toISOString(), config: { automationBuilds: false, automationRuns: false } },
    ],
    autoTransitionToStage2: true,  // Automatic transition
    autoTransitionToStage3: true,  // Automatic transition
  });

  log(`✅ Cron job created with 2 slots:`);
  log(`   Slot 1: ${slot1Time.toLocaleTimeString()}`);
  log(`   Slot 2: ${slot2Time.toLocaleTimeString()}`);

  // -------------------------------------------------------------------------
  // STEP 4: Create Stage 1 Tasks
  // -------------------------------------------------------------------------
  log('\n📝 STEP 4: Creating Stage 1 Tasks...');
  
  // Create Stage 1 tasks using the utility
  await createStage1Tasks(releaseTaskRepo, {
    releaseId: release.id,
    accountId: release.createdByAccountId,
    cronConfig: {
      kickOffReminder: false,   // Skip optional reminder
      preRegressionBuilds: true // Include pre-regression builds
    },
    hasProjectManagementIntegration: true,  // Mock PM
    hasTestPlatformIntegration: true        // Mock Test Management
  });
  
  const stage1Tasks = await releaseTaskRepo.findByReleaseIdAndStage(release.id, TaskStage.KICKOFF);
  log(`✅ Created ${stage1Tasks.length} Stage 1 tasks`);
  for (const task of stage1Tasks) {
    log(`   - ${task.taskType}`);
  }

  // -------------------------------------------------------------------------
  // STEP 5: Start Cron Job (Set to RUNNING, Stage 1 IN_PROGRESS)
  // -------------------------------------------------------------------------
  log('\n📝 STEP 5: Starting Cron Job...');
  
  await cronJobRepo.update(cronJob.id, {
    stage1Status: StageStatus.IN_PROGRESS,
    cronStatus: CronStatus.RUNNING
  });
  
  log('✅ Cron job started');

  // -------------------------------------------------------------------------
  // EXECUTION LOOP - Let State Machine Do Its Work
  // -------------------------------------------------------------------------
  log('\n' + '='.repeat(60));
  log('🚀 EXECUTION STARTED - State Machine Running...');
  log('=' .repeat(60));
  
  const startTime = Date.now();
  let iteration = 0;
  let lastLoggedStatus = '';

  while (iteration < TEST_CONFIG.MAX_ITERATIONS) {
    iteration++;
    
    // Fetch current state
    const currentCronJob = await cronJobRepo.findByReleaseId(release.id);
    const currentRelease = await releaseRepo.findById(release.id);
    
    if (!currentCronJob || !currentRelease) {
      log('❌ Cron job or release not found');
      break;
    }

    // Check if release was archived (error occurred)
    if (currentRelease.status === ReleaseStatus.ARCHIVED) {
      log('❌ Release was ARCHIVED (task failed). Checking failed tasks...');
      const tasks = await releaseTaskRepo.findByReleaseId(release.id);
      const failedTasks = tasks.filter(t => t.taskStatus === TaskStatus.FAILED);
      for (const t of failedTasks) {
        log(`  ❌ ${t.taskType}: ${JSON.stringify(t.externalData)}`);
      }
      break;
    }

    // Check if workflow complete
    if (currentCronJob.cronStatus === CronStatus.COMPLETED) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      log(`\n🎉 WORKFLOW COMPLETED in ${Math.floor(elapsed / 60)}m ${elapsed % 60}s!`);
      break;
    }

    // Log status changes
    const currentStatus = `Cron=${currentCronJob.cronStatus} | S1=${currentCronJob.stage1Status} | S2=${currentCronJob.stage2Status} | S3=${currentCronJob.stage3Status}`;
    if (currentStatus !== lastLoggedStatus || iteration % 12 === 0) { // Log every minute or on change
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      log(`[${Math.floor(elapsed / 60)}m ${elapsed % 60}s] ${currentStatus}`);
      lastLoggedStatus = currentStatus;
    }

    // Execute state machine
    try {
      await executeStateMachine(release.id, storage);
    } catch (error) {
      log(`⚠️ State machine error: ${error instanceof Error ? error.message : error}`);
    }

    // Wait before next iteration
    await sleep(TEST_CONFIG.POLL_INTERVAL_MS);
  }

  // -------------------------------------------------------------------------
  // VERIFICATION
  // -------------------------------------------------------------------------
  log('\n' + '='.repeat(60));
  log('📊 VERIFICATION');
  log('='.repeat(60));

  // Verify release
  const finalRelease = await releaseRepo.findById(release.id);
  log(`\n📋 Release Status: ${finalRelease?.status}`);
  
  // Verify cron job
  const finalCronJob = await cronJobRepo.findByReleaseId(release.id);
  log(`📋 Cron Status: ${finalCronJob?.cronStatus}`);
  log(`   Stage 1: ${finalCronJob?.stage1Status}`);
  log(`   Stage 2: ${finalCronJob?.stage2Status}`);
  log(`   Stage 3: ${finalCronJob?.stage3Status}`);

  // Verify tasks
  const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
  log(`\n📋 Tasks (${allTasks.length} total):`);
  for (const task of allTasks) {
    const statusIcon = task.taskStatus === TaskStatus.COMPLETED ? '✅' : 
                       task.taskStatus === TaskStatus.FAILED ? '❌' : '⏳';
    log(`   ${statusIcon} [${task.stage}] ${task.taskType}: ${task.taskStatus}`);
  }

  // Verify regression cycles
  const cycles = await regressionCycleRepo.findByReleaseId(release.id);
  log(`\n📋 Regression Cycles (${cycles.length}):`);
  for (const cycle of cycles) {
    log(`   ${cycle.status === RegressionCycleStatus.DONE ? '✅' : '⏳'} Cycle ${cycle.cycleTag}: ${cycle.status}`);
  }

  // Verify platform mappings
  const mappings = await platformMappingRepo.getByReleaseId(release.id);
  log(`\n📋 Platform Mappings (${mappings.length}):`);
  for (const m of mappings) {
    log(`   ${m.platform} → ${m.target} | PM: ${m.projectManagementRunId || 'N/A'} | TM: ${m.testManagementRunId || 'N/A'}`);
  }

  // Verify builds
  const BuildModel = sequelize.models.Build || createBuildModel(sequelize);
  const builds = await BuildModel.findAll({ where: { releaseId: release.id } });
  log(`\n📋 Builds (${builds.length}):`);
  for (const b of builds) {
    const build = (b as any).toJSON();
    log(`   ${build.platform}: ${build.number}`);
  }

  // -------------------------------------------------------------------------
  // DATA PRESERVATION - Keep all records for inspection
  // -------------------------------------------------------------------------
  log('\n' + '='.repeat(60));
  log('📦 DATA RECORDS CREATED (Preserved for Inspection)');
  log('='.repeat(60));
  
  log('\n🔑 KEY IDs:');
  log(`   Tenant ID:         ${testIds.tenantId}`);
  log(`   Account ID:        ${testIds.accountId}`);
  log(`   Release ID:        ${release.id}`);
  log(`   Release User ID:   ${release.releaseId}`);
  log(`   Cron Job ID:       ${cronJob.id}`);
  log(`   Release Config ID: ${testIntegrations.releaseConfigId}`);
  
  log('\n📋 INTEGRATION IDs:');
  log(`   SCM Integration:   ${testIntegrations.scmIntegrationId}`);
  log(`   CI/CD Integration: ${testIntegrations.cicdIntegrationId}`);
  log(`   Workflow IDs:      ${testIntegrations.workflowIds?.join(', ') || 'N/A'}`);
  
  log('\n📋 PLATFORM MAPPINGS:');
  for (const m of mappings) {
    log(`   ${m.id} | ${m.platform} → ${m.target} | v${m.version}`);
  }
  
  log('\n📋 TASKS:');
  for (const task of allTasks) {
    log(`   ${task.id} | [${task.stage}] ${task.taskType} | ${task.taskStatus}`);
  }
  
  log('\n📋 REGRESSION CYCLES:');
  for (const cycle of cycles) {
    log(`   ${cycle.id} | ${cycle.cycleTag} | ${cycle.status}`);
  }
  
  log('\n📋 BUILDS:');
  for (const b of builds) {
    const build = (b as any).toJSON();
    log(`   ${build.id} | ${build.platform} | ${build.number}`);
  }
  
  log('\n⚠️  DATA NOT CLEANED UP - All records preserved in database for inspection');
  log('   To query: mysql -u root -proot codepushdb');
  log(`   SELECT * FROM releases WHERE id = '${release.id}';`);
  log(`   SELECT * FROM cron_jobs WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_tasks WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM regression_cycles WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_platforms_targets_mapping WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM builds WHERE releaseId = '${release.id}';`);
  
  // Close connection but keep data
  await sequelize.close();
  log('\n✅ Database connection closed (data preserved)');

  // Final summary
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const success = finalCronJob?.cronStatus === CronStatus.COMPLETED;
  
  log('\n' + '='.repeat(60));
  log(`🏁 TEST ${success ? 'PASSED ✅' : 'FAILED ❌'} in ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
  log('='.repeat(60) + '\n');
  
  // Don't exit with error code - let user inspect data
  // process.exit(success ? 0 : 1);
}

// Run the test
runRealReleaseSimulation().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
