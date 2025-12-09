/**
 * Enum Values Tests
 * 
 * Tests that all enum values in release.interface.ts are correctly defined.
 * 
 * Reference: RELEASE_STATUS_GUIDE.md
 * 
 * Run: jest api/test/release/services/enum-values.test.ts --runInBand
 */

import {
  ReleaseStatus,
  StageStatus,
  CronStatus,
  TaskStatus,
  RegressionCycleStatus,
  StateChangeType,
  TaskType,
  PauseType
} from '../../../script/models/release/release.interface';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEnumValues<T extends object>(enumObj: T): string[] {
  return Object.values(enumObj).filter(v => typeof v === 'string') as string[];
}

// ============================================================================
// TESTS
// ============================================================================

describe('Enum Values Tests', () => {

  // -------------------------------------------------------------------------
  // ReleaseStatus - Should have simplified values
  // -------------------------------------------------------------------------
  describe('ReleaseStatus enum', () => {
    
    it('should have PENDING value', () => {
      expect(ReleaseStatus.PENDING).toBe('PENDING');
    });

    it('should have IN_PROGRESS value', () => {
      // Note: Currently might be "STARTED", will change to "IN_PROGRESS"
      const values = getEnumValues(ReleaseStatus);
      expect(values).toContain('IN_PROGRESS');
    });

    it('should have PAUSED value (NEW)', () => {
      // NEW: For user-induced or task-failure pause
      const values = getEnumValues(ReleaseStatus);
      expect(values).toContain('PAUSED');
    });

    it('should have SUBMITTED value (NEW)', () => {
      // NEW: After build submitted to store, awaiting approval
      const values = getEnumValues(ReleaseStatus);
      expect(values).toContain('SUBMITTED');
    });

    it('should have COMPLETED value (NEW)', () => {
      // NEW: Terminal success state
      const values = getEnumValues(ReleaseStatus);
      expect(values).toContain('COMPLETED');
    });

    it('should have ARCHIVED value', () => {
      expect(ReleaseStatus.ARCHIVED).toBe('ARCHIVED');
    });

    it('should NOT have STARTED value (REMOVED)', () => {
      // REMOVED: Replaced by IN_PROGRESS
      const values = getEnumValues(ReleaseStatus);
      expect(values).not.toContain('STARTED');
    });

    it('should NOT have REGRESSION_IN_PROGRESS value (REMOVED)', () => {
      // REMOVED: Stage status handles this now
      const values = getEnumValues(ReleaseStatus);
      expect(values).not.toContain('REGRESSION_IN_PROGRESS');
    });

    it('should NOT have BUILD_SUBMITTED value (REMOVED)', () => {
      // REMOVED: Replaced by SUBMITTED
      const values = getEnumValues(ReleaseStatus);
      expect(values).not.toContain('BUILD_SUBMITTED');
    });

    it('should NOT have RELEASED value (REMOVED)', () => {
      // REMOVED: Replaced by COMPLETED
      const values = getEnumValues(ReleaseStatus);
      expect(values).not.toContain('RELEASED');
    });

    it('should have exactly 6 values', () => {
      // PENDING, IN_PROGRESS, PAUSED, SUBMITTED, COMPLETED, ARCHIVED
      const values = getEnumValues(ReleaseStatus);
      expect(values).toHaveLength(6);
    });
  });

  // -------------------------------------------------------------------------
  // StageStatus - No changes expected
  // -------------------------------------------------------------------------
  describe('StageStatus enum', () => {
    
    it('should have PENDING value', () => {
      expect(StageStatus.PENDING).toBe('PENDING');
    });

    it('should have IN_PROGRESS value', () => {
      expect(StageStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    });

    it('should have COMPLETED value', () => {
      expect(StageStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have exactly 3 values (no changes)', () => {
      const values = getEnumValues(StageStatus);
      expect(values).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // CronStatus - No changes expected
  // -------------------------------------------------------------------------
  describe('CronStatus enum', () => {
    
    it('should have PENDING value', () => {
      expect(CronStatus.PENDING).toBe('PENDING');
    });

    it('should have RUNNING value', () => {
      expect(CronStatus.RUNNING).toBe('RUNNING');
    });

    it('should have PAUSED value', () => {
      expect(CronStatus.PAUSED).toBe('PAUSED');
    });

    it('should have COMPLETED value', () => {
      expect(CronStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have exactly 4 values (no changes)', () => {
      const values = getEnumValues(CronStatus);
      expect(values).toHaveLength(4);
    });
  });

  // -------------------------------------------------------------------------
  // TaskStatus - Add AWAITING_CALLBACK and SKIPPED
  // -------------------------------------------------------------------------
  describe('TaskStatus enum', () => {
    
    it('should have PENDING value', () => {
      expect(TaskStatus.PENDING).toBe('PENDING');
    });

    it('should have IN_PROGRESS value', () => {
      expect(TaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    });

    it('should have AWAITING_CALLBACK value (NEW)', () => {
      // NEW: Task triggered external service, waiting for callback
      const values = getEnumValues(TaskStatus);
      expect(values).toContain('AWAITING_CALLBACK');
    });

    it('should have COMPLETED value', () => {
      expect(TaskStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have FAILED value', () => {
      expect(TaskStatus.FAILED).toBe('FAILED');
    });

    it('should have SKIPPED value (NEW)', () => {
      // NEW: Task intentionally skipped (e.g., platform not applicable)
      const values = getEnumValues(TaskStatus);
      expect(values).toContain('SKIPPED');
    });

    it('should have exactly 6 values', () => {
      // PENDING, IN_PROGRESS, AWAITING_CALLBACK, COMPLETED, FAILED, SKIPPED
      const values = getEnumValues(TaskStatus);
      expect(values).toHaveLength(6);
    });
  });

  // -------------------------------------------------------------------------
  // RegressionCycleStatus - Remove STARTED, add ABANDONED
  // -------------------------------------------------------------------------
  describe('RegressionCycleStatus enum', () => {
    
    it('should have NOT_STARTED value', () => {
      expect(RegressionCycleStatus.NOT_STARTED).toBe('NOT_STARTED');
    });

    it('should have IN_PROGRESS value', () => {
      expect(RegressionCycleStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    });

    it('should have DONE value', () => {
      expect(RegressionCycleStatus.DONE).toBe('DONE');
    });

    it('should have ABANDONED value (NEW)', () => {
      // NEW: User abandoned the current cycle (Feature 12)
      const values = getEnumValues(RegressionCycleStatus);
      expect(values).toContain('ABANDONED');
    });

    it('should NOT have STARTED value (REMOVED)', () => {
      // REMOVED: Use IN_PROGRESS instead
      const values = getEnumValues(RegressionCycleStatus);
      expect(values).not.toContain('STARTED');
    });

    it('should have exactly 4 values', () => {
      // NOT_STARTED, IN_PROGRESS, DONE, ABANDONED
      const values = getEnumValues(RegressionCycleStatus);
      expect(values).toHaveLength(4);
    });
  });

  // -------------------------------------------------------------------------
  // TaskType - Add CREATE_AAB_BUILD
  // -------------------------------------------------------------------------
  describe('TaskType enum', () => {
    
    it('should have CREATE_AAB_BUILD value (NEW)', () => {
      // NEW: Android AAB build task for Stage 3
      const values = getEnumValues(TaskType);
      expect(values).toContain('CREATE_AAB_BUILD');
    });

    // Existing Stage 1 tasks
    it('should have all Stage 1 tasks', () => {
      expect(TaskType.PRE_KICK_OFF_REMINDER).toBe('PRE_KICK_OFF_REMINDER');
      expect(TaskType.FORK_BRANCH).toBe('FORK_BRANCH');
      expect(TaskType.CREATE_PROJECT_MANAGEMENT_TICKET).toBe('CREATE_PROJECT_MANAGEMENT_TICKET');
      expect(TaskType.CREATE_TEST_SUITE).toBe('CREATE_TEST_SUITE');
      expect(TaskType.TRIGGER_PRE_REGRESSION_BUILDS).toBe('TRIGGER_PRE_REGRESSION_BUILDS');
    });

    // Existing Stage 2 tasks
    it('should have all Stage 2 tasks', () => {
      expect(TaskType.RESET_TEST_SUITE).toBe('RESET_TEST_SUITE');
      expect(TaskType.CREATE_RC_TAG).toBe('CREATE_RC_TAG');
      expect(TaskType.CREATE_RELEASE_NOTES).toBe('CREATE_RELEASE_NOTES');
      expect(TaskType.TRIGGER_REGRESSION_BUILDS).toBe('TRIGGER_REGRESSION_BUILDS');
    });

    // Existing Stage 3 tasks
    it('should have all Stage 3 tasks', () => {
      expect(TaskType.CREATE_RELEASE_TAG).toBe('CREATE_RELEASE_TAG');
      expect(TaskType.CREATE_FINAL_RELEASE_NOTES).toBe('CREATE_FINAL_RELEASE_NOTES');
      expect(TaskType.TRIGGER_TEST_FLIGHT_BUILD).toBe('TRIGGER_TEST_FLIGHT_BUILD');
      expect(TaskType.CHECK_PROJECT_RELEASE_APPROVAL).toBe('CHECK_PROJECT_RELEASE_APPROVAL');
    });
  });

  // -------------------------------------------------------------------------
  // StateChangeType - To be extended for notifications (TODO)
  // -------------------------------------------------------------------------
  describe('StateChangeType enum', () => {
    
    it('should have existing values', () => {
      expect(StateChangeType.CREATE).toBe('CREATE');
      expect(StateChangeType.UPDATE).toBe('UPDATE');
      expect(StateChangeType.REMOVE).toBe('REMOVE');
      expect(StateChangeType.ADD).toBe('ADD');
    });

    // Note: More notification types will be added in Feature 4
    // TEST_SUCCESS_NOTIFIED, RELEASE_PAUSED, RELEASE_RESUMED, etc.
  });

  // -------------------------------------------------------------------------
  // Value consistency checks
  // -------------------------------------------------------------------------
  describe('Enum value consistency', () => {
    
    it('ReleaseStatus values should match their keys', () => {
      Object.entries(ReleaseStatus).forEach(([key, value]) => {
        if (typeof value === 'string') {
          expect(value).toBe(key);
        }
      });
    });

    it('TaskStatus values should match their keys', () => {
      Object.entries(TaskStatus).forEach(([key, value]) => {
        if (typeof value === 'string') {
          expect(value).toBe(key);
        }
      });
    });

    it('RegressionCycleStatus values should match their keys', () => {
      Object.entries(RegressionCycleStatus).forEach(([key, value]) => {
        if (typeof value === 'string') {
          expect(value).toBe(key);
        }
      });
    });
  });
});

// ============================================================================
// PauseType Tests
// ============================================================================

describe('PauseType enum', () => {
  
  it('should have NONE value', () => {
    expect(PauseType.NONE).toBe('NONE');
  });

  it('should have AWAITING_STAGE_TRIGGER value', () => {
    // When cron paused waiting for manual stage trigger
    expect(PauseType.AWAITING_STAGE_TRIGGER).toBe('AWAITING_STAGE_TRIGGER');
  });

  it('should have USER_REQUESTED value', () => {
    // When user manually paused the release
    expect(PauseType.USER_REQUESTED).toBe('USER_REQUESTED');
  });

  it('should have TASK_FAILURE value', () => {
    // When critical task failed
    expect(PauseType.TASK_FAILURE).toBe('TASK_FAILURE');
  });

  it('should have exactly 4 values', () => {
    const values = getEnumValues(PauseType);
    expect(values).toHaveLength(4);
  });
});
