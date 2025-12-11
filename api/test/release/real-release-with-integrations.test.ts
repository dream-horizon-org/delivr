/**
 * Real Release Simulation Test - WITH INTEGRATIONS
 * 
 * This test simulates a complete release workflow with:
 * - 2 platforms: IOS + ANDROID
 * - 3 regression slots (3 minutes apart)
 * - Automatic stage transitions
 * - Project Management Integration ENABLED
 * - Test Management Integration ENABLED
 * 
 * Expected Duration: ~12-15 minutes
 * 
 * Run with: npx ts-node -r tsconfig-paths/register test/release/real-release-with-integrations.test.ts
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
import { createBuildModel } from '../../script/models/release/build.sequelize.model';

// Enums & Types
import {
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

// Test Helpers
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
  NUM_SLOTS: 3,                        // 3 regression slots
  SLOT_INTERVAL_MS: 3 * 60 * 1000,     // 3 minutes between slots
  POLL_INTERVAL_MS: 5000,              // Check every 5 seconds
  MAX_ITERATIONS: 200,                 // Safety limit (~16 minutes)
  PLATFORMS: ['IOS', 'ANDROID'] as const,
  VERSION: '7.0.0',
  // INTEGRATIONS ENABLED
  ENABLE_PROJECT_MANAGEMENT: true,
  ENABLE_TEST_MANAGEMENT: true,
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

// Cache models
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

// Create tenant and account
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
      name: 'Test User - Release With Integrations',
    } as any
  });

  await TenantModel.findOrCreate({
    where: { id: tenantId },
    defaults: {
      id: tenantId,
      displayName: 'Test Tenant - Release With Integrations',
      createdBy: accountId,
    } as any
  });
}

// Create release
async function createTestRelease(
  releaseRepo: ReleaseRepository,
  options: {
    tenantId: string;
    accountId: string;
    branch: string;
    targetReleaseDate: Date;
    kickOffDate: Date;
    releaseConfigId?: string;
    hasManualBuildUpload?: boolean;
  }
) {
  const id = uuidv4();
  return releaseRepo.create({
    id,
    releaseId: `REL-INT-${Date.now()}`,
    releaseConfigId: options.releaseConfigId ?? null,
    tenantId: options.tenantId,
    status: 'IN_PROGRESS',
    type: 'MINOR',
    branch: options.branch,
    baseBranch: 'main',
    baseReleaseId: null,
    kickOffReminderDate: null,
    kickOffDate: options.kickOffDate,
    targetReleaseDate: options.targetReleaseDate,
    releaseDate: null,
    hasManualBuildUpload: options.hasManualBuildUpload ?? false,
    createdByAccountId: options.accountId,
    releasePilotAccountId: options.accountId,
    lastUpdatedByAccountId: options.accountId
  });
}

// Create cron job
async function createTestCronJob(
  cronJobRepo: CronJobRepository,
  options: {
    releaseId: string;
    accountId: string;
    cronConfig: any;
    upcomingRegressions: any[];
    autoTransitionToStage2: boolean;
    autoTransitionToStage3: boolean;
  }
) {
  const id = uuidv4();
  return cronJobRepo.create({
    id,
    releaseId: options.releaseId,
    cronConfig: options.cronConfig,
    cronCreatedByAccountId: options.accountId,
    cronStatus: 'PENDING',
    stage1Status: 'PENDING',
    stage2Status: 'PENDING',
    stage3Status: 'PENDING',
    upcomingRegressions: options.upcomingRegressions,
    autoTransitionToStage2: options.autoTransitionToStage2,
    autoTransitionToStage3: options.autoTransitionToStage3
  });
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runReleaseWithIntegrationsSimulation() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 REAL RELEASE SIMULATION TEST - WITH INTEGRATIONS');
  console.log('='.repeat(80));
  console.log(`Platforms: ${TEST_CONFIG.PLATFORMS.join(', ')}`);
  console.log(`Regression Slots: ${TEST_CONFIG.NUM_SLOTS} (3 min apart)`);
  console.log(`Auto Transitions: Stage1→2 ✓, Stage2→3 ✓`);
  console.log(`Project Management: ${TEST_CONFIG.ENABLE_PROJECT_MANAGEMENT ? '✓ ENABLED' : '✗ DISABLED'}`);
  console.log(`Test Management: ${TEST_CONFIG.ENABLE_TEST_MANAGEMENT ? '✓ ENABLED' : '✗ DISABLED'}`);
  console.log(`Expected Duration: ~12-15 minutes`);
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
  // SETUP: Initialize Storage
  // -------------------------------------------------------------------------
  log('📦 Initializing storage and mocks...');
  
  setupFetchMock();
  log('✅ Fetch mock initialized');
  
  const storage = createTestStorage(sequelize);
  initializeStorage(storage as any);
  log('✅ Storage initialized');
  log('✅ Using existing database schema');

  // -------------------------------------------------------------------------
  // SETUP: Test IDs
  // -------------------------------------------------------------------------
  const testIds = {
    tenantId: `int-tenant-${uuidv4().substring(0, 8)}`,
    accountId: `int-account-${uuidv4().substring(0, 8)}`,
  };

  log(`📋 Test IDs: Tenant=${testIds.tenantId}, Account=${testIds.accountId.substring(0, 12)}...`);

  // -------------------------------------------------------------------------
  // SETUP: Create Tenant/Account
  // -------------------------------------------------------------------------
  log('\n📝 Creating test tenant and account...');
  await createTestTenant(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Tenant/Account created');

  // -------------------------------------------------------------------------
  // SETUP: Create Test Integrations (with PM and TM enabled)
  // -------------------------------------------------------------------------
  log('\n📝 Setting up test integrations...');
  const testIntegrations = await setupTestIntegrations(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Test integrations created');
  log(`   - Project Management: ${TEST_CONFIG.ENABLE_PROJECT_MANAGEMENT ? 'ENABLED' : 'DISABLED'}`);
  log(`   - Test Management: ${TEST_CONFIG.ENABLE_TEST_MANAGEMENT ? 'ENABLED' : 'DISABLED'}`);

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
  // STEP 3: Create Cron Job with 3 Regression Slots
  // -------------------------------------------------------------------------
  log(`\n📝 STEP 3: Creating Cron Job with ${TEST_CONFIG.NUM_SLOTS} Regression Slots...`);
  
  const slotTimes: Date[] = [];
  const upcomingRegressions: any[] = [];
  
  for (let i = 0; i < TEST_CONFIG.NUM_SLOTS; i++) {
    const slotTime = new Date(now.getTime() + (30 * 1000) + (i * TEST_CONFIG.SLOT_INTERVAL_MS));
    slotTimes.push(slotTime);
    upcomingRegressions.push({
      date: slotTime.toISOString(),
      config: { automationBuilds: false, automationRuns: false }
    });
  }

  const cronJob = await createTestCronJob(cronJobRepo, {
    releaseId: release.id,
    accountId: testIds.accountId,
    cronConfig: {
      preRegressionBuilds: true,
      automationBuilds: false,
      automationRuns: false,
    },
    upcomingRegressions,
    autoTransitionToStage2: true,
    autoTransitionToStage3: true,
  });

  log(`✅ Cron job created with ${TEST_CONFIG.NUM_SLOTS} slots:`);
  slotTimes.forEach((time, i) => {
    log(`   Slot ${i + 1}: ${time.toLocaleTimeString()}`);
  });

  // -------------------------------------------------------------------------
  // STEP 4: Create Stage 1 Tasks (with PM and TM tasks)
  // -------------------------------------------------------------------------
  log('\n📝 STEP 4: Creating Stage 1 Tasks (with PM & TM integration tasks)...');
  
  await createStage1Tasks(releaseTaskRepo, {
    releaseId: release.id,
    accountId: release.createdByAccountId,
    cronConfig: {
      kickOffReminder: false,
      preRegressionBuilds: true
    },
    hasProjectManagementIntegration: TEST_CONFIG.ENABLE_PROJECT_MANAGEMENT,
    hasTestPlatformIntegration: TEST_CONFIG.ENABLE_TEST_MANAGEMENT
  });
  
  const stage1Tasks = await releaseTaskRepo.findByReleaseIdAndStage(release.id, TaskStage.KICKOFF);
  log(`✅ Created ${stage1Tasks.length} Stage 1 tasks`);
  for (const task of stage1Tasks) {
    const integrationTag = 
      task.taskType === TaskType.CREATE_PROJECT_MANAGEMENT_TICKET ? ' (PM)' :
      task.taskType === TaskType.CREATE_TEST_SUITE ? ' (TM)' : '';
    log(`   - ${task.taskType}${integrationTag}`);
  }

  // -------------------------------------------------------------------------
  // STEP 5: Start Cron Job
  // -------------------------------------------------------------------------
  log('\n📝 STEP 5: Starting Cron Job...');
  
  await cronJobRepo.update(cronJob.id, {
    stage1Status: StageStatus.IN_PROGRESS,
    cronStatus: CronStatus.RUNNING
  });
  
  log('✅ Cron job started');

  // -------------------------------------------------------------------------
  // EXECUTION LOOP
  // -------------------------------------------------------------------------
  log('\n' + '='.repeat(60));
  log('🚀 EXECUTION STARTED - State Machine Running...');
  log('='.repeat(60));
  
  const startTime = Date.now();
  let iteration = 0;
  let lastLoggedStatus = '';

  while (iteration < TEST_CONFIG.MAX_ITERATIONS) {
    iteration++;
    
    const currentCronJob = await cronJobRepo.findByReleaseId(release.id);
    const currentRelease = await releaseRepo.findById(release.id);
    
    if (!currentCronJob || !currentRelease) {
      log('❌ Cron job or release not found');
      break;
    }

    if (currentRelease.status === ReleaseStatus.ARCHIVED) {
      log('❌ Release was ARCHIVED (task failed). Checking failed tasks...');
      const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
      const failedTasks = allTasks.filter(t => t.taskStatus === TaskStatus.FAILED);
      for (const task of failedTasks) {
        log(`   ❌ FAILED: ${task.taskType}`);
      }
      break;
    }

    const currentStatus = `Cron=${currentCronJob.cronStatus} | S1=${currentCronJob.stage1Status} | S2=${currentCronJob.stage2Status} | S3=${currentCronJob.stage3Status}`;
    
    if (currentStatus !== lastLoggedStatus || iteration % 12 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      log(`[${minutes}m ${seconds}s] ${currentStatus}`);
      lastLoggedStatus = currentStatus;
    }

    // Check for completion
    if (currentCronJob.cronStatus === CronStatus.COMPLETED &&
        currentCronJob.stage3Status === StageStatus.COMPLETED) {
      log('\n✅ WORKFLOW COMPLETED SUCCESSFULLY!');
      break;
    }

    // Skip if paused
    if (currentCronJob.cronStatus === CronStatus.PAUSED) {
      await sleep(TEST_CONFIG.POLL_INTERVAL_MS);
      continue;
    }

    // Execute state machine
    try {
      const taskExecutor = createTaskExecutorForTests(sequelize);
      const stateMachine = new CronJobStateMachine(
        release.id,
        cronJobRepo,
        releaseRepo,
        releaseTaskRepo,
        regressionCycleRepo,
        taskExecutor as any,
        storage as any
      );
      
      await stateMachine.initialize();
      await stateMachine.execute();
      
    } catch (error: any) {
      if (!error.message?.includes('archived')) {
        console.error('State machine error:', error.message);
      }
    }

    await sleep(TEST_CONFIG.POLL_INTERVAL_MS);
  }

  // -------------------------------------------------------------------------
  // FINAL STATUS
  // -------------------------------------------------------------------------
  const finalCronJob = await cronJobRepo.findByReleaseId(release.id);
  const finalRelease = await releaseRepo.findById(release.id);
  const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
  const allCycles = await regressionCycleRepo.findByReleaseId(release.id);
  const platformMappings = await platformMappingRepo.getByReleaseId(release.id);

  const BuildModel = sequelize.models.Build || createBuildModel(sequelize);
  const builds = await BuildModel.findAll({ where: { releaseId: release.id } });

  const totalDuration = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalDuration / 60);
  const seconds = totalDuration % 60;

  log('\n' + '='.repeat(60));
  log('📊 FINAL STATUS');
  log('='.repeat(60));
  log(`\n⏱️  Total Duration: ${minutes}m ${seconds}s`);
  log(`\n📋 Release: ${finalRelease?.releaseId} (${finalRelease?.status})`);
  log(`📋 Cron Status: ${finalCronJob?.cronStatus}`);
  log(`   Stage 1: ${finalCronJob?.stage1Status}`);
  log(`   Stage 2: ${finalCronJob?.stage2Status}`);
  log(`   Stage 3: ${finalCronJob?.stage3Status}`);
  
  log(`\n📋 Tasks (${allTasks.length} total):`);
  for (const task of allTasks) {
    const icon = task.taskStatus === 'COMPLETED' ? '✅' : task.taskStatus === 'FAILED' ? '❌' : '⏳';
    const pmTag = task.taskType === TaskType.CREATE_PROJECT_MANAGEMENT_TICKET ? ' [PM]' : '';
    const tmTag = task.taskType === TaskType.CREATE_TEST_SUITE ? ' [TM]' : '';
    log(`   ${icon} [${task.stage}] ${task.taskType}${pmTag}${tmTag}: ${task.taskStatus}`);
  }
  
  log(`\n📋 Regression Cycles (${allCycles.length}):`);
  for (const cycle of allCycles) {
    const icon = cycle.status === 'DONE' ? '✅' : '⏳';
    log(`   ${icon} Cycle ${cycle.cycleTag}: ${cycle.status}`);
  }
  
  log(`\n📋 Platform Mappings (${platformMappings.length}):`);
  for (const pm of platformMappings) {
    const pmId = (pm as any).projectManagementRunId || 'N/A';
    const tmId = (pm as any).testManagementRunId || 'N/A';
    log(`   ${pm.platform} → ${pm.target} | PM: ${pmId} | TM: ${tmId}`);
  }
  
  log(`\n📋 Builds (${builds.length}):`);
  for (const build of builds) {
    const b = build.toJSON();
    log(`   ${b.platform}: ${b.number}`);
  }

  // -------------------------------------------------------------------------
  // DATA RECORDS (preserved for inspection)
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
  log(`   Workflow IDs:      ${testIntegrations.workflowIds.join(', ')}`);
  
  log('\n📋 PLATFORM MAPPINGS:');
  for (const pm of platformMappings) {
    log(`   ${pm.id} | ${pm.platform} → ${pm.target} | v${pm.version}`);
  }
  
  log('\n📋 TASKS:');
  for (const task of allTasks) {
    log(`   ${task.id} | [${task.stage}] ${task.taskType} | ${task.taskStatus}`);
  }
  
  log('\n📋 REGRESSION CYCLES:');
  for (const cycle of allCycles) {
    log(`   ${cycle.id} | ${cycle.cycleTag} | ${cycle.status}`);
  }
  
  log('\n📋 BUILDS:');
  for (const build of builds) {
    const b = build.toJSON();
    log(`   ${b.id} | ${b.platform} | ${b.number}`);
  }
  
  log('\n⚠️  DATA NOT CLEANED UP - All records preserved in database for inspection');
  log(`   To query: mysql -u root -proot ${DB_NAME}`);
  log(`   SELECT * FROM releases WHERE id = '${release.id}';`);
  log(`   SELECT * FROM cron_jobs WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_tasks WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM regression_cycles WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_platforms_targets_mapping WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM builds WHERE releaseId = '${release.id}';`);

  // Close database
  await sequelize.close();
  log('\n✅ Database connection closed (data preserved)');

  // Final result
  const success = finalCronJob?.cronStatus === CronStatus.COMPLETED && 
                  finalCronJob?.stage3Status === StageStatus.COMPLETED;
  
  log('\n' + '='.repeat(60));
  if (success) {
    log(`🏁 TEST PASSED ✅ in ${minutes}m ${seconds}s`);
  } else {
    log(`🏁 TEST INCOMPLETE ⚠️ in ${minutes}m ${seconds}s`);
    log('   Check the tasks above for failures or pending items.');
  }
  log('='.repeat(60) + '\n');
}

// Run the test
runReleaseWithIntegrationsSimulation().catch(console.error);

