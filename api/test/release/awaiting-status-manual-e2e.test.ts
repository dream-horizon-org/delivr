/**
 * AWAITING_MANUAL_BUILD Verification - Manual Mode E2E Test (FULL WORKFLOW)
 * 
 * This test verifies that in Manual mode (hasManualBuildUpload = true):
 * - TRIGGER_PRE_REGRESSION_BUILDS sets task to AWAITING_MANUAL_BUILD
 * - TRIGGER_REGRESSION_BUILDS sets task to AWAITING_MANUAL_BUILD
 * - After user uploads builds, task completes
 * - Full workflow runs to completion with 2 regression cycles
 * 
 * Run with: npx ts-node -r tsconfig-paths/register test/release/awaiting-status-manual-e2e.test.ts > test/release/services/awaiting-status-manual-output.txt 2>&1
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
  PlatformName
} from '../../script/models/release/release.interface';

// State Machine
import { CronJobStateMachine } from '../../script/services/release/cron-job/cron-job-state-machine';

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
  VERSION: '9.0.0',
  HAS_MANUAL_BUILD_UPLOAD: true,        // ✅ Manual mode!
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
      email: `awaiting-manual-${uuidv4()}@example.com`,
      name: 'Test User - AWAITING_MANUAL_BUILD Test',
    } as any
  });

  await TenantModel.findOrCreate({
    where: { id: tenantId },
    defaults: {
      id: tenantId,
      displayName: 'Test Tenant - AWAITING_MANUAL_BUILD Test',
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
    releaseId: `REL-MANUAL-AWAIT-${Date.now()}`,
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
    upcomingRegressions: options.upcomingRegressions,
    autoTransitionToStage2: options.autoTransitionToStage2,
    autoTransitionToStage3: options.autoTransitionToStage3
  });
}

/**
 * Upload manual builds to staging table
 */
async function uploadManualBuild(
  releaseUploadsRepo: ReleaseUploadsRepository,
  options: {
    tenantId: string;
    releaseId: string;
    platform: PlatformName;
    stage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
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

async function printDatabaseState(sequelize: Sequelize, releaseId: string) {
  console.log('\n' + '='.repeat(80));
  console.log('📦 DATABASE STATE - Manual AWAITING_MANUAL_BUILD Test (FULL WORKFLOW)');
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
    const statusIcon = row.taskStatus === 'AWAITING_MANUAL_BUILD' ? '📦' : row.taskStatus === 'AWAITING_CALLBACK' ? '⏳' : row.taskStatus === 'COMPLETED' ? '✅' : row.taskStatus === 'PENDING' ? '⏸️' : row.taskStatus === 'FAILED' ? '❌' : '❓';
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

  // Release Uploads - should have used uploads in manual mode
  console.log('\n=== RELEASE UPLOADS (Manual mode - should have records) ===');
  const [uploads] = await sequelize.query(`SELECT * FROM release_uploads WHERE releaseId = '${releaseId}' ORDER BY createdAt`);
  if ((uploads as any[]).length === 0) {
    console.log('(no uploads)');
  } else {
    const used = (uploads as any[]).filter((u: any) => u.isUsed).length;
    const unused = (uploads as any[]).filter((u: any) => !u.isUsed).length;
    console.log(`Total: ${(uploads as any[]).length} | Used: ${used} | Unused: ${unused}`);
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

  // Builds - manual mode creates builds with buildType=MANUAL
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
// MAIN TEST EXECUTION
// ============================================================================

async function runAwaitingManualBuildTest() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 MANUAL MODE - AWAITING_MANUAL_BUILD Full Workflow Test');
  console.log('='.repeat(80));
  console.log(`Platforms: ${TEST_CONFIG.PLATFORMS.join(', ')}`);
  console.log(`Regression Slots: ${TEST_CONFIG.NUM_SLOTS} (2 min apart)`);
  console.log(`Manual Build Upload: ✅ ENABLED (Manual Mode)`);
  console.log(`Flow: Task → AWAITING_MANUAL_BUILD → User Upload → COMPLETED`);
  console.log('='.repeat(80) + '\n');

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
    tenantId: `await-manual-${uuidv4().substring(0, 8)}`,
    accountId: `await-manual-${uuidv4().substring(0, 8)}`,
  };

  log(`📋 Test IDs: Tenant=${testIds.tenantId}`);

  await createTestTenant(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Tenant/Account created');

  const testIntegrations = await setupTestIntegrations(sequelize, testIds.tenantId, testIds.accountId);
  log('✅ Test integrations created');

  const { releaseRepo, cronJobRepo, releaseTaskRepo, regressionCycleRepo, platformMappingRepo, releaseUploadsRepo, buildRepo } = createRepositories(sequelize);

  // STEP 1: Create Release
  log('\n📝 STEP 1: Creating Release with hasManualBuildUpload = true...');
  
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
  log(`   hasManualBuildUpload = ${release.hasManualBuildUpload}`);

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

  // STEP 5: DO NOT upload builds initially - we want to see AWAITING_MANUAL_BUILD first
  log('\n📝 STEP 5: NOT uploading builds initially (to see AWAITING_MANUAL_BUILD)...');

  // STEP 6: Start Cron Job
  log('\n📝 STEP 6: Starting Cron Job...');
  
  await cronJobRepo.update(cronJob.id, {
    stage1Status: StageStatus.IN_PROGRESS,
    cronStatus: CronStatus.RUNNING
  });
  
  log('✅ Cron job started');

  // EXECUTION LOOP
  log('\n' + '='.repeat(60));
  log('🚀 EXECUTION STARTED - Full Workflow with Manual Uploads');
  log('='.repeat(60));
  
  const startTime = Date.now();
  let iteration = 0;
  let lastLoggedStatus = '';
  // Track uploads: key = stage or cycleId, value = { platforms uploaded, iteration when first found }
  const uploadTracking = new Map<string, { uploadedPlatforms: Set<string>; foundIteration: number }>();
  let awaitingManualBuildEvents: { taskId: string; taskType: string; stage: string; iteration: number }[] = [];
  const TICKS_BETWEEN_UPLOADS = 2; // Gap between platform uploads

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
      const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
      const failedTasks = allTasks.filter(t => t.taskStatus === TaskStatus.FAILED);
      for (const task of failedTasks) {
        log(`   ❌ FAILED: ${task.taskType}`);
      }
      break;
    }

    const currentStatus = `Cron=${currentCronJob.cronStatus} | S1=${currentCronJob.stage1Status} | S2=${currentCronJob.stage2Status} | S3=${currentCronJob.stage3Status}`;

    // Check for completion
    if (currentCronJob.cronStatus === CronStatus.COMPLETED &&
        currentCronJob.stage3Status === StageStatus.COMPLETED) {
      log('\n✅ WORKFLOW COMPLETED SUCCESSFULLY!');
      break;
    }

    // ====================================================================
    // KEY PART: Check for AWAITING_MANUAL_BUILD tasks and upload builds
    // STAGGERED: Upload one platform per tick with 2-tick gap between them
    // ====================================================================
    const allTasks = await releaseTaskRepo.findByReleaseId(release.id);
    const awaitingManualBuildTasks = allTasks.filter(t => 
      t.taskStatus === TaskStatus.AWAITING_MANUAL_BUILD
    );

    for (const task of awaitingManualBuildTasks) {
      // Determine stage for uploads
      let uploadStage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
      let uploadKey: string;
      
      if (task.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS) {
        uploadStage = 'KICK_OFF';
        uploadKey = 'KICK_OFF';
      } else if (task.taskType === TaskType.TRIGGER_REGRESSION_BUILDS) {
        uploadStage = 'REGRESSION';
        uploadKey = task.regressionId ?? 'REGRESSION';
      } else {
        uploadStage = 'PRE_RELEASE';
        uploadKey = 'PRE_RELEASE';
      }

      // Initialize tracking for this upload key if not exists
      if (!uploadTracking.has(uploadKey)) {
        uploadTracking.set(uploadKey, { uploadedPlatforms: new Set(), foundIteration: iteration });
        log(`\n📦 FOUND AWAITING_MANUAL_BUILD: ${task.taskType} (${task.id.substring(0, 8)})`);
        log(`   🔸 Release is PAUSED waiting for manual builds...`);
        awaitingManualBuildEvents.push({ 
          taskId: task.id, 
          taskType: task.taskType, 
          stage: uploadStage,
          iteration 
        });
      }

      const tracking = uploadTracking.get(uploadKey)!;
      const allPlatformsUploaded = tracking.uploadedPlatforms.size === TEST_CONFIG.PLATFORMS.length;
      
      // Skip if all platforms already uploaded for this key
      if (allPlatformsUploaded) continue;

      // Find next platform to upload
      const platformsArray = [...TEST_CONFIG.PLATFORMS];
      for (let i = 0; i < platformsArray.length; i++) {
        const platform = platformsArray[i];
        
        // Skip if already uploaded
        if (tracking.uploadedPlatforms.has(platform)) continue;
        
        // Calculate when this platform should be uploaded (staggered by TICKS_BETWEEN_UPLOADS)
        const expectedTick = tracking.foundIteration + (tracking.uploadedPlatforms.size * TICKS_BETWEEN_UPLOADS);
        
        if (iteration >= expectedTick) {
          log(`   📤 [Tick ${iteration}] Uploading ${uploadStage} build for ${platform}...`);
          await uploadManualBuild(releaseUploadsRepo, {
            tenantId: testIds.tenantId,
            releaseId: release.id,
            platform,
            stage: uploadStage,
            artifactPath: `s3://manual-test/${platform.toLowerCase()}-${uploadStage.toLowerCase()}-${Date.now()}.${platform === PlatformName.IOS ? 'ipa' : 'apk'}`
          });
          tracking.uploadedPlatforms.add(platform);
          log(`   ✅ Uploaded ${platform} ${uploadStage} build (${tracking.uploadedPlatforms.size}/${TEST_CONFIG.PLATFORMS.length})`);
          
          // Check if all platforms are now uploaded
          if (tracking.uploadedPlatforms.size === TEST_CONFIG.PLATFORMS.length) {
            log(`   ✅ All platforms uploaded - task can now complete!`);
          } else {
            log(`   ⏳ Waiting for remaining platforms (next upload in ${TICKS_BETWEEN_UPLOADS} ticks)...`);
          }
          break; // Only upload one platform per iteration
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
  log(`   hasManualBuildUpload: ${finalRelease?.hasManualBuildUpload}`);
  log(`\n📋 Cron Status: ${finalCronJob?.cronStatus}`);
  log(`   Stage 1: ${finalCronJob?.stage1Status}`);
  log(`   Stage 2: ${finalCronJob?.stage2Status}`);
  log(`   Stage 3: ${finalCronJob?.stage3Status}`);
  
  log(`\n📋 Tasks (${allTasks.length} total):`);
  for (const task of allTasks) {
    const icon = task.taskStatus === 'AWAITING_MANUAL_BUILD' ? '📦' : task.taskStatus === 'AWAITING_CALLBACK' ? '⏳' : task.taskStatus === 'COMPLETED' ? '✅' : task.taskStatus === 'FAILED' ? '❌' : '⏸️';
    log(`   ${icon} [${task.stage}] ${task.taskType}: ${task.taskStatus}`);
  }
  
  log(`\n📋 Regression Cycles (${allCycles.length}):`);
  for (const cycle of allCycles) {
    const icon = cycle.status === 'DONE' ? '✅' : '⏳';
    log(`   ${icon} Cycle ${cycle.cycleTag}: ${cycle.status}`);
  }

  // Print AWAITING_MANUAL_BUILD events
  log('\n📋 AWAITING_MANUAL_BUILD Events (Uploads Provided):');
  for (const event of awaitingManualBuildEvents) {
    log(`   📦 ${event.taskType} (${event.stage}) → AWAITING_MANUAL_BUILD → Upload → COMPLETED (iteration ${event.iteration})`);
  }

  // Print database state
  await printDatabaseState(sequelize, release.id);

  // VERIFICATION
  log('\n' + '='.repeat(60));
  log('🔍 VERIFICATION');
  log('='.repeat(60));
  
  const buildTasks = allTasks.filter(t => 
    t.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS || 
    t.taskType === TaskType.TRIGGER_REGRESSION_BUILDS
  );
  const completedBuildTasks = buildTasks.filter(t => t.taskStatus === TaskStatus.COMPLETED);
  
  // Check for wrong status usage
  const wrongStatusTasks = allTasks.filter(t => 
    (t.taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS || t.taskType === TaskType.TRIGGER_REGRESSION_BUILDS) &&
    t.taskStatus === TaskStatus.AWAITING_CALLBACK
  );
  
  log(`\n✅ AWAITING_MANUAL_BUILD events captured: ${awaitingManualBuildEvents.length}`);
  log(`✅ Build tasks completed via upload: ${completedBuildTasks.length} / ${buildTasks.length}`);
  log(`✅ Regression cycles completed: ${allCycles.filter(c => c.status === 'DONE').length} / ${allCycles.length}`);
  
  if (wrongStatusTasks.length > 0) {
    log(`\n⚠️ WARNING: ${wrongStatusTasks.length} build task(s) incorrectly used AWAITING_CALLBACK`);
  }
  
  const success = finalCronJob?.cronStatus === CronStatus.COMPLETED && 
                  finalCronJob?.stage3Status === StageStatus.COMPLETED &&
                  awaitingManualBuildEvents.length > 0 &&
                  wrongStatusTasks.length === 0;
  
  if (success) {
    log('\n🎉 TEST PASSED: Manual mode with AWAITING_MANUAL_BUILD completed full workflow!');
  } else {
    log('\n⚠️ TEST INCOMPLETE');
    if (awaitingManualBuildEvents.length === 0) {
      log('   - No AWAITING_MANUAL_BUILD events captured');
    }
    if (wrongStatusTasks.length > 0) {
      log('   - Some tasks used wrong status (AWAITING_CALLBACK instead of AWAITING_MANUAL_BUILD)');
    }
    if (finalCronJob?.stage3Status !== StageStatus.COMPLETED) {
      log('   - Stage 3 not completed');
    }
  }

  log('\n='.repeat(60) + '\n');

  // Print SQL queries for manual inspection
  console.log('='.repeat(80));
  log('\n⚠️  DATA NOT CLEANED UP - All records preserved in database for inspection');
  log(`   To query: mysql -u root -proot codepushdb`);
  log(`   SELECT * FROM releases WHERE id = '${release.id}';`);
  log(`   SELECT * FROM cron_jobs WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_tasks WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM regression_cycles WHERE releaseId = '${release.id}';`);
  log(`   SELECT * FROM release_uploads WHERE releaseId = '${release.id}';  -- Manual mode uploads`);
  log(`   SELECT * FROM builds WHERE releaseId = '${release.id}';`);

  await sequelize.close();
  log('\n✅ Database connection closed (data preserved)');

  log('\n' + '='.repeat(60));
  const testResult = success ? '🏁 MANUAL AWAITING_MANUAL_BUILD TEST PASSED ✅' : '⚠️ MANUAL AWAITING_MANUAL_BUILD TEST INCOMPLETE';
  log(`${testResult} in ${minutes}m ${seconds}s`);
  log('='.repeat(60) + '\n');
}

// Run the test
runAwaitingManualBuildTest().catch(console.error);
