/**
 * Phase 18: Manual Build Upload - E2E Test
 * 
 * This test simulates a complete release workflow with:
 * - hasManualBuildUpload = true
 * - Manual build uploads via release_uploads staging table
 * - 2 platforms: IOS + ANDROID
 * - 2 regression slots
 * - Automatic stage transitions
 * 
 * Run with: npx ts-node -r tsconfig-paths/register test/release/phase18-manual-upload-e2e.test.ts
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
  RegressionCycleStatus,
  PlatformName
} from '../../script/models/release/release.interface';

// State Machine
import { CronJobStateMachine } from '../../script/services/release/cron-job/cron-job-state-machine';

// Test Helpers
import { createTestStorage } from '../../test-helpers/release/test-storage';
import { setupTestIntegrations, cleanupTestIntegrations } from '../../test-helpers/release/setup-test-integrations';
import { setupFetchMock } from '../../test-helpers/release/mock-fetch';
import { createTaskExecutorForTests, clearTaskExecutorCache } from '../../test-helpers/release/task-executor-factory';
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
  NUM_SLOTS: 2,                        // 2 regression slots
  SLOT_INTERVAL_MS: 2 * 60 * 1000,     // 2 minutes between slots
  POLL_INTERVAL_MS: 3000,              // Check every 3 seconds
  MAX_ITERATIONS: 150,                 // Safety limit (~7 minutes)
  PLATFORMS: [PlatformName.IOS, PlatformName.ANDROID] as const,
  VERSION: '8.0.0',
  // MANUAL BUILD UPLOAD MODE
  HAS_MANUAL_BUILD_UPLOAD: true,       // ✅ Phase 18 flag!
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
  releaseUploadsRepo: ReleaseUploadsRepository;
}

function createRepositories(sequelize: Sequelize): TestRepositories {
  const models = getOrCreateModels(sequelize);
  const PlatformTargetMappingModel = sequelize.models.PlatformTargetMapping || createPlatformTargetMappingModel(sequelize);
  const ReleaseUploadModel = sequelize.models.ReleaseUpload || createReleaseUploadModel(sequelize);
  
  return {
    releaseRepo: new ReleaseRepository(models.releaseModel),
    cronJobRepo: new CronJobRepository(models.cronJobModel),
    releaseTaskRepo: new ReleaseTaskRepository(models.releaseTaskModel),
    regressionCycleRepo: new RegressionCycleRepository(models.regressionCycleModel),
    platformMappingRepo: new ReleasePlatformTargetMappingRepository(PlatformTargetMappingModel as any),
    releaseUploadsRepo: new ReleaseUploadsRepository(sequelize, ReleaseUploadModel as any)
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
      email: `phase18-${uuidv4()}@example.com`,
      name: 'Test User - Phase 18 Manual Upload',
    } as any
  });

  await TenantModel.findOrCreate({
    where: { id: tenantId },
    defaults: {
      id: tenantId,
      displayName: 'Test Tenant - Phase 18 Manual Upload',
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
    hasManualBuildUpload: boolean;
  }
) {
  const id = uuidv4();
  return releaseRepo.create({
    id,
    releaseId: `REL-PHASE18-${Date.now()}`,
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
    hasManualBuildUpload: options.hasManualBuildUpload, // ✅ Phase 18!
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

// Upload manual build to staging table
async function uploadManualBuild(
  releaseUploadsRepo: ReleaseUploadsRepository,
  options: {
    tenantId: string;
    releaseId: string;
    platform: PlatformName;
    stage: 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE';
    artifactPath: string;
  }
) {
  return releaseUploadsRepo.upsert({
    tenantId: options.tenantId,
    releaseId: options.releaseId,
    platform: options.platform,
    stage: options.stage,
    artifactPath: options.artifactPath
  });
}

// Print database tables
async function printDatabaseState(sequelize: Sequelize, releaseId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('📦 DATABASE STATE - Phase 18 Manual Upload Test');
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
    console.log(`${row.id.substring(0, 8)}...\t${row.taskType}\t${row.taskStatus}\t${row.taskStage}\t${row.regressionId || 'NULL'}`);
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

  // ✅ PHASE 18: Release Uploads (Staging Table)
  console.log('\n=== RELEASE UPLOADS (Phase 18 Staging Table) ===');
  const [uploads] = await sequelize.query(`SELECT * FROM release_uploads WHERE releaseId = '${releaseId}' ORDER BY createdAt`);
  if ((uploads as any[]).length === 0) {
    console.log('(no uploads - all consumed or none uploaded)');
  }
  for (let i = 0; i < (uploads as any[]).length; i++) {
    const row = (uploads as any[])[i];
    console.log(`*************************** ${i + 1}. row ***************************`);
    for (const [key, value] of Object.entries(row)) {
      console.log(`${key.padStart(20)}: ${value}`);
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
      console.log(`${key.padStart(15)}: ${value}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runPhase18ManualUploadSimulation() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 PHASE 18: MANUAL BUILD UPLOAD - E2E TEST');
  console.log('='.repeat(80));
  console.log(`Platforms: ${TEST_CONFIG.PLATFORMS.join(', ')}`);
  console.log(`Regression Slots: ${TEST_CONFIG.NUM_SLOTS} (2 min apart)`);
  console.log(`Auto Transitions: Stage1→2 ✓, Stage2→3 ✓`);
  console.log(`Manual Build Upload: ${TEST_CONFIG.HAS_MANUAL_BUILD_UPLOAD ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`Expected Duration: ~5-7 minutes`);
  console.log('='.repeat(80) + '\n');

  // -------------------------------------------------------------------------
  // SETUP: Clear TaskExecutor cache (ensure fresh instance with ReleaseUploadsRepo)
  // -------------------------------------------------------------------------
  clearTaskExecutorCache();
  
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

  // -------------------------------------------------------------------------
  // SETUP: Test IDs
  // -------------------------------------------------------------------------
  const testIds = {
    tenantId: `p18-tenant-${uuidv4().substring(0, 8)}`,
    accountId: `p18-account-${uuidv4().substring(0, 8)}`,
  };

  log(`📋 Test IDs: Tenant=${testIds.tenantId}, Account=${testIds.accountId.substring(0, 12)}...`);

  // -------------------------------------------------------------------------
  // SETUP: Create Tenant/Account
  // -------------------------------------------------------------------------
  log('\n📝 Creating test tenant and account...');
  await createTestTenant(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Tenant/Account created');

  // -------------------------------------------------------------------------
  // SETUP: Create Test Integrations
  // -------------------------------------------------------------------------
  log('\n📝 Setting up test integrations...');
  const testIntegrations = await setupTestIntegrations(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Test integrations created');

  // -------------------------------------------------------------------------
  // SETUP: Get Repositories
  // -------------------------------------------------------------------------
  const { releaseRepo, cronJobRepo, releaseTaskRepo, regressionCycleRepo, platformMappingRepo, releaseUploadsRepo } = createRepositories(sequelize);

  // -------------------------------------------------------------------------
  // STEP 1: Create Release with hasManualBuildUpload = true
  // -------------------------------------------------------------------------
  log('\n📝 STEP 1: Creating Release with hasManualBuildUpload = true...');
  
  const now = new Date();
  const release = await createTestRelease(releaseRepo, {
    tenantId: testIds.tenantId,
    accountId: testIds.accountId,
    branch: `release/v${TEST_CONFIG.VERSION}`,
    targetReleaseDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    kickOffDate: now,
    releaseConfigId: testIntegrations.releaseConfigId,
    hasManualBuildUpload: TEST_CONFIG.HAS_MANUAL_BUILD_UPLOAD // ✅ Phase 18!
  });
  
  log(`✅ Release created: ${release.releaseId}`);
  log(`   hasManualBuildUpload = ${release.hasManualBuildUpload}`);

  // -------------------------------------------------------------------------
  // STEP 2: Create Platform Target Mappings
  // -------------------------------------------------------------------------
  log('\n📝 STEP 2: Creating Platform Target Mappings...');
  
  const PlatformTargetMappingModel = sequelize.models.PlatformTargetMapping || createPlatformTargetMappingModel(sequelize);
  
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
    log(`  ✅ ${platform} → ${target} (v${TEST_CONFIG.VERSION})`);
  }

  // -------------------------------------------------------------------------
  // STEP 3: Create Cron Job with Regression Slots
  // -------------------------------------------------------------------------
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

  log(`✅ Cron job created with ${TEST_CONFIG.NUM_SLOTS} slots:`);
  slotTimes.forEach((time, i) => {
    log(`   Slot ${i + 1}: ${time.toLocaleTimeString()}`);
  });

  // -------------------------------------------------------------------------
  // STEP 4: Create Stage 1 Tasks
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // ✅ PHASE 18: STEP 5 - Upload Manual Builds BEFORE kickoff
  // -------------------------------------------------------------------------
  log('\n📝 STEP 5 [Phase 18]: Uploading Manual Builds (PRE_REGRESSION)...');
  
  for (const platform of TEST_CONFIG.PLATFORMS) {
    const upload = await uploadManualBuild(releaseUploadsRepo, {
      tenantId: testIds.tenantId,
      releaseId: release.id,
      platform,
      stage: 'KICKOFF',
      artifactPath: `s3://phase18-test/${platform.toLowerCase()}-pre-reg-${Date.now()}.${platform === PlatformName.IOS ? 'ipa' : 'apk'}`
    });
    log(`  ✅ Uploaded ${platform} build: ${upload.artifactPath}`);
  }
  
  // Verify uploads exist
  const preRegUploads = await releaseUploadsRepo.findUnused(release.id, 'KICKOFF');
  log(`  📦 ${preRegUploads.length} PRE_REGRESSION uploads in staging table`);

  // -------------------------------------------------------------------------
  // STEP 6: Start Cron Job
  // -------------------------------------------------------------------------
  log('\n📝 STEP 6: Starting Cron Job...');
  
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
  const uploadedCycles = new Set<string>(); // Track which cycles have uploads

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
    
    // ✅ PHASE 18: Check for tasks waiting for manual builds and upload for each cycle
    if (currentCronJob.stage2Status === StageStatus.IN_PROGRESS) {
      // Find any AWAITING_MANUAL_BUILD tasks that need uploads (Manual mode uses this status!)
      const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
      const waitingTasks = allTasks.filter(t => 
        t.taskType === TaskType.TRIGGER_REGRESSION_BUILDS && 
        t.taskStatus === TaskStatus.AWAITING_MANUAL_BUILD &&  // Fixed: was AWAITING_CALLBACK
        t.regressionId &&
        !uploadedCycles.has(t.regressionId)
      );
      
      for (const task of waitingTasks) {
        const cycleId = task.regressionId!;
        log(`\n📦 [Phase 18] Cycle ${cycleId.substring(0, 8)} waiting - Uploading REGRESSION builds...`);
        
        for (const platform of TEST_CONFIG.PLATFORMS) {
          await uploadManualBuild(releaseUploadsRepo, {
            tenantId: testIds.tenantId,
            releaseId: release.id,
            platform,
            stage: 'REGRESSION',
            artifactPath: `s3://phase18-test/${platform.toLowerCase()}-reg-${cycleId.substring(0, 8)}-${Date.now()}.${platform === PlatformName.IOS ? 'ipa' : 'apk'}`
          });
          log(`  ✅ Uploaded ${platform} REGRESSION build for cycle ${cycleId.substring(0, 8)}`);
        }
        uploadedCycles.add(cycleId);
      }
    }

    // ✅ PHASE 18: Handle Stage 3 (PRE_RELEASE) uploads
    // Stage 3 uses TRIGGER_TEST_FLIGHT_BUILD (iOS) and CREATE_AAB_BUILD (Android)
    if (currentCronJob.stage3Status === StageStatus.IN_PROGRESS) {
      const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
      const stage3WaitingTasks = allTasks.filter(t => 
        (t.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD || t.taskType === TaskType.CREATE_AAB_BUILD) && 
        t.taskStatus === TaskStatus.AWAITING_MANUAL_BUILD
      );
      
      for (const task of stage3WaitingTasks) {
        const platform = task.taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD ? PlatformName.IOS : PlatformName.ANDROID;
        log(`\n📦 [Phase 18] Stage 3 task ${task.taskType} waiting - Uploading PRE_RELEASE build for ${platform}...`);
        
        await uploadManualBuild(releaseUploadsRepo, {
          tenantId: testIds.tenantId,
          releaseId: release.id,
          platform,
          stage: 'PRE_RELEASE',
          artifactPath: `s3://phase18-test/${platform.toLowerCase()}-pre-release-${Date.now()}.${platform === PlatformName.IOS ? 'ipa' : 'apk'}`
        });
        log(`  ✅ Uploaded ${platform} PRE_RELEASE build`);
      }
    }

    if (currentStatus !== lastLoggedStatus || iteration % 10 === 0) {
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
        storage as any,
        platformMappingRepo,   // ✅ Required for platform list
        releaseUploadsRepo     // ✅ Phase 18: Required for manual upload processing!
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
  const allUploads = await sequelize.query(`SELECT * FROM release_uploads WHERE releaseId = '${release.id}'`);

  const totalDuration = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalDuration / 60);
  const seconds = totalDuration % 60;

  log('\n' + '='.repeat(60));
  log('📊 FINAL STATUS');
  log('='.repeat(60));
  log(`\n⏱️  Total Duration: ${minutes}m ${seconds}s`);
  log(`\n📋 Release: ${finalRelease?.releaseId} (${finalRelease?.status})`);
  log(`   hasManualBuildUpload: ${finalRelease?.hasManualBuildUpload}`);
  log(`\n📋 Cron Status: ${finalCronJob?.cronStatus}`);
  log(`   Stage 1: ${finalCronJob?.stage1Status}`);
  log(`   Stage 2: ${finalCronJob?.stage2Status}`);
  log(`   Stage 3: ${finalCronJob?.stage3Status}`);
  
  log(`\n📋 Tasks (${allTasks.length} total):`);
  for (const task of allTasks) {
    const icon = task.taskStatus === 'COMPLETED' ? '✅' : task.taskStatus === 'FAILED' ? '❌' : task.taskStatus === 'AWAITING_CALLBACK' ? '⏳' : '⏳';
    log(`   ${icon} [${task.stage}] ${task.taskType}: ${task.taskStatus}`);
  }
  
  log(`\n📋 Regression Cycles (${allCycles.length}):`);
  for (const cycle of allCycles) {
    const icon = cycle.status === 'DONE' ? '✅' : '⏳';
    log(`   ${icon} Cycle ${cycle.cycleTag}: ${cycle.status}`);
  }
  
  log(`\n📋 Release Uploads (Phase 18):`);
  log(`   Total uploads: ${(allUploads[0] as any[]).length}`);
  log(`   Used uploads: ${(allUploads[0] as any[]).filter((u: any) => u.isUsed).length}`);
  log(`   Unused uploads: ${(allUploads[0] as any[]).filter((u: any) => !u.isUsed).length}`);

  // -------------------------------------------------------------------------
  // PRINT DATABASE STATE
  // -------------------------------------------------------------------------
  await printDatabaseState(sequelize, release.id);

  // -------------------------------------------------------------------------
  // SQL QUERIES FOR MANUAL INSPECTION
  // -------------------------------------------------------------------------
  log('\n⚠️  DATA NOT CLEANED UP - All records preserved in database for inspection');
  log(`   To query: mysql -u root -proot ${DB_NAME}`);
  log(`   SELECT * FROM releases WHERE id = '${release.id}';`);
  log(`   SELECT * FROM cron_jobs WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_tasks WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM regression_cycles WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_uploads WHERE releaseId = '${release.id}';  -- Phase 18!`);
  log(`   SELECT * FROM builds WHERE releaseId = '${release.id}';`);

  // Close database
  await sequelize.close();
  log('\n✅ Database connection closed (data preserved)');

  // Final result
  const success = finalCronJob?.cronStatus === CronStatus.COMPLETED && 
                  finalCronJob?.stage3Status === StageStatus.COMPLETED;
  
  log('\n' + '='.repeat(60));
  if (success) {
    log(`🏁 PHASE 18 TEST PASSED ✅ in ${minutes}m ${seconds}s`);
  } else {
    log(`🏁 PHASE 18 TEST INCOMPLETE ⚠️ in ${minutes}m ${seconds}s`);
    log('   Check the tasks above for AWAITING_CALLBACK (waiting for manual builds)');
  }
  log('='.repeat(60) + '\n');
}

// Run the test
runPhase18ManualUploadSimulation().catch(console.error);

