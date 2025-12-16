/**
 * Manual Build Upload - Integration Tests (TDD)
 * 
 * These tests use REAL database operations to test the manual upload feature.
 * Following TDD methodology: Tests are written FIRST and should FAIL until
 * the functionality is implemented.
 * 
 * TDD Cycle:
 * 1. RED: Write these tests → They FAIL (code doesn't exist)
 * 2. GREEN: Implement code → Tests PASS
 * 3. REFACTOR: Clean up while keeping tests green
 * 
 * Reference: MERGE_PLAN.md - HOW TO WRITE TESTS section
 * 
 * NOTE: These tests require:
 * 1. A running MySQL database
 * 2. The release_uploads table to exist (run migration 018_release_orchestration_final.sql)
 * 3. Environment variables: DB_NAME, DB_USER, DB_PASS, DB_HOST, DB_PORT
 * 
 * To run: 
 * 1. Ensure database is running and migrations are applied
 * 2. npx jest test/release/services/manual-upload-integration.test.ts --runInBand
 * 
 * Skip if database not available:
 * - Set SKIP_DB_TESTS=true to skip these tests
 */

// Skip all tests if database not configured
const SKIP_DB_TESTS = process.env.SKIP_DB_TESTS === 'true' || !process.env.DB_NAME;

import { Sequelize } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================
const DB_NAME = process.env.DB_NAME || 'codepushdb';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'root';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

// Import REAL implementations (not mocks)
import { ReleaseUploadsRepository } from '../../../script/models/release/release-uploads.repository';
import { ReleaseUploadModel, createReleaseUploadModel } from '../../../script/models/release/release-uploads.sequelize.model';
import { PlatformName, TaskStatus, TaskType, StageStatus, ReleaseStatus } from '../../../script/models/release/release.interface';

// ============================================================================
// TEST SUITE: ReleaseUploadsRepository Integration Tests
// ============================================================================

const describeIfDb = SKIP_DB_TESTS ? describe.skip : describe;

describeIfDb('ReleaseUploadsRepository - Integration Tests (TDD)', () => {
  let sequelize: Sequelize;
  let releaseUploadsRepo: ReleaseUploadsRepository;
  let ReleaseUploadModelInstance: typeof ReleaseUploadModel;
  
  // Test identifiers (unique per test run)
  const testTenantId = `test-tenant-${uuidv4().slice(0, 8)}`;
  const testReleaseId = `test-release-${uuidv4().slice(0, 8)}`;

  beforeAll(async () => {
    // Initialize REAL database connection
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

    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established for integration tests');
      
      // Disable foreign key checks for testing (we're testing the repository, not FK integrity)
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      console.log('✅ Foreign key checks disabled for tests');
      
      // Initialize the model (don't sync - use existing table from migration)
      ReleaseUploadModelInstance = createReleaseUploadModel(sequelize);
      
      // Create repository with REAL sequelize and model
      releaseUploadsRepo = new ReleaseUploadsRepository(sequelize, ReleaseUploadModelInstance);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (ReleaseUploadModelInstance) {
      await ReleaseUploadModelInstance.destroy({
        where: { tenantId: testTenantId }
      });
    }
    
    if (sequelize) {
      // Re-enable foreign key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Foreign key checks re-enabled');
      
      await sequelize.close();
      console.log('✅ Database connection closed');
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    if (ReleaseUploadModelInstance) {
      await ReleaseUploadModelInstance.destroy({
        where: { tenantId: testTenantId }
      });
    }
  });

  // ==========================================================================
  // TDD TEST CASE 1: Create upload entry in database
  // Expected: FAIL initially (until create() is verified working with real DB)
  // ==========================================================================
  describe('create() - REAL DB operations', () => {
    it('should create upload entry and persist to database', async () => {
      // Arrange
      const uploadData = {
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/test-artifact.apk'
      };

      // Act - Call REAL repository method
      const created = await releaseUploadsRepo.create(uploadData);

      // Assert - Should be persisted to database
      expect(created).not.toBeNull();
      expect(created.id).toBeDefined();
      expect(created.tenantId).toBe(testTenantId);
      expect(created.releaseId).toBe(testReleaseId);
      expect(created.platform).toBe(PlatformName.ANDROID);
      expect(created.stage).toBe('KICK_OFF');
      expect(created.artifactPath).toBe('s3://bucket/test-artifact.apk');
      expect(created.isUsed).toBe(false);
      expect(created.usedByTaskId).toBeNull();
      expect(created.usedByCycleId).toBeNull();

      // Verify it's actually in the database
      const fromDb = await releaseUploadsRepo.findById(created.id);
      expect(fromDb).not.toBeNull();
      expect(fromDb?.id).toBe(created.id);
    });
  });

  // ==========================================================================
  // TDD TEST CASE 2: Find unused uploads for a release
  // Expected: FAIL initially (until findUnused() is verified working)
  // ==========================================================================
  describe('findUnused() - REAL DB operations', () => {
    it('should return only unused uploads for a release and stage', async () => {
      // Arrange - Create some uploads (some used, some unused)
      const upload1 = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'REGRESSION' as const,
        artifactPath: 's3://bucket/android.apk'
      });

      const upload2 = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'REGRESSION' as const,
        artifactPath: 's3://bucket/ios.ipa'
      });

      // Mark one as used
      await releaseUploadsRepo.markAsUsed(upload1.id, 'task-123', null);

      // Act - Find unused uploads
      const unused = await releaseUploadsRepo.findUnused(testReleaseId, 'REGRESSION');

      // Assert - Should only return the unused one (IOS)
      expect(unused).toHaveLength(1);
      expect(unused[0].platform).toBe(PlatformName.IOS);
      expect(unused[0].isUsed).toBe(false);
    });

    it('should return empty array when no unused uploads exist', async () => {
      // Arrange - No uploads created

      // Act
      const unused = await releaseUploadsRepo.findUnused(testReleaseId, 'REGRESSION');

      // Assert
      expect(unused).toEqual([]);
    });
  });

  // ==========================================================================
  // TDD TEST CASE 3: Mark upload as used
  // Expected: FAIL initially (until markAsUsed() is verified working)
  // ==========================================================================
  describe('markAsUsed() - REAL DB operations', () => {
    it('should update isUsed flag and link to task', async () => {
      // Arrange
      const upload = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/android.apk'
      });

      // Act
      const taskId = 'task-' + uuidv4().slice(0, 8);
      const updated = await releaseUploadsRepo.markAsUsed(upload.id, taskId, null);

      // Assert
      expect(updated).not.toBeNull();
      expect(updated?.isUsed).toBe(true);
      expect(updated?.usedByTaskId).toBe(taskId);
      expect(updated?.usedByCycleId).toBeNull();

      // Verify in database
      const fromDb = await releaseUploadsRepo.findById(upload.id);
      expect(fromDb?.isUsed).toBe(true);
      expect(fromDb?.usedByTaskId).toBe(taskId);
    });

    it('should link to cycle for REGRESSION stage uploads', async () => {
      // Arrange
      const upload = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'REGRESSION' as const,
        artifactPath: 's3://bucket/android.apk'
      });

      // Act
      const taskId = 'task-' + uuidv4().slice(0, 8);
      const cycleId = 'cycle-' + uuidv4().slice(0, 8);
      const updated = await releaseUploadsRepo.markAsUsed(upload.id, taskId, cycleId);

      // Assert
      expect(updated?.isUsed).toBe(true);
      expect(updated?.usedByTaskId).toBe(taskId);
      expect(updated?.usedByCycleId).toBe(cycleId);
    });
  });

  // ==========================================================================
  // TDD TEST CASE 4: Upsert (create or update existing unused)
  // Expected: FAIL initially (until upsert() is verified working)
  // ==========================================================================
  describe('upsert() - REAL DB operations', () => {
    it('should create new entry when none exists', async () => {
      // Act
      const result = await releaseUploadsRepo.upsert({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'PRE_RELEASE' as const,
        artifactPath: 's3://bucket/ios-v1.ipa'
      });

      // Assert
      expect(result).not.toBeNull();
      expect(result.platform).toBe(PlatformName.IOS);
      expect(result.artifactPath).toBe('s3://bucket/ios-v1.ipa');

      // Verify only one entry exists
      const all = await releaseUploadsRepo.findByReleaseAndStage(testReleaseId, 'PRE_RELEASE');
      expect(all).toHaveLength(1);
    });

    it('should update existing unused entry (replacement)', async () => {
      // Arrange - Create initial upload
      const initial = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'PRE_RELEASE' as const,
        artifactPath: 's3://bucket/ios-v1.ipa'
      });

      // Act - Upsert with new artifact path
      const updated = await releaseUploadsRepo.upsert({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'PRE_RELEASE' as const,
        artifactPath: 's3://bucket/ios-v2.ipa' // New path
      });

      // Assert - Should update existing, not create new
      expect(updated.id).toBe(initial.id); // Same ID
      expect(updated.artifactPath).toBe('s3://bucket/ios-v2.ipa'); // Updated path

      // Verify only one entry exists
      const all = await releaseUploadsRepo.findByReleaseAndStage(testReleaseId, 'PRE_RELEASE');
      expect(all).toHaveLength(1);
    });

    it('should NOT update already-used entry (create new instead)', async () => {
      // Arrange - Create and mark as used
      const used = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'REGRESSION' as const,
        artifactPath: 's3://bucket/ios-cycle1.ipa'
      });
      await releaseUploadsRepo.markAsUsed(used.id, 'task-1', 'cycle-1');

      // Act - Upsert for same platform/stage
      const newUpload = await releaseUploadsRepo.upsert({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'REGRESSION' as const,
        artifactPath: 's3://bucket/ios-cycle2.ipa'
      });

      // Assert - Should create NEW entry (not update used one)
      expect(newUpload.id).not.toBe(used.id);
      expect(newUpload.artifactPath).toBe('s3://bucket/ios-cycle2.ipa');
      expect(newUpload.isUsed).toBe(false);

      // Verify both entries exist
      const all = await releaseUploadsRepo.findByReleaseAndStage(testReleaseId, 'REGRESSION');
      expect(all).toHaveLength(2);
    });
  });

  // ==========================================================================
  // TDD TEST CASE 5: Check all platforms ready
  // Expected: FAIL initially (until checkAllPlatformsReady() is verified)
  // ==========================================================================
  describe('checkAllPlatformsReady() - REAL DB operations', () => {
    it('should return allReady=true when all platforms have uploads', async () => {
      // Arrange - Create uploads for all required platforms
      await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/android.apk'
      });
      await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/ios.ipa'
      });

      // Act
      const result = await releaseUploadsRepo.checkAllPlatformsReady(
        testReleaseId,
        'KICK_OFF',
        [PlatformName.ANDROID, PlatformName.IOS]
      );

      // Assert
      expect(result.allReady).toBe(true);
      expect(result.uploadedPlatforms).toContain(PlatformName.ANDROID);
      expect(result.uploadedPlatforms).toContain(PlatformName.IOS);
      expect(result.missingPlatforms).toHaveLength(0);
    });

    it('should return allReady=false when some platforms missing', async () => {
      // Arrange - Only create Android upload (iOS missing)
      await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/android.apk'
      });

      // Act
      const result = await releaseUploadsRepo.checkAllPlatformsReady(
        testReleaseId,
        'KICK_OFF',
        [PlatformName.ANDROID, PlatformName.IOS]
      );

      // Assert
      expect(result.allReady).toBe(false);
      expect(result.uploadedPlatforms).toContain(PlatformName.ANDROID);
      expect(result.missingPlatforms).toContain(PlatformName.IOS);
    });

    it('should return allReady=true for single platform release', async () => {
      // Arrange
      await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/android.apk'
      });

      // Act
      const result = await releaseUploadsRepo.checkAllPlatformsReady(
        testReleaseId,
        'KICK_OFF',
        [PlatformName.ANDROID] // Only Android required
      );

      // Assert
      expect(result.allReady).toBe(true);
    });
  });

  // ==========================================================================
  // TDD TEST CASE 6: Delete unused upload
  // Expected: FAIL initially (until delete() is verified working)
  // ==========================================================================
  describe('delete() - REAL DB operations', () => {
    it('should delete unused upload', async () => {
      // Arrange
      const upload = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/android.apk'
      });

      // Act
      const deleted = await releaseUploadsRepo.delete(upload.id);

      // Assert
      expect(deleted).toBe(true);

      // Verify it's gone
      const fromDb = await releaseUploadsRepo.findById(upload.id);
      expect(fromDb).toBeNull();
    });

    it('should throw error when trying to delete used upload', async () => {
      // Arrange
      const upload = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF' as const,
        artifactPath: 's3://bucket/android.apk'
      });
      await releaseUploadsRepo.markAsUsed(upload.id, 'task-123', null);

      // Act & Assert
      await expect(releaseUploadsRepo.delete(upload.id)).rejects.toThrow(
        'Cannot delete an upload that has already been consumed'
      );

      // Verify it still exists
      const fromDb = await releaseUploadsRepo.findById(upload.id);
      expect(fromDb).not.toBeNull();
    });
  });
});

// ============================================================================
// TEST SUITE: End-to-End Manual Upload Flow (Integration)
// ============================================================================

describeIfDb('Manual Upload E2E Flow - Integration Tests (TDD)', () => {
  let sequelize: Sequelize;
  let releaseUploadsRepo: ReleaseUploadsRepository;
  let ReleaseUploadModelInstance: typeof ReleaseUploadModel;
  
  const testTenantId = `test-tenant-e2e-${uuidv4().slice(0, 8)}`;
  const testReleaseId = `test-release-e2e-${uuidv4().slice(0, 8)}`;

  beforeAll(async () => {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'mysql',
      logging: false
    });

    await sequelize.authenticate();
    
    // Disable foreign key checks for testing
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    ReleaseUploadModelInstance = createReleaseUploadModel(sequelize);
    releaseUploadsRepo = new ReleaseUploadsRepository(sequelize, ReleaseUploadModelInstance);
  });

  afterAll(async () => {
    if (ReleaseUploadModelInstance) {
      await ReleaseUploadModelInstance.destroy({ where: { tenantId: testTenantId } });
    }
    if (sequelize) {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    if (ReleaseUploadModelInstance) {
      await ReleaseUploadModelInstance.destroy({ where: { tenantId: testTenantId } });
    }
  });

  // ==========================================================================
  // E2E SCENARIO 1: Stage 1 Complete Flow
  // ==========================================================================
  describe('Stage 1 (PRE_REGRESSION) Complete Flow', () => {
    it('should handle upload → task check → consume → complete cycle', async () => {
      /**
       * Timeline:
       * 1. User uploads Android build
       * 2. User uploads iOS build
       * 3. Task checks if all ready → YES
       * 4. Task consumes uploads (marks as used)
       * 5. Task completes
       */

      // Step 1: User uploads Android
      const androidUpload = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF',
        artifactPath: 's3://bucket/stage1-android.apk'
      });
      expect(androidUpload.isUsed).toBe(false);

      // Step 2: User uploads iOS
      const iosUpload = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'KICK_OFF',
        artifactPath: 's3://bucket/stage1-ios.ipa'
      });
      expect(iosUpload.isUsed).toBe(false);

      // Step 3: Task checks readiness
      const readiness = await releaseUploadsRepo.checkAllPlatformsReady(
        testReleaseId,
        'KICK_OFF',
        [PlatformName.ANDROID, PlatformName.IOS]
      );
      expect(readiness.allReady).toBe(true);

      // Step 4: Task consumes uploads
      const taskId = 'task-' + uuidv4().slice(0, 8);
      await releaseUploadsRepo.markAsUsed(androidUpload.id, taskId, null);
      await releaseUploadsRepo.markAsUsed(iosUpload.id, taskId, null);

      // Step 5: Verify consumption
      const usedUploads = await releaseUploadsRepo.findByTaskId(taskId);
      expect(usedUploads).toHaveLength(2);
      expect(usedUploads.every(u => u.isUsed)).toBe(true);

      // No unused uploads should remain for this stage
      const remaining = await releaseUploadsRepo.findUnused(testReleaseId, 'KICK_OFF');
      expect(remaining).toHaveLength(0);
    });
  });

  // ==========================================================================
  // E2E SCENARIO 2: Multiple Regression Cycles
  // ==========================================================================
  describe('Stage 2 (REGRESSION) Multiple Cycles', () => {
    it('should handle multiple cycles with separate upload sets', async () => {
      /**
       * Timeline:
       * 1. Cycle 1: Upload Android & iOS
       * 2. Cycle 1 task consumes them
       * 3. Cycle 2: Upload new Android & iOS
       * 4. Cycle 2 task consumes them
       * 
       * Each cycle should only see its own unused uploads!
       */

      // === CYCLE 1 ===
      const cycle1Id = 'cycle-1-' + uuidv4().slice(0, 8);
      const task1Id = 'task-1-' + uuidv4().slice(0, 8);

      // Upload for Cycle 1
      const c1Android = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'REGRESSION',
        artifactPath: 's3://bucket/cycle1-android.apk'
      });
      const c1Ios = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'REGRESSION',
        artifactPath: 's3://bucket/cycle1-ios.ipa'
      });

      // Cycle 1 task consumes uploads
      await releaseUploadsRepo.markAsUsed(c1Android.id, task1Id, cycle1Id);
      await releaseUploadsRepo.markAsUsed(c1Ios.id, task1Id, cycle1Id);

      // Verify Cycle 1 uploads are used
      const c1Used = await releaseUploadsRepo.findByCycleId(cycle1Id);
      expect(c1Used).toHaveLength(2);

      // === CYCLE 2 ===
      const cycle2Id = 'cycle-2-' + uuidv4().slice(0, 8);
      const task2Id = 'task-2-' + uuidv4().slice(0, 8);

      // Upload for Cycle 2 (should NOT see Cycle 1's used uploads)
      const c2Android = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'REGRESSION',
        artifactPath: 's3://bucket/cycle2-android.apk'
      });
      const c2Ios = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.IOS,
        stage: 'REGRESSION',
        artifactPath: 's3://bucket/cycle2-ios.ipa'
      });

      // Check readiness for Cycle 2 (should only see unused uploads)
      const readiness = await releaseUploadsRepo.checkAllPlatformsReady(
        testReleaseId,
        'REGRESSION',
        [PlatformName.ANDROID, PlatformName.IOS]
      );
      expect(readiness.allReady).toBe(true);
      // Should find the Cycle 2 uploads, not Cycle 1's used ones

      // Cycle 2 task consumes uploads
      await releaseUploadsRepo.markAsUsed(c2Android.id, task2Id, cycle2Id);
      await releaseUploadsRepo.markAsUsed(c2Ios.id, task2Id, cycle2Id);

      // Verify Cycle 2 uploads are used
      const c2Used = await releaseUploadsRepo.findByCycleId(cycle2Id);
      expect(c2Used).toHaveLength(2);

      // Total uploads: 4 (2 per cycle)
      const allUploads = await releaseUploadsRepo.findByReleaseAndStage(testReleaseId, 'REGRESSION');
      expect(allUploads).toHaveLength(4);
    });
  });

  // ==========================================================================
  // E2E SCENARIO 3: Upload Replacement (Before Consumption)
  // ==========================================================================
  describe('Upload Replacement Before Consumption', () => {
    it('should allow replacing upload before it is consumed', async () => {
      // Step 1: User uploads initial build
      const initial = await releaseUploadsRepo.create({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF',
        artifactPath: 's3://bucket/android-v1.apk'
      });

      // Step 2: User realizes mistake, uploads new build (replacement)
      const replaced = await releaseUploadsRepo.upsert({
        tenantId: testTenantId,
        releaseId: testReleaseId,
        platform: PlatformName.ANDROID,
        stage: 'KICK_OFF',
        artifactPath: 's3://bucket/android-v2.apk' // New path
      });

      // Should be the same entry, updated
      expect(replaced.id).toBe(initial.id);
      expect(replaced.artifactPath).toBe('s3://bucket/android-v2.apk');

      // Only one upload should exist
      const all = await releaseUploadsRepo.findUnused(testReleaseId, 'KICK_OFF');
      expect(all).toHaveLength(1);
      expect(all[0].artifactPath).toBe('s3://bucket/android-v2.apk');
    });
  });
});

// ==========================================================================
// AWAITING_MANUAL_BUILD Integration Tests (Phase 20 - TDD)
// ==========================================================================
// These tests verify the AWAITING_MANUAL_BUILD status in the real database
// Reference: MANUAL_BUILD_UPLOAD_FLOW_1.md
// ==========================================================================

describeIfDb('AWAITING_MANUAL_BUILD Status - Integration Tests (TDD)', () => {
  let sequelize: Sequelize;
  
  // Test identifiers
  const testTenantId = `test-tenant-amb-${uuidv4().slice(0, 8)}`;
  const testReleaseId = `test-release-amb-${uuidv4().slice(0, 8)}`;
  const testAccountId = `test-account-amb-${uuidv4().slice(0, 8)}`;

  beforeAll(async () => {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'mysql',
      logging: false,
    });

    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established for AWAITING_MANUAL_BUILD tests');
      
      // Disable foreign key checks for testing
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await sequelize.query(`DELETE FROM release_tasks WHERE releaseId LIKE 'test-release-amb-%'`);
      console.log('✅ Test data cleaned up');
    } catch (e) {
      // Ignore cleanup errors
    }
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    await sequelize.close();
  });

  // ==========================================================================
  // Test 1: Database accepts AWAITING_MANUAL_BUILD status
  // ==========================================================================
  describe('Database Schema - AWAITING_MANUAL_BUILD', () => {
    it('should INSERT task with AWAITING_MANUAL_BUILD status', async () => {
      const taskId = `task-amb-${uuidv4().slice(0, 8)}`;
      
      // Insert a task with AWAITING_MANUAL_BUILD status
      await sequelize.query(`
        INSERT INTO release_tasks (id, releaseId, taskType, taskStatus, stage, createdAt, updatedAt)
        VALUES (?, ?, 'TRIGGER_PRE_REGRESSION_BUILDS', 'AWAITING_MANUAL_BUILD', 'KICKOFF', NOW(), NOW())
      `, {
        replacements: [taskId, testReleaseId]
      });

      // Verify the task was inserted with correct status
      const [rows] = await sequelize.query(`
        SELECT taskStatus FROM release_tasks WHERE id = ?
      `, {
        replacements: [taskId]
      }) as [any[], unknown];

      expect(rows).toHaveLength(1);
      expect(rows[0].taskStatus).toBe('AWAITING_MANUAL_BUILD');
    });

    it('should UPDATE task from PENDING to AWAITING_MANUAL_BUILD', async () => {
      const taskId = `task-amb-update-${uuidv4().slice(0, 8)}`;
      
      // Insert with PENDING status
      await sequelize.query(`
        INSERT INTO release_tasks (id, releaseId, taskType, taskStatus, stage, createdAt, updatedAt)
        VALUES (?, ?, 'TRIGGER_REGRESSION_BUILDS', 'PENDING', 'REGRESSION', NOW(), NOW())
      `, {
        replacements: [taskId, testReleaseId]
      });

      // Update to AWAITING_MANUAL_BUILD
      await sequelize.query(`
        UPDATE release_tasks SET taskStatus = 'AWAITING_MANUAL_BUILD', updatedAt = NOW()
        WHERE id = ?
      `, {
        replacements: [taskId]
      });

      // Verify the update
      const [rows] = await sequelize.query(`
        SELECT taskStatus FROM release_tasks WHERE id = ?
      `, {
        replacements: [taskId]
      }) as [any[], unknown];

      expect(rows).toHaveLength(1);
      expect(rows[0].taskStatus).toBe('AWAITING_MANUAL_BUILD');
    });

    it('should UPDATE task from AWAITING_MANUAL_BUILD to COMPLETED', async () => {
      const taskId = `task-amb-complete-${uuidv4().slice(0, 8)}`;
      
      // Insert with AWAITING_MANUAL_BUILD status
      await sequelize.query(`
        INSERT INTO release_tasks (id, releaseId, taskType, taskStatus, stage, createdAt, updatedAt)
        VALUES (?, ?, 'TRIGGER_TEST_FLIGHT_BUILD', 'AWAITING_MANUAL_BUILD', 'PRE_RELEASE', NOW(), NOW())
      `, {
        replacements: [taskId, testReleaseId]
      });

      // Update to COMPLETED (simulating when builds are uploaded)
      await sequelize.query(`
        UPDATE release_tasks SET taskStatus = 'COMPLETED', updatedAt = NOW()
        WHERE id = ?
      `, {
        replacements: [taskId]
      });

      // Verify the update
      const [rows] = await sequelize.query(`
        SELECT taskStatus FROM release_tasks WHERE id = ?
      `, {
        replacements: [taskId]
      }) as [any[], unknown];

      expect(rows).toHaveLength(1);
      expect(rows[0].taskStatus).toBe('COMPLETED');
    });

    it('should distinguish AWAITING_CALLBACK from AWAITING_MANUAL_BUILD in queries', async () => {
      const taskIdCallback = `task-cb-${uuidv4().slice(0, 8)}`;
      const taskIdManual = `task-mb-${uuidv4().slice(0, 8)}`;
      
      // Insert one task with AWAITING_CALLBACK (CI/CD mode)
      await sequelize.query(`
        INSERT INTO release_tasks (id, releaseId, taskType, taskStatus, stage, createdAt, updatedAt)
        VALUES (?, ?, 'TRIGGER_PRE_REGRESSION_BUILDS', 'AWAITING_CALLBACK', 'KICKOFF', NOW(), NOW())
      `, {
        replacements: [taskIdCallback, testReleaseId]
      });

      // Insert one task with AWAITING_MANUAL_BUILD (Manual mode)
      await sequelize.query(`
        INSERT INTO release_tasks (id, releaseId, taskType, taskStatus, stage, createdAt, updatedAt)
        VALUES (?, ?, 'TRIGGER_REGRESSION_BUILDS', 'AWAITING_MANUAL_BUILD', 'REGRESSION', NOW(), NOW())
      `, {
        replacements: [taskIdManual, testReleaseId]
      });

      // Query for AWAITING_CALLBACK tasks only
      const [callbackTasks] = await sequelize.query(`
        SELECT id, taskStatus FROM release_tasks 
        WHERE releaseId = ? AND taskStatus = 'AWAITING_CALLBACK'
      `, {
        replacements: [testReleaseId]
      }) as [any[], unknown];

      // Query for AWAITING_MANUAL_BUILD tasks only
      const [manualTasks] = await sequelize.query(`
        SELECT id, taskStatus FROM release_tasks 
        WHERE releaseId = ? AND taskStatus = 'AWAITING_MANUAL_BUILD'
      `, {
        replacements: [testReleaseId]
      }) as [any[], unknown];

      // Verify they are distinct
      expect(callbackTasks.some((t: any) => t.id === taskIdCallback)).toBe(true);
      expect(callbackTasks.some((t: any) => t.id === taskIdManual)).toBe(false);
      
      expect(manualTasks.some((t: any) => t.id === taskIdManual)).toBe(true);
      expect(manualTasks.some((t: any) => t.id === taskIdCallback)).toBe(false);
    });
  });

  // ==========================================================================
  // Test 2: TaskExecutor sets correct status based on mode
  // ==========================================================================
  // These tests will FAIL until TaskExecutor is updated to use AWAITING_MANUAL_BUILD
  // ==========================================================================
  describe('TaskExecutor - Status Setting (TDD RED Phase)', () => {
    /**
     * This test verifies that TaskExecutor uses the CORRECT status based on mode.
     * 
     * Expected behavior (from MANUAL_BUILD_UPLOAD_FLOW_1.md):
     * - Manual mode: AWAITING_MANUAL_BUILD
     * - CI/CD mode: AWAITING_CALLBACK
     * 
     * This test should FAIL until task-executor.ts is updated.
     */
    it('should use AWAITING_MANUAL_BUILD for manual mode in task-executor.ts code', () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../../script/services/release/task-executor/task-executor.ts');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Verify the code sets AWAITING_MANUAL_BUILD for manual mode
      // This will FAIL because current code uses AWAITING_CALLBACK for both
      expect(fileContent).toContain('TaskStatus.AWAITING_MANUAL_BUILD');
      
      // Verify both statuses are used distinctly
      const hasAwaitingCallback = fileContent.includes('TaskStatus.AWAITING_CALLBACK');
      const hasAwaitingManualBuild = fileContent.includes('TaskStatus.AWAITING_MANUAL_BUILD');
      
      expect(hasAwaitingCallback).toBe(true);
      expect(hasAwaitingManualBuild).toBe(true);
    });

    it('should check for AWAITING_MANUAL_BUILD in awaiting-manual-build.utils.ts', () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../../script/utils/awaiting-manual-build.utils.ts');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // The utility should check for AWAITING_MANUAL_BUILD, not AWAITING_CALLBACK
      expect(fileContent).toContain('TaskStatus.AWAITING_MANUAL_BUILD');
    });
  });

  // ==========================================================================
  // Test 3: Upload Validation with AWAITING_MANUAL_BUILD
  // ==========================================================================
  describe('Upload Validation - AWAITING_MANUAL_BUILD (TDD RED Phase)', () => {
    it('should allow upload when task is AWAITING_MANUAL_BUILD', () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../../script/services/release/upload-validation.service.ts');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Verify the validation allows AWAITING_MANUAL_BUILD
      expect(fileContent).toContain('AWAITING_MANUAL_BUILD');
    });
  });
});

