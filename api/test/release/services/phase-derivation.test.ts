/**
 * Phase Derivation Tests
 * 
 * Tests the phase derivation logic that calculates the current phase
 * of a release based on release status, stage statuses, cron status,
 * pause type, and regression cycle status.
 * 
 * Reference: RELEASE_STATUS_GUIDE.md
 * 
 * Run: jest api/test/release/services/phase-derivation.test.ts --runInBand
 * 
 * Prerequisites:
 * 1. Database running (mysql -u root -proot)
 * 2. Migration 018 applied
 */

import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// Repositories
import { ReleaseRepository } from '../../../script/models/release/release.repository';
import { CronJobRepository } from '../../../script/models/release/cron-job.repository';
import { RegressionCycleRepository } from '../../../script/models/release/regression-cycle.repository';

// Model creation
import { createReleaseModel } from '../../../script/models/release/release.sequelize.model';
import { createCronJobModel } from '../../../script/models/release/cron-job.sequelize.model';
import { createRegressionCycleModel } from '../../../script/models/release/regression-cycle.sequelize.model';

// Enums
import { 
  StageStatus, 
  CronStatus, 
  RegressionCycleStatus 
} from '../../../script/models/release/release.interface';

// Phase derivation from production code (Phase 16)
import { derivePhase, DerivePhaseInput } from '../../../script/services/release/release-retrieval.service';

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const DB_NAME = process.env.DB_NAME || 'codepushdb';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

// ============================================================================
// TEST HELPERS
// ============================================================================

let cachedRepos: {
  releaseRepo: ReleaseRepository;
  cronJobRepo: CronJobRepository;
  regressionCycleRepo: RegressionCycleRepository;
} | null = null;

function getOrCreateRepos(sequelize: Sequelize) {
  if (!cachedRepos) {
    const releaseModel = createReleaseModel(sequelize);
    const cronJobModel = createCronJobModel(sequelize);
    const regressionCycleModel = createRegressionCycleModel(sequelize);
    
    cachedRepos = {
      releaseRepo: new ReleaseRepository(releaseModel),
      cronJobRepo: new CronJobRepository(cronJobModel),
      regressionCycleRepo: new RegressionCycleRepository(regressionCycleModel)
    };
  }
  return cachedRepos;
}

async function createTestRelease(
  releaseRepo: ReleaseRepository,
  options: { tenantId: string; accountId: string; status?: string }
) {
  const id = uuidv4();
  return releaseRepo.create({
    id,
    releaseId: `REL-${Date.now()}`,
    releaseConfigId: null,
    tenantId: options.tenantId,
    status: (options.status || 'IN_PROGRESS') as any,
    type: 'MINOR',
    branch: `release/v${Date.now()}`,
    baseBranch: 'master',
    baseReleaseId: null,
    kickOffReminderDate: null,
    kickOffDate: new Date(),
    targetReleaseDate: new Date(),
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
    stage1Status?: string;
    stage2Status?: string;
    stage3Status?: string;
    cronStatus?: string;
  }
) {
  const id = uuidv4();
  return cronJobRepo.create({
    id,
    releaseId: options.releaseId,
    cronCreatedByAccountId: options.accountId,
    cronStatus: (options.cronStatus || 'PENDING') as any,
    stage1Status: (options.stage1Status || 'PENDING') as any,
    stage2Status: (options.stage2Status || 'PENDING') as any,
    stage3Status: (options.stage3Status || 'PENDING') as any,
    cronConfig: { enabled: true },
    upcomingRegressions: [],
    autoTransitionToStage2: true,
    autoTransitionToStage3: false
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('Phase Derivation - Phase 16', () => {
  let sequelize: Sequelize;
  let releaseRepo: ReleaseRepository;
  let cronJobRepo: CronJobRepository;
  let regressionCycleRepo: RegressionCycleRepository;
  
  const testTenantId = uuidv4();
  const testAccountId = uuidv4();

  beforeAll(async () => {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'mysql',
      logging: false
    });
    
    await sequelize.authenticate();
    
    const repos = getOrCreateRepos(sequelize);
    releaseRepo = repos.releaseRepo;
    cronJobRepo = repos.cronJobRepo;
    regressionCycleRepo = repos.regressionCycleRepo;
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
    cachedRepos = null;
  });

  // -------------------------------------------------------------------------
  // Pure Logic Tests (No DB)
  // -------------------------------------------------------------------------
  describe('derivePhase() logic', () => {
    
    it('should return NOT_STARTED when release PENDING and cron PENDING', () => {
      const phase = derivePhase({
        releaseStatus: 'PENDING',
        stage1Status: 'PENDING',
        stage2Status: 'PENDING',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'PENDING',
        pauseType: 'NONE'
      });
      expect(phase).toBe('NOT_STARTED');
    });

    it('should return KICKOFF when stage1 IN_PROGRESS', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'IN_PROGRESS',
        stage2Status: 'PENDING',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'RUNNING',
        pauseType: 'NONE'
      });
      expect(phase).toBe('KICKOFF');
    });

    it('should return AWAITING_REGRESSION when stage1 COMPLETED and stage2 PENDING', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'COMPLETED',
        stage2Status: 'PENDING',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'PAUSED',
        pauseType: 'AWAITING_STAGE_TRIGGER'
      });
      expect(phase).toBe('AWAITING_REGRESSION');
    });

    it('should return REGRESSION when stage2 IN_PROGRESS', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'COMPLETED',
        stage2Status: 'IN_PROGRESS',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'RUNNING',
        pauseType: 'NONE',
        currentCycleStatus: 'IN_PROGRESS',
        hasNextCycle: true
      });
      expect(phase).toBe('REGRESSION');
    });

    it('should return REGRESSION_AWAITING_NEXT_CYCLE when cycle DONE and hasNextCycle', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'COMPLETED',
        stage2Status: 'IN_PROGRESS',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'RUNNING',
        pauseType: 'NONE',
        currentCycleStatus: 'DONE',
        hasNextCycle: true
      });
      expect(phase).toBe('REGRESSION_AWAITING_NEXT_CYCLE');
    });

    it('should return AWAITING_POST_REGRESSION when stage2 COMPLETED and stage3 PENDING', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'COMPLETED',
        stage2Status: 'COMPLETED',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'PAUSED',
        pauseType: 'AWAITING_STAGE_TRIGGER'
      });
      expect(phase).toBe('AWAITING_POST_REGRESSION');
    });

    it('should return POST_REGRESSION when stage3 IN_PROGRESS', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'COMPLETED',
        stage2Status: 'COMPLETED',
        stage3Status: 'IN_PROGRESS',
        stage4Status: 'PENDING',
        cronStatus: 'RUNNING',
        pauseType: 'NONE'
      });
      expect(phase).toBe('POST_REGRESSION');
    });

    it('should return AWAITING_SUBMISSION when stage3 COMPLETED and stage4 PENDING', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'COMPLETED',
        stage2Status: 'COMPLETED',
        stage3Status: 'COMPLETED',
        stage4Status: 'PENDING',
        cronStatus: 'PAUSED',
        pauseType: 'AWAITING_STAGE_TRIGGER'
      });
      expect(phase).toBe('AWAITING_SUBMISSION');
    });

    it('should return SUBMISSION when stage4 IN_PROGRESS', () => {
      const phase = derivePhase({
        releaseStatus: 'IN_PROGRESS',
        stage1Status: 'COMPLETED',
        stage2Status: 'COMPLETED',
        stage3Status: 'COMPLETED',
        stage4Status: 'IN_PROGRESS',
        cronStatus: 'RUNNING',
        pauseType: 'NONE'
      });
      expect(phase).toBe('SUBMISSION');
    });

    it('should return SUBMITTED_PENDING_APPROVAL when release SUBMITTED', () => {
      const phase = derivePhase({
        releaseStatus: 'SUBMITTED',
        stage1Status: 'COMPLETED',
        stage2Status: 'COMPLETED',
        stage3Status: 'COMPLETED',
        stage4Status: 'IN_PROGRESS',
        cronStatus: 'RUNNING',
        pauseType: 'NONE'
      });
      expect(phase).toBe('SUBMITTED_PENDING_APPROVAL');
    });

    it('should return COMPLETED when release COMPLETED', () => {
      const phase = derivePhase({
        releaseStatus: 'COMPLETED',
        stage1Status: 'COMPLETED',
        stage2Status: 'COMPLETED',
        stage3Status: 'COMPLETED',
        stage4Status: 'COMPLETED',
        cronStatus: 'COMPLETED',
        pauseType: 'NONE'
      });
      expect(phase).toBe('COMPLETED');
    });

    it('should return PAUSED_BY_USER when release PAUSED and pauseType USER_REQUESTED', () => {
      const phase = derivePhase({
        releaseStatus: 'PAUSED',
        stage1Status: 'COMPLETED',
        stage2Status: 'IN_PROGRESS',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'PAUSED',
        pauseType: 'USER_REQUESTED'
      });
      expect(phase).toBe('PAUSED_BY_USER');
    });

    it('should return PAUSED_BY_FAILURE when release PAUSED and pauseType TASK_FAILURE', () => {
      const phase = derivePhase({
        releaseStatus: 'PAUSED',
        stage1Status: 'IN_PROGRESS',
        stage2Status: 'PENDING',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'PAUSED',
        pauseType: 'TASK_FAILURE'
      });
      expect(phase).toBe('PAUSED_BY_FAILURE');
    });

    it('should return ARCHIVED when release ARCHIVED', () => {
      const phase = derivePhase({
        releaseStatus: 'ARCHIVED',
        stage1Status: 'IN_PROGRESS',
        stage2Status: 'PENDING',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'PAUSED',
        pauseType: 'NONE'
      });
      expect(phase).toBe('ARCHIVED');
    });
  });

  // -------------------------------------------------------------------------
  // Priority Tests
  // -------------------------------------------------------------------------
  describe('Phase priority', () => {
    
    it('should prioritize ARCHIVED over any other state', () => {
      const phase = derivePhase({
        releaseStatus: 'ARCHIVED',
        stage1Status: 'IN_PROGRESS', // Would normally be KICKOFF
        stage2Status: 'PENDING',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'RUNNING',
        pauseType: 'USER_REQUESTED' // Would normally be PAUSED_BY_USER
      });
      expect(phase).toBe('ARCHIVED');
    });

    it('should prioritize COMPLETED over stage statuses', () => {
      const phase = derivePhase({
        releaseStatus: 'COMPLETED',
        stage1Status: 'IN_PROGRESS', // Invalid state combo
        stage2Status: 'PENDING',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'RUNNING',
        pauseType: 'NONE'
      });
      expect(phase).toBe('COMPLETED');
    });

    it('should prioritize PAUSED over stage IN_PROGRESS', () => {
      const phase = derivePhase({
        releaseStatus: 'PAUSED',
        stage2Status: 'IN_PROGRESS', // Would normally be REGRESSION
        stage1Status: 'COMPLETED',
        stage3Status: 'PENDING',
        stage4Status: 'PENDING',
        cronStatus: 'PAUSED',
        pauseType: 'USER_REQUESTED'
      });
      expect(phase).toBe('PAUSED_BY_USER');
    });
  });

  // -------------------------------------------------------------------------
  // Integration Tests (With DB)
  // -------------------------------------------------------------------------
  describe('Phase derivation with real DB data', () => {
    
    it('should derive NOT_STARTED for new release', async () => {
      const release = await createTestRelease(releaseRepo, {
        tenantId: testTenantId,
        accountId: testAccountId,
        status: 'PENDING'
      });
      
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId: release.id,
        accountId: testAccountId,
        cronStatus: 'PENDING',
        stage1Status: 'PENDING'
      });
      
      const phase = derivePhase({
        releaseStatus: release.status,
        stage1Status: cronJob.stage1Status,
        stage2Status: cronJob.stage2Status,
        stage3Status: cronJob.stage3Status,
        stage4Status: 'PENDING', // TODO: Add stage4Status to cronJob model
        cronStatus: cronJob.cronStatus,
        pauseType: 'NONE' // TODO: Add pauseType to cronJob model
      });
      
      expect(phase).toBe('NOT_STARTED');
    });

    it('should derive KICKOFF when stage1 running', async () => {
      const release = await createTestRelease(releaseRepo, {
        tenantId: testTenantId,
        accountId: testAccountId,
        status: 'IN_PROGRESS'
      });
      
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId: release.id,
        accountId: testAccountId,
        cronStatus: 'RUNNING',
        stage1Status: 'IN_PROGRESS'
      });
      
      const phase = derivePhase({
        releaseStatus: release.status,
        stage1Status: cronJob.stage1Status,
        stage2Status: cronJob.stage2Status,
        stage3Status: cronJob.stage3Status,
        stage4Status: 'PENDING',
        cronStatus: cronJob.cronStatus,
        pauseType: 'NONE'
      });
      
      expect(phase).toBe('KICKOFF');
    });

    it('should derive AWAITING_REGRESSION when stage1 complete', async () => {
      const release = await createTestRelease(releaseRepo, {
        tenantId: testTenantId,
        accountId: testAccountId,
        status: 'IN_PROGRESS'
      });
      
      const cronJob = await createTestCronJob(cronJobRepo, {
        releaseId: release.id,
        accountId: testAccountId,
        cronStatus: 'PAUSED',
        stage1Status: 'COMPLETED',
        stage2Status: 'PENDING'
      });
      
      const phase = derivePhase({
        releaseStatus: release.status,
        stage1Status: cronJob.stage1Status,
        stage2Status: cronJob.stage2Status,
        stage3Status: cronJob.stage3Status,
        stage4Status: 'PENDING',
        cronStatus: cronJob.cronStatus,
        pauseType: 'AWAITING_STAGE_TRIGGER'
      });
      
      expect(phase).toBe('AWAITING_REGRESSION');
    });
  });
});
