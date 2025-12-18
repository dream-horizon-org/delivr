/**
 * Time Checking Utilities
 * 
 * Functions to check if tasks should execute based on time constraints.
 * Uses a 60-second window since cron jobs poll every 60 seconds.
 * 
 * Follows cursorrules: No 'any' types - use explicit types
 */

/**
 * Release object structure for time checking
 */
export interface ReleaseForTimeCheck {
  kickOffReminderDate?: Date | string | null;
  kickOffDate: Date | string | null;  // Schema uses kickOffDate, not plannedDate
  id: string;
}

/**
 * Regression slot structure
 */
export interface RegressionSlot {
  date: Date | string;
  config: Record<string, unknown>;
}

/**
 * Cron job structure for regression slot checking
 */
export interface CronJobForTimeCheck {
  upcomingRegressions?: RegressionSlot[] | string | null;
}

/**
 * Time window in milliseconds (60 seconds)
 * Cron jobs poll every 60 seconds, so tasks execute within this window
 */
const TIME_WINDOW_MS = 60000;

/**
 * Check if kickoff reminder time has arrived
 * 
 * @param release - Release object with kickOffReminderDate
 * @returns true if current time is within 60 seconds of kickOffReminderDate
 */
export function isKickOffReminderTime(release: ReleaseForTimeCheck): boolean {
  if (!release.kickOffReminderDate) {
    return false;
  }

  const now = new Date();
  const reminderTime = new Date(release.kickOffReminderDate);

  // Check if reminder time is valid
  if (isNaN(reminderTime.getTime())) {
    return false;
  }

  // Calculate time difference in milliseconds
  const diff = Math.abs(now.getTime() - reminderTime.getTime());

  // Return true if within 60-second window
  return diff < TIME_WINDOW_MS;
}

/**
 * Check if branch fork time has arrived
 * 
 * Returns true if:
 * - kickOffDate is in the past (catch-up execution)
 * - kickOffDate is now or within the current window
 * 
 * This allows the FORK_BRANCH task to execute even if the scheduler
 * starts late or the release is created with a past kickOffDate.
 * 
 * Similar to regression slot behavior: execute any past-due task
 * as long as it hasn't been completed yet.
 * 
 * @param release - Release object with kickOffDate
 * @returns true if fork task should execute
 */
export function isBranchForkTime(release: ReleaseForTimeCheck): boolean {
  if (!release.kickOffDate) {
    return false;
  }

  const now = new Date();
  const forkTime = new Date(release.kickOffDate);

  // Check if fork time is valid
  if (isNaN(forkTime.getTime())) {
    return false;
  }

  // Execute if kickOffDate is in the past or present (catch-up mode)
  // No future check - task should wait if kickOffDate hasn't arrived yet
  return forkTime.getTime() <= now.getTime();
}

/**
 * Check if regression slot time has arrived
 * 
 * @param cronJob - Cron job object with upcomingRegressions array
 * @param slotDate - The date of the regression slot to check (optional, checks all slots if not provided)
 * @returns true if current time is within 60 seconds of any regression slot date (or specific slot if provided)
 */
export function isRegressionSlotTime(
  cronJob: CronJobForTimeCheck,
  slotDate?: Date | string
): boolean {
  if (!cronJob.upcomingRegressions) {
    return false;
  }

  // Parse upcomingRegressions if it's a string (JSON)
  let slots: RegressionSlot[];
  if (typeof cronJob.upcomingRegressions === 'string') {
    try {
      slots = JSON.parse(cronJob.upcomingRegressions) as RegressionSlot[];
    } catch {
      return false;
    }
  } else {
    slots = cronJob.upcomingRegressions;
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    return false;
  }

  const now = new Date();

  // If specific slot date provided, check only that slot
  if (slotDate) {
    const targetSlotTime = new Date(slotDate);
    if (isNaN(targetSlotTime.getTime())) {
      return false;
    }

    const diff = Math.abs(now.getTime() - targetSlotTime.getTime());
    return diff < TIME_WINDOW_MS;
  }

  // Otherwise, check all slots - return true if any slot time has arrived
  for (const slot of slots) {
    const slotTime = new Date(slot.date);
    if (isNaN(slotTime.getTime())) {
      continue; // Skip invalid dates
    }

    const diff = Math.abs(now.getTime() - slotTime.getTime());
    if (diff < TIME_WINDOW_MS) {
      return true; // At least one slot time has arrived
    }
  }

  return false; // No slot times have arrived
}

/**
 * Check if a specific regression slot time has arrived (by slot index)
 * 
 * @param cronJob - Cron job object with upcomingRegressions array
 * @param slotIndex - Index of the slot in upcomingRegressions array
 * @returns true if current time is within 60 seconds of the specified slot date
 */
export function isSpecificRegressionSlotTime(
  cronJob: CronJobForTimeCheck,
  slotIndex: number
): boolean {
  if (!cronJob.upcomingRegressions) {
    return false;
  }

  // Parse upcomingRegressions if it's a string (JSON)
  let slots: RegressionSlot[];
  if (typeof cronJob.upcomingRegressions === 'string') {
    try {
      slots = JSON.parse(cronJob.upcomingRegressions) as RegressionSlot[];
    } catch {
      return false;
    }
  } else {
    slots = cronJob.upcomingRegressions;
  }

  if (!Array.isArray(slots) || slotIndex < 0 || slotIndex >= slots.length) {
    return false;
  }

  const slot = slots[slotIndex];
  if (!slot || !slot.date) {
    return false;
  }

  const now = new Date();
  const slotTime = new Date(slot.date);

  if (isNaN(slotTime.getTime())) {
    return false;
  }

  const diff = Math.abs(now.getTime() - slotTime.getTime());
  return diff < TIME_WINDOW_MS;
}

/**
 * Get the time difference in milliseconds between current time and a target date
 * 
 * @param targetDate - Target date to compare with current time
 * @returns Time difference in milliseconds (positive if target is in future, negative if in past)
 */
export function getTimeDifference(targetDate: Date | string): number {
  const now = new Date();
  const target = new Date(targetDate);

  if (isNaN(target.getTime())) {
    return NaN;
  }

  return target.getTime() - now.getTime();
}

/**
 * Check if a date is in the past (more than TIME_WINDOW_MS ago)
 * 
 * @param date - Date to check
 * @returns true if date is more than 60 seconds in the past
 */
export function isPastTime(date: Date | string): boolean {
  const now = new Date();
  const target = new Date(date);

  if (isNaN(target.getTime())) {
    return false;
  }

  const diff = now.getTime() - target.getTime();
  return diff > TIME_WINDOW_MS;
}

/**
 * Check if a date is in the future (more than TIME_WINDOW_MS ahead)
 * 
 * @param date - Date to check
 * @returns true if date is more than 60 seconds in the future
 */
export function isFutureTime(date: Date | string): boolean {
  const now = new Date();
  const target = new Date(date);

  if (isNaN(target.getTime())) {
    return false;
  }

  const diff = target.getTime() - now.getTime();
  return diff > TIME_WINDOW_MS;
}

