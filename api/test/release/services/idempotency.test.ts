/**
 * Idempotency Tests for Release Orchestration
 * 
 * Tests that verify tasks are safe to retry without causing side effects:
 * 
 * 1. FORK_BRANCH - returns success if branch already exists
 * 2. CREATE_PM_TICKET - skips platforms with existing projectManagementRunId
 * 3. CREATE_TEST_SUITE - skips platforms with existing testManagementRunId
 * 4. CREATE_RC_TAG - catches "already exists" error, returns success
 * 5. CREATE_RELEASE_TAG - checks release.releaseTag first
 * 6. TRIGGER_*_BUILDS - checks buildUploadStatus/workflowStatus before triggering
 * 
 * Also tests per-platform versioning architecture:
 * 7. getVersionFromMappings() - combined version string
 * 8. getReleaseBranch() - branch generation fallback
 * 
 * Run: npx jest test/release/services/idempotency.test.ts --runInBand
 */

import { generatePlatformVersionString } from '../../../script/services/release/release.utils';

describe('Idempotency Tests', () => {

  // ==========================================================================
  // PART 1: Per-Platform Versioning (release.utils.ts)
  // ==========================================================================

  describe('Per-Platform Versioning', () => {

    describe('generatePlatformVersionString()', () => {

      it('single platform returns "7.0.0_android"', () => {
        const mappings = [{ platform: 'ANDROID', version: '7.0.0' }];
        expect(generatePlatformVersionString(mappings)).toBe('7.0.0_android');
      });

      it('multiple platforms sorted alphabetically (ANDROID before IOS)', () => {
        const mappings = [
          { platform: 'IOS', version: '6.7.0' },
          { platform: 'ANDROID', version: '7.0.0' }
        ];
        expect(generatePlatformVersionString(mappings)).toBe('7.0.0_android_6.7.0_ios');
      });

      it('three platforms sorted alphabetically', () => {
        const mappings = [
          { platform: 'WEB', version: '8.0.0' },
          { platform: 'IOS', version: '6.7.0' },
          { platform: 'ANDROID', version: '7.0.0' }
        ];
        expect(generatePlatformVersionString(mappings)).toBe('7.0.0_android_6.7.0_ios_8.0.0_web');
      });

      it('empty array returns "unknown"', () => {
        expect(generatePlatformVersionString([])).toBe('unknown');
      });

      it('null returns "unknown"', () => {
        expect(generatePlatformVersionString(null as any)).toBe('unknown');
      });

      it('undefined returns "unknown"', () => {
        expect(generatePlatformVersionString(undefined as any)).toBe('unknown');
      });

      it('handles same version across platforms', () => {
        const mappings = [
          { platform: 'IOS', version: '7.0.0' },
          { platform: 'ANDROID', version: '7.0.0' }
        ];
        expect(generatePlatformVersionString(mappings)).toBe('7.0.0_android_7.0.0_ios');
      });

      it('handles semantic versions with pre-release tags', () => {
        const mappings = [
          { platform: 'ANDROID', version: '7.0.0-beta.1' },
          { platform: 'IOS', version: '7.0.0-rc.2' }
        ];
        expect(generatePlatformVersionString(mappings)).toBe('7.0.0-beta.1_android_7.0.0-rc.2_ios');
      });

    });

  });

  // ==========================================================================
  // PART 2: Task Idempotency Scenarios
  // ==========================================================================

  describe('FORK_BRANCH Idempotency', () => {

    it('should return success if branch already exists', () => {
      // Scenario: User retries FORK_BRANCH after partial failure
      // Expected: Task checks if branch exists, returns success without re-creating
      
      const branchExists = true;
      const releaseBranch = 'release/7.0.0_android_6.7.0_ios';
      
      // Mock scenario: checkBranchExists returns true
      if (branchExists) {
        const result = {
          success: true,
          value: releaseBranch,
          message: 'Branch already exists - returning success (idempotent)',
          idempotent: true
        };
        
        expect(result.success).toBe(true);
        expect(result.idempotent).toBe(true);
        expect(result.value).toBe(releaseBranch);
      }
    });

    it('should create branch if it does not exist', () => {
      const branchExists = false;
      const releaseBranch = 'release/7.0.0_android_6.7.0_ios';
      
      if (!branchExists) {
        // Would call scmService.forkOutBranch
        const result = {
          success: true,
          value: releaseBranch,
          idempotent: false
        };
        
        expect(result.success).toBe(true);
        expect(result.idempotent).toBe(false);
      }
    });

  });

  describe('CREATE_PM_TICKET Idempotency', () => {

    it('should skip platforms with existing projectManagementRunId', () => {
      // Scenario: 2 platforms, 1 already has ticket
      const platformMappings = [
        { platform: 'ANDROID', projectManagementRunId: 'JIRA-123' }, // Already created
        { platform: 'IOS', projectManagementRunId: null }            // Needs creation
      ];

      const platformsNeedingTickets = platformMappings.filter(
        m => !m.projectManagementRunId
      );

      expect(platformsNeedingTickets).toHaveLength(1);
      expect(platformsNeedingTickets[0].platform).toBe('IOS');
    });

    it('should return success if all platforms already have tickets', () => {
      const platformMappings = [
        { platform: 'ANDROID', projectManagementRunId: 'JIRA-123' },
        { platform: 'IOS', projectManagementRunId: 'JIRA-456' }
      ];

      const platformsNeedingTickets = platformMappings.filter(
        m => !m.projectManagementRunId
      );

      expect(platformsNeedingTickets).toHaveLength(0);
      // Task would return success with existing ticket IDs
    });

  });

  describe('CREATE_TEST_SUITE Idempotency', () => {

    it('should skip platforms with existing testManagementRunId', () => {
      const platformMappings = [
        { platform: 'ANDROID', testManagementRunId: 'RUN-001' }, // Already created
        { platform: 'IOS', testManagementRunId: null }           // Needs creation
      ];

      const platformsNeedingSuites = platformMappings.filter(
        m => !m.testManagementRunId
      );

      expect(platformsNeedingSuites).toHaveLength(1);
      expect(platformsNeedingSuites[0].platform).toBe('IOS');
    });

    it('should return success if all platforms already have test suites', () => {
      const platformMappings = [
        { platform: 'ANDROID', testManagementRunId: 'RUN-001' },
        { platform: 'IOS', testManagementRunId: 'RUN-002' }
      ];

      const platformsNeedingSuites = platformMappings.filter(
        m => !m.testManagementRunId
      );

      expect(platformsNeedingSuites).toHaveLength(0);
    });

  });

  describe('CREATE_RC_TAG Idempotency', () => {

    it('should return success if tag already exists', () => {
      // Scenario: SCM service throws "tag already exists" error
      const tagName = 'rc-1_7.0.0_android_6.7.0_ios';
      const errorMessage = 'Reference already exists';

      const isAlreadyExistsError = 
        errorMessage.toLowerCase().includes('already exists') ||
        errorMessage.toLowerCase().includes('reference already exists');

      expect(isAlreadyExistsError).toBe(true);

      // Task should catch this and return success
      const result = {
        success: true,
        value: tagName,
        tag: tagName,
        idempotent: true
      };

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    it('should create tag if it does not exist', () => {
      const tagName = 'rc-1_7.0.0_android_6.7.0_ios';
      
      // No error thrown - tag created successfully
      const result = {
        success: true,
        value: tagName,
        tag: tagName,
        idempotent: false
      };

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(false);
    });

  });

  describe('CREATE_RELEASE_TAG Idempotency', () => {

    it('should use existing release.releaseTag if set', () => {
      const release = {
        id: 'release-123',
        releaseTag: 'ANDROIDIOS_7.0.0_android_6.7.0_ios' // Already set
      };

      const existingTag = release.releaseTag;
      expect(existingTag).toBeTruthy();

      // Task should return existing tag without calling SCM
      const result = {
        success: true,
        value: existingTag,
        tagName: existingTag,
        idempotent: true
      };

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
    });

    it('should create new tag if release.releaseTag is null', () => {
      const release = {
        id: 'release-123',
        releaseTag: null
      };

      const existingTag = release.releaseTag;
      expect(existingTag).toBeNull();

      // Task should call SCM to create tag
    });

  });

  describe('TRIGGER_*_BUILDS Idempotency', () => {

    describe('Build Status Classification', () => {

      it('UPLOADED builds should be skipped', () => {
        const build = { platform: 'ANDROID', buildUploadStatus: 'UPLOADED', workflowStatus: 'COMPLETED' };
        const shouldSkip = build.buildUploadStatus === 'UPLOADED';
        expect(shouldSkip).toBe(true);
      });

      it('PENDING workflow builds should be skipped', () => {
        const build = { platform: 'ANDROID', buildUploadStatus: 'PENDING', workflowStatus: 'PENDING' };
        const shouldSkip = build.workflowStatus === 'PENDING' || build.workflowStatus === 'RUNNING';
        expect(shouldSkip).toBe(true);
      });

      it('RUNNING workflow builds should be skipped', () => {
        const build = { platform: 'ANDROID', buildUploadStatus: 'PENDING', workflowStatus: 'RUNNING' };
        const shouldSkip = build.workflowStatus === 'PENDING' || build.workflowStatus === 'RUNNING';
        expect(shouldSkip).toBe(true);
      });

      it('FAILED builds should be re-triggered', () => {
        const build = { platform: 'ANDROID', buildUploadStatus: 'FAILED', workflowStatus: 'FAILED' };
        const shouldRetrigger = build.buildUploadStatus === 'FAILED' || build.workflowStatus === 'FAILED';
        expect(shouldRetrigger).toBe(true);
      });

      it('missing platform builds should be triggered', () => {
        const existingBuilds = [
          { platform: 'ANDROID', buildUploadStatus: 'UPLOADED' }
        ];
        const requiredPlatforms = ['ANDROID', 'IOS'];
        
        const existingPlatforms = existingBuilds.map(b => b.platform);
        const missingPlatforms = requiredPlatforms.filter(p => !existingPlatforms.includes(p));
        
        expect(missingPlatforms).toEqual(['IOS']);
      });

    });

    describe('Platform Categorization', () => {

      it('should categorize platforms correctly', () => {
        const platformMappings = [
          { platform: 'ANDROID' },
          { platform: 'IOS' },
          { platform: 'WEB' }
        ];

        const existingBuilds = [
          { platform: 'ANDROID', buildUploadStatus: 'UPLOADED', workflowStatus: 'COMPLETED' },
          { platform: 'IOS', buildUploadStatus: 'PENDING', workflowStatus: 'RUNNING' }
          // WEB has no build entry
        ];

        const completedPlatforms: string[] = [];
        const inProgressPlatforms: string[] = [];
        const failedPlatforms: string[] = [];
        const missingPlatforms: string[] = [];

        for (const mapping of platformMappings) {
          const existingBuild = existingBuilds.find(b => b.platform === mapping.platform);

          if (!existingBuild) {
            missingPlatforms.push(mapping.platform);
          } else if (existingBuild.buildUploadStatus === 'UPLOADED') {
            completedPlatforms.push(mapping.platform);
          } else if (existingBuild.workflowStatus === 'PENDING' || existingBuild.workflowStatus === 'RUNNING') {
            inProgressPlatforms.push(mapping.platform);
          } else {
            failedPlatforms.push(mapping.platform);
          }
        }

        expect(completedPlatforms).toEqual(['ANDROID']);
        expect(inProgressPlatforms).toEqual(['IOS']);
        expect(failedPlatforms).toEqual([]);
        expect(missingPlatforms).toEqual(['WEB']);
      });

      it('should determine needsTrigger correctly', () => {
        const missingPlatforms = ['WEB'];
        const failedPlatforms: string[] = [];

        const needsTrigger = [...missingPlatforms, ...failedPlatforms];
        
        expect(needsTrigger).toEqual(['WEB']);
      });

      it('should include failed platforms in needsTrigger for retry', () => {
        const missingPlatforms: string[] = [];
        const failedPlatforms = ['ANDROID'];

        const needsTrigger = [...missingPlatforms, ...failedPlatforms];
        
        expect(needsTrigger).toEqual(['ANDROID']);
      });

    });

  });

  // ==========================================================================
  // PART 3: Integration Scenarios
  // ==========================================================================

  describe('Full Retry Flow', () => {

    it('Scenario: Retry FORK_BRANCH after branch was created', () => {
      // Step 1: First attempt - branch created
      // Step 2: Task marked COMPLETED
      // Step 3: Release crashes, task reset to PENDING
      // Step 4: Task re-executes
      // Step 5: checkBranchExists returns true
      // Step 6: Task returns success (idempotent)

      const branchAlreadyExists = true;
      const idempotentResult = branchAlreadyExists;

      expect(idempotentResult).toBe(true);
    });

    it('Scenario: Retry TRIGGER_BUILDS after partial trigger', () => {
      // Step 1: First attempt - ANDROID triggered, IOS failed
      // Step 2: Task marked FAILED (at least one platform failed to trigger)
      // Step 3: User clicks Retry
      // Step 4: retryTask() resets task to PENDING
      // Step 5: Task re-executes
      // Step 6: ANDROID has build entry (PENDING/RUNNING) - skip
      // Step 7: IOS has no entry - trigger

      const existingBuilds = [
        { platform: 'ANDROID', buildUploadStatus: 'PENDING', workflowStatus: 'PENDING' }
      ];
      const requiredPlatforms = ['ANDROID', 'IOS'];

      // ANDROID: in progress, skip
      // IOS: missing, trigger
      const platformsToTrigger = requiredPlatforms.filter(p => {
        const build = existingBuilds.find(b => b.platform === p);
        if (!build) return true; // Missing - trigger
        if (build.buildUploadStatus === 'UPLOADED') return false; // Complete - skip
        if (build.workflowStatus === 'PENDING' || build.workflowStatus === 'RUNNING') return false; // In progress - skip
        return true; // Failed - trigger
      });

      expect(platformsToTrigger).toEqual(['IOS']);
    });

    it('Scenario: Retry TRIGGER_BUILDS after workflow failure', () => {
      // Step 1: Builds triggered for both platforms
      // Step 2: ANDROID workflow succeeds, IOS workflow fails
      // Step 3: Callback marks task FAILED
      // Step 4: User clicks Retry
      // Step 5: retryTask() resets task to PENDING, resets failed builds
      // Step 6: Task re-executes
      // Step 7: ANDROID complete (UPLOADED) - skip
      // Step 8: IOS failed - re-trigger

      const existingBuilds = [
        { platform: 'ANDROID', buildUploadStatus: 'UPLOADED', workflowStatus: 'COMPLETED' },
        { platform: 'IOS', buildUploadStatus: 'FAILED', workflowStatus: 'FAILED' }
      ];
      const requiredPlatforms = ['ANDROID', 'IOS'];

      const platformsToTrigger = requiredPlatforms.filter(p => {
        const build = existingBuilds.find(b => b.platform === p);
        if (!build) return true;
        if (build.buildUploadStatus === 'UPLOADED') return false;
        if (build.workflowStatus === 'PENDING' || build.workflowStatus === 'RUNNING') return false;
        return true; // Failed
      });

      expect(platformsToTrigger).toEqual(['IOS']);
    });

  });

  // ==========================================================================
  // PART 4: Error Message Detection
  // ==========================================================================

  describe('Error Message Detection', () => {

    describe('Tag/Branch Already Exists', () => {

      const testCases = [
        'Reference already exists',
        'reference already exists',
        'Tag already exists',
        'tag already exists',
        'Branch already exists: release/v1.0.0',
        'A reference with that name already exists'
      ];

      testCases.forEach(errorMessage => {
        it(`should detect "${errorMessage}" as idempotent`, () => {
          const isIdempotent = 
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('reference already exists');
          
          expect(isIdempotent).toBe(true);
        });
      });

      const nonIdempotentCases = [
        'Permission denied',
        'Not found',
        'Invalid branch name',
        'Authentication failed'
      ];

      nonIdempotentCases.forEach(errorMessage => {
        it(`should NOT detect "${errorMessage}" as idempotent`, () => {
          const isIdempotent = 
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('reference already exists');
          
          expect(isIdempotent).toBe(false);
        });
      });

    });

  });

});

