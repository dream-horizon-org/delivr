/**
 * Regression Slot Validation Utility
 * Validates regression slots for release creation (absolute date format)
 * 
 * Validation Rules:
 * 1. Must be between kickoff and target release date
 * 2. Must be in the future
 * 3. No duplicate slots (same date-time)
 * 4. After kickoff: existing slots must be updated to future time
 */

import type { RegressionBuildSlotBackend } from '~/types/release-creation-backend';

export interface SlotValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate a regression slot
 * 
 * @param slot - Slot to validate
 * @param allSlots - All existing slots (for duplicate check)
 * @param currentIndex - Index of current slot (-1 for pending/new slot)
 * @param kickOffISO - Kickoff date as ISO string
 * @param targetReleaseISO - Target release date as ISO string
 * @param isAfterKickoff - Whether release has already kicked off
 * @returns Validation result with errors if any
 */
export function validateSlot(
  slot: RegressionBuildSlotBackend,
  allSlots: RegressionBuildSlotBackend[],
  currentIndex: number,
  kickOffISO: string,
  targetReleaseISO: string,
  isAfterKickoff: boolean
): SlotValidationResult {
  const errors: string[] = [];
  const slotDate = new Date(slot.date);
  const kickoffDate = new Date(kickOffISO);
  const targetDate = new Date(targetReleaseISO);
  const now = new Date();
  
  // Validate date is valid
  if (isNaN(slotDate.getTime())) {
    errors.push('Invalid date');
    return { isValid: false, errors };
  }
  
  // 1. Must be between kickoff and target release
  if (slotDate < kickoffDate) {
    errors.push('Slot must be after kickoff date');
  }
  if (slotDate > targetDate) {
    errors.push('Slot must be before target release date');
  }
  
  // 2. Must be in the future
  if (slotDate <= now) {
    errors.push('Slot must be in the future');
  }
  
  // 3. No duplicates (same date-time)
  const duplicateSlot = allSlots.find((s, i) => {
    if (i === currentIndex) return false; // Skip self
    const sDate = new Date(s.date);
    // Compare down to the minute (ignore seconds/milliseconds)
    return (
      sDate.getFullYear() === slotDate.getFullYear() &&
      sDate.getMonth() === slotDate.getMonth() &&
      sDate.getDate() === slotDate.getDate() &&
      sDate.getHours() === slotDate.getHours() &&
      sDate.getMinutes() === slotDate.getMinutes()
    );
  });
  
  if (duplicateSlot) {
    errors.push('Another slot already exists at this date and time');
  }
  
  // 4. After kickoff: existing slots can be edited, but must be updated to future
  if (isAfterKickoff && slotDate <= now) {
    errors.push('Existing slots must be updated to a future time');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all slots in an array
 * 
 * @param slots - Array of slots to validate
 * @param kickOffISO - Kickoff date as ISO string
 * @param targetReleaseISO - Target release date as ISO string
 * @param isAfterKickoff - Whether release has already kicked off
 * @returns Map of index to validation errors
 */
export function validateAllSlots(
  slots: RegressionBuildSlotBackend[],
  kickOffISO: string,
  targetReleaseISO: string,
  isAfterKickoff: boolean
): Record<number, string[]> {
  const errors: Record<number, string[]> = {};
  
  slots.forEach((slot, index) => {
    const validation = validateSlot(
      slot,
      slots,
      index,
      kickOffISO,
      targetReleaseISO,
      isAfterKickoff
    );
    
    if (!validation.isValid) {
      errors[index] = validation.errors;
    }
  });
  
  return errors;
}

