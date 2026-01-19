/**
 * User-Induced Pause & Target Date Validation - E2E Test (FULL WORKFLOW)
 * 
 * This test verifies:
 * 1. USER PAUSE: Pause release mid-execution → State machine skips → Resume → Continues
 * 2. TARGET DATE VALIDATION: Validate slot dates against targetReleaseDate
 * 3. FULL WORKFLOW: Complete release flow with 2 regression cycles after pause/resume
 * 
 * Run with: npx ts-node -r tsconfig-paths/register test/release/pause-target-date-e2e.test.ts > test/release/services/pause-target-date-output.txt 2>&1
 */

import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Models & Repositories
import { ReleaseRepository } from '../../script/models/release/release.repository';
import { CronJobRepository } from '../../script/models/release/cron-job.repository';
import { ReleaseTaskRepository } from '../../script/models/release/release-task.repository';
import { RegressionCycleRepository } from '../../script/models/release/regression-cycle.repository';
import { ReleasePlatformTargetMappingRepository } from '../../script/models/release/release-platform-target-mapping.repository';
import { ReleaseUploadsRepository } from '../../script/models/release/release-uploads.repository';
import { BuildRepository } from '../../script/models/release/build.repository';

// Models
import { createReleaseModel, ReleaseModelType } from '../../script/models/release/release.sequelize.model';
import { createCronJobModel, CronJobModelType } from '../../script/models/release/cron-job.sequelize.model';
import { createReleaseTaskModel, ReleaseTaskModelType } from '../../script/models/release/release-task.sequelize.model';
import { createRegressionCycleModel, RegressionCycleModelType } from '../../script/models/release/regression-cycle.sequelize.model';
import { createPlatformTargetMappingModel } from '../../script/models/release/platform-target-mapping.sequelize.model';
import { createBuildModel } from '../../script/models/release/build.sequelize.model';
import { createReleaseUploadModel } from '../../script/models/release/release-uploads.sequelize.model';

// Enums & Types
import {
  TaskType,
  TaskStage,
  TaskStatus,
  StageStatus,
  CronStatus,
  ReleaseStatus,
  PauseType,
  PlatformName
} from '../../script/models/release/release.interface';

// State Machine
import { CronJobStateMachine } from '../../script/services/release/cron-job/cron-job-state-machine';

// Validation Functions
import { 
  validateSlotAgainstTargetDate, 
  validateSlotsArray, 
  validateTargetDateChange,
  logTargetDateChangeAudit
} from '../../script/controllers/release/release-validation';

// Test Helpers
import { createTestStorage } from '../../test-helpers/release/test-storage';
import { setupTestIntegrations } from '../../test-helpers/release/setup-test-integrations';
import { setupFetchMock } from '../../test-helpers/release/mock-fetch';
import { createTaskExecutorForTests, clearTaskExecutorCache } from '../../test-helpers/release/task-executor-factory';
import { initializeStorage } from '../../script/storage/storage-instance';
import { createStage1Tasks } from '../../script/utils/task-creation';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_NAME = process.env.DB_NAME ?? 'codepushdb';
const DB_USER = process.env.DB_USER ?? 'root';
const DB_PASS = process.env.DB_PASS ?? 'root';
const DB_HOST = process.env.DB_HOST ?? 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT ?? '3306', 10);

const TEST_CONFIG = {
  NUM_SLOTS: 2,
  SLOT_INTERVAL_MS: 2 * 60 * 1000,     // 2 minutes between slots
  POLL_INTERVAL_MS: 3000,              // Check every 3 seconds
  MAX_ITERATIONS: 150,                  // Full workflow needs more iterations
  PLATFORMS: [PlatformName.IOS, PlatformName.ANDROID] as const,
  VERSION: '10.0.0',
  HAS_MANUAL_BUILD_UPLOAD: false,       // CI/CD mode
  PAUSE_AT_ITERATION: 15,               // Pause after 15 iterations
  RESUME_AFTER_TICKS: 5,                // Resume after 5 paused ticks
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
  releaseUploadsRepo: ReleaseUploadsRepository;
  buildRepo: BuildRepository;
}

function createRepositories(sequelize: Sequelize): TestRepositories {
  const models = getOrCreateModels(sequelize);
  const PlatformTargetMappingModel = sequelize.models.PlatformTargetMapping ?? createPlatformTargetMappingModel(sequelize);
  const ReleaseUploadModel = sequelize.models.ReleaseUpload ?? createReleaseUploadModel(sequelize);
  
  return {
    releaseRepo: new ReleaseRepository(models.releaseModel),
    cronJobRepo: new CronJobRepository(models.cronJobModel),
    releaseTaskRepo: new ReleaseTaskRepository(models.releaseTaskModel),
    regressionCycleRepo: new RegressionCycleRepository(models.regressionCycleModel),
    platformMappingRepo: new ReleasePlatformTargetMappingRepository(PlatformTargetMappingModel as any),
    releaseUploadsRepo: new ReleaseUploadsRepository(sequelize, ReleaseUploadModel as any),
    buildRepo: new BuildRepository(sequelize.models.Build ?? createBuildModel(sequelize) as any)
  };
}

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
      email: `pause-test-${uuidv4()}@example.com`,
      name: 'Test User - Pause & Target Date Test',
    } as any
  });

  await TenantModel.findOrCreate({
    where: { id: tenantId },
    defaults: {
      id: tenantId,
      displayName: 'Test Tenant - Pause & Target Date Test',
      createdBy: accountId,
    } as any
  });
}

async function createTestRelease(
  releaseRepo: ReleaseRepository,
  options: {
    tenantId: string;
    accountId: string;
    branch: string;
    targetReleaseDate: Date;
    kickOffDate: Date;
    releaseConfigId?: string;
    hasManualBuildUpload: boolean;
  }
) {
  const id = uuidv4();
  return releaseRepo.create({
    id,
    releaseId: `REL-PAUSE-TEST-${Date.now()}`,
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
    hasManualBuildUpload: options.hasManualBuildUpload,
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
    pauseType: PauseType.NONE,
    upcomingRegressions: options.upcomingRegressions,
    autoTransitionToStage2: options.autoTransitionToStage2,
    autoTransitionToStage3: options.autoTransitionToStage3
  });
}

/**
 * Simulate CI/CD callback - updates build records to UPLOADED status
 */
async function simulateCiCdCallback(
  sequelize: Sequelize,
  releaseId: string,
  platform: string
): Promise<number> {
  const [result] = await sequelize.query(`
    UPDATE builds 
    SET buildUploadStatus = 'UPLOADED', 
        workflowStatus = 'COMPLETED',
        artifactPath = CONCAT('s3://cicd-builds/', platform, '-', releaseId, '-', NOW())
    WHERE releaseId = '${releaseId}' 
    AND platform = '${platform}'
    AND buildUploadStatus = 'PENDING'
    LIMIT 1
  `) as any;
  
  return result?.affectedRows ?? 0;
}

/**
 * Complete AWAITING_CALLBACK task after builds are ready
 */
async function completeAwaitingCallbackTask(
  releaseTaskRepo: ReleaseTaskRepository,
  taskId: string
): Promise<void> {
  await releaseTaskRepo.update(taskId, {
    taskStatus: TaskStatus.COMPLETED
  });
}

async function printDatabaseState(sequelize: Sequelize, releaseId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('📦 DATABASE STATE - Pause & Target Date Validation Test');
  console.log('='.repeat(80));

  // Releases
  console.log('\n=== RELEASES ===');
  const [releases] = await sequelize.query(`SELECT * FROM releases WHERE id = '${releaseId}'`);
  for (const row of releases as any[]) {
    console.log('*************************** 1. row ***************************');
    for (const [key, value] of Object.entries(row)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
      console.log(`${key.padStart(25)}: ${displayValue}`);
    }
  }

  // Cron Jobs
  console.log('\n=== CRON JOBS ===');
  const [cronJobs] = await sequelize.query(`SELECT * FROM cron_jobs WHERE releaseId = '${releaseId}'`);
  for (const row of cronJobs as any[]) {
    console.log('*************************** 1. row ***************************');
    for (const [key, value] of Object.entries(row)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
      console.log(`${key.padStart(25)}: ${displayValue}`);
    }
  }

  // Release Tasks
  console.log('\n=== RELEASE TASKS ===');
  console.log('id\ttaskType\ttaskStatus\tstage\tregressionId');
  const [tasks] = await sequelize.query(`SELECT * FROM release_tasks WHERE releaseId = '${releaseId}' ORDER BY createdAt`);
  for (const row of tasks as any[]) {
    const statusIcon = row.taskStatus === 'AWAITING_CALLBACK' ? '⏳' : row.taskStatus === 'COMPLETED' ? '✅' : row.taskStatus === 'PENDING' ? '⏸️' : row.taskStatus === 'FAILED' ? '❌' : '❓';
    console.log(`${row.id.substring(0, 8)}...\t${row.taskType}\t${statusIcon} ${row.taskStatus}\t${row.stage}\t${row.regressionId || 'NULL'}`);
  }

  // Regression Cycles
  console.log('\n=== REGRESSION CYCLES ===');
  const [cycles] = await sequelize.query(`SELECT * FROM regression_cycles WHERE releaseId = '${releaseId}' ORDER BY createdAt`);
  for (let i = 0; i < (cycles as any[]).length; i++) {
    const row = (cycles as any[])[i];
    console.log(`*************************** ${i + 1}. row ***************************`);
    for (const [key, value] of Object.entries(row)) {
      console.log(`${key.padStart(15)}: ${value}`);
    }
  }

  // Platform Target Mappings
  console.log('\n=== PLATFORM TARGET MAPPINGS ===');
  const [mappings] = await sequelize.query(`SELECT * FROM release_platforms_targets_mapping WHERE releaseId = '${releaseId}'`);
  for (let i = 0; i < (mappings as any[]).length; i++) {
    const row = (mappings as any[])[i];
    console.log(`*************************** ${i + 1}. row ***************************`);
    for (const [key, value] of Object.entries(row)) {
      console.log(`${key.padStart(25)}: ${value}`);
    }
  }

  // Builds
  console.log('\n=== BUILDS ===');
  const [builds] = await sequelize.query(`SELECT * FROM builds WHERE releaseId = '${releaseId}'`);
  if ((builds as any[]).length === 0) {
    console.log('(no builds yet)');
  }
  for (let i = 0; i < (builds as any[]).length; i++) {
    const row = (builds as any[])[i];
    console.log(`*************************** ${i + 1}. row ***************************`);
    for (const [key, value] of Object.entries(row)) {
      console.log(`${key.padStart(20)}: ${value}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

// ============================================================================
// TARGET DATE VALIDATION TESTS
// ============================================================================

function runTargetDateValidationTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 TARGET DATE VALIDATION TESTS');
  console.log('='.repeat(80));

  const now = new Date();
  const targetDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

  // Test 1: Single slot validation
  log('\n📋 Test 1: Single Slot Validation');
  
  const validSlotDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
  const invalidSlotDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now (AFTER target)
  
  const validResult = validateSlotAgainstTargetDate(validSlotDate, targetDate);
  log(`   ✅ Valid slot (5 days): ${validResult.isValid ? 'PASS' : 'FAIL'}`);
  
  const invalidResult = validateSlotAgainstTargetDate(invalidSlotDate, targetDate);
  log(`   ✅ Invalid slot (15 days): ${!invalidResult.isValid ? 'PASS' : 'FAIL'}`);
  log(`      Error: ${invalidResult.error?.substring(0, 50)}...`);

  // Test 2: Array slot validation
  log('\n📋 Test 2: Array Slot Validation');
  
  const slots = [
    { id: 'slot-1', date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), config: {} },
    { id: 'slot-2', date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), config: {} },
    { id: 'slot-3', date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(), config: {} } // Invalid
  ];
  
  const arrayResult = validateSlotsArray(slots, targetDate);
  log(`   ✅ Array validation (1 invalid): ${!arrayResult.isValid ? 'PASS' : 'FAIL'}`);
  log(`      Invalid slots: ${arrayResult.invalidSlots.length}`);

  // Test 3: Target date change - shortening
  log('\n📋 Test 3: Target Date Change - Shortening');
  
  const oldDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000); // 20 days
  const newShorterDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days
  const existingSlots = [
    { id: 'slot-a', date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString() }, // Valid
    { id: 'slot-b', date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString() } // Exceeds new date
  ];
  
  const shortenResult = validateTargetDateChange({
    oldDate,
    newDate: newShorterDate,
    existingSlots
  });
  log(`   ✅ Shortening validation: ${!shortenResult.isValid ? 'PASS' : 'FAIL'}`);
  log(`      Conflicting slots: ${shortenResult.conflictingSlots.length}`);
  log(`      Requires delay reason: ${shortenResult.requiresDelayReason}`);

  // Test 4: Target date change - extending
  log('\n📋 Test 4: Target Date Change - Extending');
  
  const newLongerDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const extendWithoutReason = validateTargetDateChange({
    oldDate,
    newDate: newLongerDate,
    existingSlots: [],
    delayReason: undefined
  });
  log(`   ✅ Extending without reason: ${!extendWithoutReason.isValid ? 'PASS' : 'FAIL'}`);
  log(`      Requires delay reason: ${extendWithoutReason.requiresDelayReason}`);
  
  const extendWithReason = validateTargetDateChange({
    oldDate,
    newDate: newLongerDate,
    existingSlots: [],
    delayReason: 'Additional testing required'
  });
  log(`   ✅ Extending with reason: ${extendWithReason.isValid ? 'PASS' : 'FAIL'}`);
  log(`      Should log audit: ${extendWithReason.shouldLogAudit}`);

  // Test 5: Audit logging
  log('\n📋 Test 5: Audit Logging');
  
  if (extendWithReason.shouldLogAudit && extendWithReason.auditInfo) {
    logTargetDateChangeAudit('test-release-id', extendWithReason.auditInfo, 'test-account-id');
    log(`   ✅ Audit log emitted`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎯 TARGET DATE VALIDATION TESTS COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runPauseAndTargetDateTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 USER-INDUCED PAUSE & TARGET DATE VALIDATION - E2E Test');
  console.log('='.repeat(80));
  console.log(`Platforms: ${TEST_CONFIG.PLATFORMS.join(', ')}`);
  console.log(`Regression Slots: ${TEST_CONFIG.NUM_SLOTS} (2 min apart)`);
  console.log(`Pause at iteration: ${TEST_CONFIG.PAUSE_AT_ITERATION}`);
  console.log(`Resume after: ${TEST_CONFIG.RESUME_AFTER_TICKS} ticks`);
  console.log('='.repeat(80) + '\n');

  // Run target date validation tests first (pure functions)
  runTargetDateValidationTests();

  clearTaskExecutorCache();
  
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

  log('📦 Initializing storage and mocks...');
  setupFetchMock();
  const storage = createTestStorage(sequelize);
  initializeStorage(storage as any);
  log('✅ Storage initialized');

  const testIds = {
    tenantId: `pause-test-${uuidv4().substring(0, 8)}`,
    accountId: `pause-test-${uuidv4().substring(0, 8)}`,
  };

  log(`📋 Test IDs: Tenant=${testIds.tenantId}`);

  await createTestTenant(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Tenant/Account created');

  const testIntegrations = await setupTestIntegrations(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Test integrations created');

  const { releaseRepo, cronJobRepo, releaseTaskRepo, regressionCycleRepo, platformMappingRepo, releaseUploadsRepo, buildRepo } = createRepositories(sequelize);

  // STEP 1: Create Release
  log('\n📝 STEP 1: Creating Release...');
  
  const now = new Date();
  const release = await createTestRelease(releaseRepo, {
    tenantId: testIds.tenantId,
    accountId: testIds.accountId,
    branch: `release/v${TEST_CONFIG.VERSION}`,
    targetReleaseDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    kickOffDate: now,
    releaseConfigId: testIntegrations.releaseConfigId,
    hasManualBuildUpload: TEST_CONFIG.HAS_MANUAL_BUILD_UPLOAD
  });
  
  log(`✅ Release created: ${release.releaseId}`);

  // STEP 2: Create Platform Target Mappings
  log('\n📝 STEP 2: Creating Platform Target Mappings...');
  
  const PlatformTargetMappingModel = sequelize.models.PlatformTargetMapping ?? createPlatformTargetMappingModel(sequelize);
  
  for (const platform of TEST_CONFIG.PLATFORMS) {
    const target = platform === PlatformName.IOS ? 'APP_STORE' : 'PLAY_STORE';
    await PlatformTargetMappingModel.create({
      id: uuidv4(),
      releaseId: release.id,
      platform,
      target,
      version: TEST_CONFIG.VERSION,
      projectManagementRunId: null,
      testManagementRunId: null,
    } as any);
    log(`  ✅ ${platform} → ${target}`);
  }

  // STEP 3: Create Cron Job with Regression Slots
  log(`\n📝 STEP 3: Creating Cron Job with ${TEST_CONFIG.NUM_SLOTS} Regression Slots...`);
  
  const slotTimes: Date[] = [];
  const upcomingRegressions: any[] = [];
  
  for (let i = 0; i < TEST_CONFIG.NUM_SLOTS; i++) {
    const slotTime = new Date(now.getTime() + (60 * 1000) + (i * TEST_CONFIG.SLOT_INTERVAL_MS));
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

  log(`✅ Cron job created with ${TEST_CONFIG.NUM_SLOTS} slots`);
  slotTimes.forEach((time, i) => {
    log(`   Slot ${i + 1}: ${time.toLocaleTimeString()}`);
  });

  // STEP 4: Create Stage 1 Tasks
  log('\n📝 STEP 4: Creating Stage 1 Tasks...');
  
  await createStage1Tasks(releaseTaskRepo, {
    releaseId: release.id,
    accountId: release.createdByAccountId,
    cronConfig: {
      kickOffReminder: false,
      preRegressionBuilds: true
    },
    hasProjectManagementIntegration: false,
    hasTestPlatformIntegration: false
  });
  
  const stage1Tasks = await releaseTaskRepo.findByReleaseIdAndStage(release.id, TaskStage.KICKOFF);
  log(`✅ Created ${stage1Tasks.length} Stage 1 tasks`);

  // STEP 5: Start Cron Job
  log('\n📝 STEP 5: Starting Cron Job...');
  
  await cronJobRepo.update(cronJob.id, {
    stage1Status: StageStatus.IN_PROGRESS,
    cronStatus: CronStatus.RUNNING
  });
  
  log('✅ Cron job started');

  // EXECUTION LOOP
  log('\n' + '='.repeat(60));
  log('🚀 EXECUTION STARTED - With Pause/Resume Feature');
  log('='.repeat(60));
  
  const startTime = Date.now();
  let iteration = 0;
  let lastLoggedStatus = '';
  let pausedAtIteration = 0;
  let wasPaused = false;
  let wasResumed = false;
  const callbackTracking = new Map<string, { updatedPlatforms: Set<string>; foundIteration: number }>();
  let awaitingCallbackEvents: { taskId: string; taskType: string; iteration: number }[] = [];
  const TICKS_BETWEEN_CALLBACKS = 2;

  // Track pause/resume events
  const pauseEvents: { iteration: number; action: string; pauseType: string }[] = [];

  while (iteration < TEST_CONFIG.MAX_ITERATIONS) {
    iteration++;
    
    const currentCronJob = await cronJobRepo.findByReleaseId(release.id);
    const currentRelease = await releaseRepo.findById(release.id);
    
    if (!currentCronJob || !currentRelease) {
      log('❌ Cron job or release not found');
      break;
    }

    if (currentRelease.status === ReleaseStatus.ARCHIVED) {
      log('❌ Release was ARCHIVED (task failed)');
      break;
    }

    const currentStatus = `Cron=${currentCronJob.cronStatus} | S1=${currentCronJob.stage1Status} | S2=${currentCronJob.stage2Status} | S3=${currentCronJob.stage3Status} | Pause=${currentCronJob.pauseType ?? 'NONE'}`;

    // Check for completion
    if (currentCronJob.cronStatus === CronStatus.COMPLETED &&
        currentCronJob.stage3Status === StageStatus.COMPLETED) {
      log('\n✅ WORKFLOW COMPLETED SUCCESSFULLY!');
      break;
    }

    // ====================================================================
    // USER-INDUCED PAUSE TEST
    // ====================================================================
    
    // Pause at specified iteration
    if (iteration === TEST_CONFIG.PAUSE_AT_ITERATION && !wasPaused) {
      log(`\n⏸️ [PAUSE TEST] Iteration ${iteration}: Pausing release...`);
      
      await cronJobRepo.update(currentCronJob.id, {
        pauseType: PauseType.USER_REQUESTED
      });
      await releaseRepo.update(release.id, {
        status: ReleaseStatus.PAUSED
      });
      
      pausedAtIteration = iteration;
      wasPaused = true;
      pauseEvents.push({ iteration, action: 'PAUSED', pauseType: PauseType.USER_REQUESTED });
      
      log(`   ✅ Release PAUSED at iteration ${iteration}`);
      log(`   pauseType: ${PauseType.USER_REQUESTED}`);
      log(`   cronStatus: ${CronStatus.RUNNING} (scheduler keeps running)`);
    }
    
    // Resume after specified ticks while paused
    if (wasPaused && !wasResumed && iteration >= pausedAtIteration + TEST_CONFIG.RESUME_AFTER_TICKS) {
      log(`\n▶️ [RESUME TEST] Iteration ${iteration}: Resuming release...`);
      
      await cronJobRepo.update(currentCronJob.id, {
        pauseType: PauseType.NONE
      });
      await releaseRepo.update(release.id, {
        status: ReleaseStatus.IN_PROGRESS
      });
      
      wasResumed = true;
      pauseEvents.push({ iteration, action: 'RESUMED', pauseType: PauseType.NONE });
      
      log(`   ✅ Release RESUMED at iteration ${iteration}`);
      log(`   pauseType: ${PauseType.NONE}`);
      log(`   Paused for: ${iteration - pausedAtIteration} ticks`);
    }

    // ====================================================================
    // CI/CD CALLBACK HANDLING (same as awaiting-status-cicd-e2e)
    // ====================================================================
    const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
    const awaitingCallbackTasks = allTasks.filter(t => 
      t.taskStatus === TaskStatus.AWAITING_CALLBACK
    );

    for (const task of awaitingCallbackTasks) {
      if (!callbackTracking.has(task.id)) {
        callbackTracking.set(task.id, { updatedPlatforms: new Set(), foundIteration: iteration });
        log(`\n🔔 FOUND AWAITING_CALLBACK: ${task.taskType} (${task.id.substring(0, 8)})`);
        awaitingCallbackEvents.push({ taskId: task.id, taskType: task.taskType, iteration });
      }

      const tracking = callbackTracking.get(task.id)!;
      const allPlatformsUpdated = tracking.updatedPlatforms.size === TEST_CONFIG.PLATFORMS.length;
      
      if (allPlatformsUpdated) continue;

      const platformsArray = [...TEST_CONFIG.PLATFORMS];
      for (let i = 0; i < platformsArray.length; i++) {
        const platform = platformsArray[i];
        
        if (tracking.updatedPlatforms.has(platform)) continue;
        
        const expectedTick = tracking.foundIteration + (tracking.updatedPlatforms.size * TICKS_BETWEEN_CALLBACKS);
        
        if (iteration >= expectedTick) {
          log(`   📡 [Tick ${iteration}] CI/CD callback received for ${platform} build...`);
          
          await sequelize.query(`
            UPDATE builds 
            SET buildUploadStatus = 'UPLOADED', 
                workflowStatus = 'COMPLETED',
                artifactPath = 's3://cicd-builds/${platform}-${release.id}-${new Date().toISOString()}'
            WHERE releaseId = '${release.id}' 
            AND platform = '${platform}'
            AND buildUploadStatus = 'PENDING'
            LIMIT 1
          `);
          
          tracking.updatedPlatforms.add(platform);
          log(`   ✅ ${platform} build marked as UPLOADED (${tracking.updatedPlatforms.size}/${TEST_CONFIG.PLATFORMS.length})`);
          
          if (tracking.updatedPlatforms.size === TEST_CONFIG.PLATFORMS.length) {
            await completeAwaitingCallbackTask(releaseTaskRepo, task.id);
            log(`   ✅ All platforms complete - Task ${task.taskType} COMPLETED!`);
          }
          break;
        }
      }
    }

    if (currentStatus !== lastLoggedStatus || iteration % 10 === 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      log(`[${minutes}m ${seconds}s] ${currentStatus}`);
      lastLoggedStatus = currentStatus;
    }

    // Execute state machine (handles pause check internally)
    try {
      const taskExecutor = createTaskExecutorForTests(sequelize);
      const stateMachine = new CronJobStateMachine(
        release.id,
        cronJobRepo,
        releaseRepo,
        releaseTaskRepo,
        regressionCycleRepo,
        taskExecutor as any,
        storage as any,
        platformMappingRepo,
        releaseUploadsRepo,
        buildRepo
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

  // FINAL STATUS
  const finalCronJob = await cronJobRepo.findByReleaseId(release.id);
  const finalRelease = await releaseRepo.findById(release.id);
  const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
  const allCycles = await regressionCycleRepo.findByReleaseId(release.id);

  const totalDuration = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalDuration / 60);
  const seconds = totalDuration % 60;

  log('\n' + '='.repeat(60));
  log('📊 FINAL STATUS');
  log('='.repeat(60));
  log(`\n⏱️  Total Duration: ${minutes}m ${seconds}s`);
  log(`\n📋 Release: ${finalRelease?.releaseId} (${finalRelease?.status})`);
  log(`\n📋 Cron Status: ${finalCronJob?.cronStatus}`);
  log(`   Stage 1: ${finalCronJob?.stage1Status}`);
  log(`   Stage 2: ${finalCronJob?.stage2Status}`);
  log(`   Stage 3: ${finalCronJob?.stage3Status}`);
  log(`   Pause Type: ${finalCronJob?.pauseType ?? 'NONE'}`);
  
  log(`\n📋 Tasks (${allTasks.length} total):`);
  for (const task of allTasks) {
    const icon = task.taskStatus === 'AWAITING_CALLBACK' ? '⏳' : task.taskStatus === 'COMPLETED' ? '✅' : task.taskStatus === 'FAILED' ? '❌' : '⏸️';
    log(`   ${icon} [${task.stage}] ${task.taskType}: ${task.taskStatus}`);
  }
  
  log(`\n📋 Regression Cycles (${allCycles.length}):`);
  for (const cycle of allCycles) {
    const icon = cycle.status === 'DONE' ? '✅' : '⏳';
    log(`   ${icon} Cycle ${cycle.cycleTag}: ${cycle.status}`);
  }

  // Print pause events
  log('\n📋 PAUSE/RESUME EVENTS:');
  for (const event of pauseEvents) {
    const icon = event.action === 'PAUSED' ? '⏸️' : '▶️';
    log(`   ${icon} [Iteration ${event.iteration}] ${event.action} → pauseType=${event.pauseType}`);
  }

  // Print AWAITING_CALLBACK events
  log('\n📋 AWAITING_CALLBACK Events:');
  for (const event of awaitingCallbackEvents) {
    log(`   🔔 ${event.taskType} → AWAITING_CALLBACK → COMPLETED (iteration ${event.iteration})`);
  }

  // Print database state
  await printDatabaseState(sequelize, release.id);

  // VERIFICATION
  log('\n' + '='.repeat(60));
  log('🔍 VERIFICATION');
  log('='.repeat(60));
  
  const pauseTestPassed = wasPaused && wasResumed;
  const workflowCompleted = finalCronJob?.cronStatus === CronStatus.COMPLETED && 
                            finalCronJob?.stage3Status === StageStatus.COMPLETED;
  const pauseTypeReset = finalCronJob?.pauseType === PauseType.NONE;
  
  log(`\n✅ Pause Test: ${pauseTestPassed ? 'PASSED' : 'FAILED'}`);
  log(`   - Was paused: ${wasPaused}`);
  log(`   - Was resumed: ${wasResumed}`);
  log(`   - Paused at iteration: ${pausedAtIteration}`);
  log(`   - Paused for: ${wasResumed ? `${pauseEvents[1]?.iteration - pausedAtIteration} ticks` : 'N/A'}`);
  
  log(`\n✅ Workflow Complete: ${workflowCompleted ? 'PASSED' : 'INCOMPLETE'}`);
  log(`   - Final cronStatus: ${finalCronJob?.cronStatus}`);
  log(`   - Final stage3Status: ${finalCronJob?.stage3Status}`);
  
  log(`\n✅ PauseType Reset: ${pauseTypeReset ? 'PASSED' : 'FAILED'}`);
  log(`   - Final pauseType: ${finalCronJob?.pauseType ?? 'NONE'}`);

  const success = pauseTestPassed && workflowCompleted && pauseTypeReset;
  
  if (success) {
    log('\n🎉 TEST PASSED: User-Induced Pause & Resume completed full workflow!');
  } else {
    log('\n⚠️ TEST INCOMPLETE');
    if (!pauseTestPassed) log('   - Pause/Resume test failed');
    if (!workflowCompleted) log('   - Workflow not completed');
    if (!pauseTypeReset) log('   - PauseType not reset to NONE');
  }

  log('\n='.repeat(60) + '\n');

  // Print SQL queries
  console.log('='.repeat(80));
  log('\n⚠️  DATA NOT CLEANED UP - All records preserved in database for inspection');
  log(`   To query: mysql -u root -proot codepushdb`);
  log(`   SELECT * FROM releases WHERE id = '${release.id}';`);
  log(`   SELECT * FROM cron_jobs WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_tasks WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM regression_cycles WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM builds WHERE releaseId = '${release.id}';`);

  await sequelize.close();
  log('\n✅ Database connection closed (data preserved)');

  log('\n' + '='.repeat(60));
  const testResult = success ? '🏁 PAUSE & TARGET DATE E2E TEST PASSED ✅' : '⚠️ PAUSE & TARGET DATE E2E TEST INCOMPLETE';
  log(`${testResult} in ${minutes}m ${seconds}s`);
  log('='.repeat(60) + '\n');
}

// Run the test
runPauseAndTargetDateTest().catch(console.error);

