/**
 * Target Date Validation - Unit Tests
 * 
 * Tests the target date validation functionality:
 * - Slot validation against targetReleaseDate
 * - Target date change validation (extending/shortening)
 * - Delay reason requirements
 * - Audit logging for date changes
 * 
 * Following TDD: Write failing tests first, then implement
 */

import { 
  validateSlotAgainstTargetDate,
  validateSlotsArray,
  validateTargetDateChange,
  TargetDateChangeValidationResult,
  SlotValidationResult
} from '../../../script/controllers/release/release-validation';
import { RegressionCycleStatus } from '../../../script/models/release/release.interface';

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

const createFutureDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const createSlot = (options: {
  date: Date;
  status?: RegressionCycleStatus;
  id?: string;
}) => ({
  id: options.id ?? `slot-${Date.now()}`,
  date: options.date.toISOString(),
  status: options.status ?? RegressionCycleStatus.NOT_STARTED,
  config: {}
});

// ============================================================================
// SLOT VALIDATION TESTS
// ============================================================================

describe('Target Date Validation', () => {
  describe('Slot Validation (ADD/EDIT slot)', () => {
    it('should reject slot if startDate >= targetReleaseDate', () => {
      // Arrange
      const targetReleaseDate = createFutureDate(10); // 10 days from now
      const slotDate = createFutureDate(15); // 15 days from now (AFTER target)
      
      // Act
      const result = validateSlotAgainstTargetDate(slotDate, targetReleaseDate);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('before targetReleaseDate');
    });

    it('should accept slot if startDate < targetReleaseDate', () => {
      // Arrange
      const targetReleaseDate = createFutureDate(10); // 10 days from now
      const slotDate = createFutureDate(5); // 5 days from now (BEFORE target)
      
      // Act
      const result = validateSlotAgainstTargetDate(slotDate, targetReleaseDate);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject slot if startDate equals targetReleaseDate', () => {
      // Arrange
      const targetReleaseDate = createFutureDate(10);
      const slotDate = new Date(targetReleaseDate); // Same date
      
      // Act
      const result = validateSlotAgainstTargetDate(slotDate, targetReleaseDate);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('before targetReleaseDate');
    });

    it('should validate ALL slots in array', () => {
      // Arrange
      const targetReleaseDate = createFutureDate(10);
      const slots = [
        createSlot({ date: createFutureDate(3) }), // Valid
        createSlot({ date: createFutureDate(5) }), // Valid
        createSlot({ date: createFutureDate(12) }) // Invalid (after target)
      ];
      
      // Act
      const result = validateSlotsArray(slots, targetReleaseDate);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.invalidSlots).toHaveLength(1);
      expect(result.invalidSlots?.[0].date).toContain(slots[2].date);
    });

    it('should accept when all slots are before targetReleaseDate', () => {
      // Arrange
      const targetReleaseDate = createFutureDate(10);
      const slots = [
        createSlot({ date: createFutureDate(3) }),
        createSlot({ date: createFutureDate(5) }),
        createSlot({ date: createFutureDate(7) })
      ];
      
      // Act
      const result = validateSlotsArray(slots, targetReleaseDate);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.invalidSlots).toHaveLength(0);
    });

    it('should reject if ANY slot exceeds targetReleaseDate', () => {
      // Arrange
      const targetReleaseDate = createFutureDate(10);
      const slots = [
        createSlot({ date: createFutureDate(3) }), // Valid
        createSlot({ date: createFutureDate(15) }), // Invalid
        createSlot({ date: createFutureDate(5) }) // Valid
      ];
      
      // Act
      const result = validateSlotsArray(slots, targetReleaseDate);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceed targetReleaseDate');
    });
  });

  // ============================================================================
  // TARGET DATE CHANGE - SHORTENING
  // ============================================================================

  describe('Target Date Change - Shortening', () => {
    it('should validate existing slots against new shorter date', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(10); // Shortened
      const existingSlots = [
        createSlot({ date: createFutureDate(5) }), // Valid
        createSlot({ date: createFutureDate(15) }) // Now exceeds new target
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots
      });
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.conflictingSlots).toHaveLength(1);
    });

    it('should reject if ANY existing slot exceeds new targetReleaseDate', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(8); // Shortened significantly
      const existingSlots = [
        createSlot({ date: createFutureDate(5) }), // Valid
        createSlot({ date: createFutureDate(10) }), // Exceeds
        createSlot({ date: createFutureDate(15) }) // Exceeds
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots
      });
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.conflictingSlots).toHaveLength(2);
      expect(result.error).toContain('exceed new targetReleaseDate');
    });

    it('should reject if ANY slot is currently in progress', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(10); // Shortened
      const existingSlots = [
        createSlot({ date: createFutureDate(5), status: RegressionCycleStatus.IN_PROGRESS }), // In progress
        createSlot({ date: createFutureDate(15), status: RegressionCycleStatus.NOT_STARTED }) // Not started
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots
      });
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('in progress');
    });

    it('should NOT require delayReason when shortening', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(15); // Shortened
      const existingSlots = [
        createSlot({ date: createFutureDate(5) }) // All valid
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason: undefined // No reason provided
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.requiresDelayReason).toBe(false);
    });

    it('should accept shortening when all slots are before new target date', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(15); // Shortened
      const existingSlots = [
        createSlot({ date: createFutureDate(5) }),
        createSlot({ date: createFutureDate(10) }) // Still valid
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.conflictingSlots).toHaveLength(0);
    });
  });

  // ============================================================================
  // TARGET DATE CHANGE - EXTENDING
  // ============================================================================

  describe('Target Date Change - Extending', () => {
    it('should require delayReason when extending targetReleaseDate', () => {
      // Arrange
      const oldTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20); // Extended
      const existingSlots = [
        createSlot({ date: createFutureDate(5) })
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason: undefined // No reason provided
      });
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.requiresDelayReason).toBe(true);
      expect(result.error).toContain('delayReason');
    });

    it('should accept extending when delayReason is provided', () => {
      // Arrange
      const oldTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20); // Extended
      const existingSlots = [
        createSlot({ date: createFutureDate(5) })
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason: 'Additional testing required due to critical bug fixes'
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.requiresDelayReason).toBe(true);
    });

    it('should NOT validate slots when extending (no conflict possible)', () => {
      // Arrange
      const oldTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20); // Extended
      const existingSlots = [
        createSlot({ date: createFutureDate(5) }),
        createSlot({ date: createFutureDate(15) }) // Would have exceeded old target
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason: 'Testing delay'
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      // Slots are NOT validated for conflict when extending
      expect(result.conflictingSlots).toHaveLength(0);
    });
  });

  // ============================================================================
  // TARGET DATE CHANGE - UNCHANGED
  // ============================================================================

  describe('Target Date Change - Unchanged', () => {
    it('should NOT require delayReason when date unchanged', () => {
      // Arrange
      const targetDate = createFutureDate(10);
      const existingSlots = [
        createSlot({ date: createFutureDate(5) })
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: targetDate,
        newDate: new Date(targetDate), // Same date (new Date object)
        existingSlots,
        delayReason: undefined
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.requiresDelayReason).toBe(false);
    });

    it('should NOT log audit when date unchanged', () => {
      // Arrange
      const targetDate = createFutureDate(10);
      const existingSlots = [
        createSlot({ date: createFutureDate(5) })
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: targetDate,
        newDate: new Date(targetDate), // Same date
        existingSlots
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.shouldLogAudit).toBe(false);
    });
  });

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  describe('Audit Logging', () => {
    it('should flag audit logging when targetReleaseDate changes (extended)', () => {
      // Arrange
      const oldTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20); // Extended
      const existingSlots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason: 'Testing delay'
      });
      
      // Assert
      expect(result.shouldLogAudit).toBe(true);
      expect(result.auditInfo?.changeType).toBe('EXTENDED');
    });

    it('should flag audit logging when targetReleaseDate changes (shortened)', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(10); // Shortened
      const existingSlots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots
      });
      
      // Assert
      expect(result.shouldLogAudit).toBe(true);
      expect(result.auditInfo?.changeType).toBe('SHORTENED');
    });

    it('should include old date, new date, and reason in audit info', () => {
      // Arrange
      const oldTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20);
      const delayReason = 'Critical security patch needed';
      const existingSlots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason
      });
      
      // Assert
      expect(result.shouldLogAudit).toBe(true);
      expect(result.auditInfo).toBeDefined();
      expect(result.auditInfo?.oldDate).toEqual(oldTargetDate);
      expect(result.auditInfo?.newDate).toEqual(newTargetDate);
      expect(result.auditInfo?.reason).toBe(delayReason);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty slots array', () => {
      // Arrange
      const targetReleaseDate = createFutureDate(10);
      const slots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateSlotsArray(slots, targetReleaseDate);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.invalidSlots).toHaveLength(0);
    });

    it('should handle null/undefined target date gracefully', () => {
      // Arrange
      const slotDate = createFutureDate(5);
      
      // Act & Assert - should not throw
      expect(() => validateSlotAgainstTargetDate(slotDate, null as unknown as Date)).not.toThrow();
    });

    it('should validate slots with completed status (not in progress)', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(10);
      const existingSlots = [
        createSlot({ date: createFutureDate(5), status: RegressionCycleStatus.DONE }) // Completed
      ];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots
      });
      
      // Assert - Completed slots should not block shortening
      expect(result.isValid).toBe(true);
    });
  });

  // ============================================================================
  // DELAY REASON STORAGE TESTS
  // ============================================================================

  describe('delayReason Storage', () => {
    it('should include delayReason in releaseUpdates when extending targetReleaseDate', () => {
      // Arrange
      const oldTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20); // Extended
      const delayReason = 'Dependency on upstream release';
      const existingSlots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.releaseUpdates).toBeDefined();
      expect(result.releaseUpdates?.delayReason).toBe(delayReason);
    });

    it('should clear delayReason (set to null) when shortening targetReleaseDate', () => {
      // Arrange
      const oldTargetDate = createFutureDate(20);
      const newTargetDate = createFutureDate(10); // Shortened
      const existingSlots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      // When shortening, delayReason should be null (to clear in DB)
      expect(result.releaseUpdates?.delayReason).toBeNull();
    });

    it('should NOT include delayReason in releaseUpdates when date is unchanged', () => {
      // Arrange
      const targetDate = createFutureDate(10);
      const existingSlots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: targetDate,
        newDate: new Date(targetDate), // Same date
        existingSlots,
        delayReason: undefined
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.releaseUpdates?.delayReason).toBeUndefined();
    });

    it('should include delayReason in auditInfo when extending', () => {
      // Arrange
      const oldTargetDate = createFutureDate(10);
      const newTargetDate = createFutureDate(20);
      const delayReason = 'Team vacation period';
      const existingSlots: ReturnType<typeof createSlot>[] = [];
      
      // Act
      const result = validateTargetDateChange({
        oldDate: oldTargetDate,
        newDate: newTargetDate,
        existingSlots,
        delayReason
      });
      
      // Assert
      expect(result.auditInfo).toBeDefined();
      expect(result.auditInfo?.reason).toBe(delayReason);
    });
  });
});

