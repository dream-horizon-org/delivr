/**
 * Release Date Calculator Utilities
 * Pure functions for calculating release-related dates from schedule configuration
 */

import type {
  WorkingDay,
  ReleaseFrequency,
  RegressionSlot,
  ReleaseDates,
  RegressionSlotDate
} from '~types/release-schedules';
import {
  addWorkingDays,
  subtractWorkingDays,
  getNextWorkingDay,
  toUTCISOString,
  parseISODate,
  toDateString
} from './working-days.utils';

// ============================================================================
// FREQUENCY CONSTANTS
// ============================================================================

const FREQUENCY_DAYS: Record<Exclude<ReleaseFrequency, 'MONTHLY'>, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  TRIWEEKLY: 21
};

// ============================================================================
// NEXT KICKOFF DATE CALCULATION
// ============================================================================

/**
 * Calculate the next release kickoff date based on frequency
 * 
 * - WEEKLY: +7 days
 * - BIWEEKLY: +14 days
 * - TRIWEEKLY: +21 days
 * - MONTHLY: +1 month (adjusted to next working day if needed)
 * 
 * @param currentKickoffDate - Current kickoff date string (YYYY-MM-DD or ISO)
 * @param frequency - Release frequency
 * @param workingDays - Array of working days (for monthly adjustment)
 * @returns Next kickoff date string (YYYY-MM-DD)
 */
export const calculateNextKickoffDate = (
  currentKickoffDate: string,
  frequency: ReleaseFrequency,
  workingDays: WorkingDay[]
): string => {
  const currentDate = parseISODate(currentKickoffDate);
  
  const isMonthly = frequency === 'MONTHLY';
  
  if (isMonthly) {
    // Add 1 month
    const nextDate = new Date(currentDate);
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
    
    // If lands on non-working day, move to next working day
    const adjustedDate = getNextWorkingDay(nextDate, workingDays);
    return toDateString(adjustedDate);
  }
  
  // For WEEKLY/BIWEEKLY/TRIWEEKLY: add fixed number of days
  const daysToAdd = FREQUENCY_DAYS[frequency];
  const nextDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  
  return toDateString(nextDate);
};

// ============================================================================
// INDIVIDUAL DATE CALCULATIONS
// ============================================================================

/**
 * Calculate kickoff date as UTC ISO string
 * 
 * @param kickoffDateStr - Kickoff date (YYYY-MM-DD)
 * @param kickoffTime - Kickoff time (HH:mm)
 * @param timezone - IANA timezone
 * @returns UTC ISO string
 */
export const calculateKickoffDate = (
  kickoffDateStr: string,
  kickoffTime: string,
  timezone: string
): string => {
  return toUTCISOString(kickoffDateStr, kickoffTime, timezone);
};

/**
 * Calculate kickoff reminder date as UTC ISO string
 * 
 * @param kickoffDateStr - Kickoff date (YYYY-MM-DD)
 * @param reminderTime - Reminder time (HH:mm)
 * @param reminderOffsetDays - Working days before kickoff (e.g., 1 = 1 day before)
 * @param workingDays - Array of working days
 * @param timezone - IANA timezone
 * @returns UTC ISO string
 */
export const calculateKickoffReminderDate = (
  kickoffDateStr: string,
  reminderTime: string,
  reminderOffsetDays: number,
  workingDays: WorkingDay[],
  timezone: string
): string => {
  const kickoffDate = parseISODate(kickoffDateStr);
  
  // Subtract working days from kickoff date
  const reminderDate = subtractWorkingDays(kickoffDate, reminderOffsetDays, workingDays);
  const reminderDateStr = toDateString(reminderDate);
  
  return toUTCISOString(reminderDateStr, reminderTime, timezone);
};

/**
 * Calculate target release date as UTC ISO string
 * 
 * @param kickoffDateStr - Kickoff date (YYYY-MM-DD)
 * @param offsetDays - Working days after kickoff
 * @param targetTime - Target release time (HH:mm)
 * @param workingDays - Array of working days
 * @param timezone - IANA timezone
 * @returns UTC ISO string
 */
export const calculateTargetReleaseDate = (
  kickoffDateStr: string,
  offsetDays: number,
  targetTime: string,
  workingDays: WorkingDay[],
  timezone: string
): string => {
  const kickoffDate = parseISODate(kickoffDateStr);
  
  // Add working days to kickoff date
  const targetDate = addWorkingDays(kickoffDate, offsetDays, workingDays);
  const targetDateStr = toDateString(targetDate);
  
  return toUTCISOString(targetDateStr, targetTime, timezone);
};

// ============================================================================
// COMBINED DATE CALCULATIONS
// ============================================================================

/**
 * Calculate all release dates from kickoff date and schedule configuration
 * 
 * @param kickoffDateStr - Kickoff date (YYYY-MM-DD)
 * @param config - Schedule configuration
 * @returns Object with kickOffDate, kickOffReminderDate, targetReleaseDate (all UTC ISO)
 */
export const calculateReleaseDates = (
  kickoffDateStr: string,
  config: {
    kickoffTime: string;
    kickoffReminderTime: string;
    kickoffReminderOffsetDays: number;
    targetReleaseTime: string;
    targetReleaseDateOffsetFromKickoff: number;
    workingDays: WorkingDay[];
    timezone: string;
  }
): ReleaseDates => {
  const kickOffDate = calculateKickoffDate(
    kickoffDateStr,
    config.kickoffTime,
    config.timezone
  );
  
  const kickOffReminderDate = calculateKickoffReminderDate(
    kickoffDateStr,
    config.kickoffReminderTime,
    config.kickoffReminderOffsetDays,
    config.workingDays,
    config.timezone
  );
  
  const targetReleaseDate = calculateTargetReleaseDate(
    kickoffDateStr,
    config.targetReleaseDateOffsetFromKickoff,
    config.targetReleaseTime,
    config.workingDays,
    config.timezone
  );
  
  return {
    kickOffDate,
    kickOffReminderDate,
    targetReleaseDate
  };
};

// ============================================================================
// REGRESSION SLOT DATE CALCULATIONS
// ============================================================================

/**
 * Calculate dates for all regression build slots
 * 
 * @param kickoffDateStr - Kickoff date (YYYY-MM-DD)
 * @param regressionSlots - Array of regression slot configurations
 * @param workingDays - Array of working days
 * @param timezone - IANA timezone
 * @returns Array of regression slot dates with config
 */
export const calculateRegressionSlotDates = (
  kickoffDateStr: string,
  regressionSlots: RegressionSlot[] | null,
  workingDays: WorkingDay[],
  timezone: string
): RegressionSlotDate[] => {
  const hasNoSlots = !regressionSlots || regressionSlots.length === 0;
  if (hasNoSlots) {
    return [];
  }
  
  const kickoffDate = parseISODate(kickoffDateStr);
  
  return regressionSlots.map(slot => {
    // Calculate date: kickoff + offset working days
    const slotDate = addWorkingDays(
      kickoffDate,
      slot.regressionSlotOffsetFromKickoff,
      workingDays
    );
    const slotDateStr = toDateString(slotDate);
    
    // Combine date + time + timezone → UTC ISO
    const dateISO = toUTCISOString(slotDateStr, slot.time, timezone);
    
    return {
      name: slot.name ?? null,
      date: dateISO,
      config: slot.config
    };
  });
};

