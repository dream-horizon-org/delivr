/**
 * Working Days Utilities
 * Handles date arithmetic accounting for working days configuration
 * 
 * WorkingDay type aligns with JavaScript Date.getDay():
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 * 4 = Thursday, 5 = Friday, 6 = Saturday
 */

import type { WorkingDay } from '~types/release-schedules';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default working days: All 7 days (Sun-Sat)
 * Used when workingDays array is empty
 */
const ALL_DAYS: WorkingDay[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * Milliseconds in one day
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ============================================================================
// WORKING DAY CHECKS
// ============================================================================

/**
 * Get effective working days (use all days if empty)
 */
const getEffectiveWorkingDays = (workingDays: WorkingDay[]): WorkingDay[] => {
  const isEmpty = workingDays.length === 0;
  return isEmpty ? ALL_DAYS : workingDays;
};

/**
 * Check if a date falls on a working day
 * @param date - The date to check
 * @param workingDays - Array of working days (0=Sunday, 6=Saturday)
 * @returns true if the date is a working day
 */
export const isWorkingDay = (date: Date, workingDays: WorkingDay[]): boolean => {
  const effectiveDays = getEffectiveWorkingDays(workingDays);
  const dayOfWeek = date.getDay() as WorkingDay;
  return effectiveDays.includes(dayOfWeek);
};

/**
 * Get the next working day from a given date
 * If the date is already a working day, returns the same date
 * @param date - The starting date
 * @param workingDays - Array of working days
 * @returns The next working day (or same date if already working day)
 */
export const getNextWorkingDay = (date: Date, workingDays: WorkingDay[]): Date => {
  const effectiveDays = getEffectiveWorkingDays(workingDays);
  let currentDate = new Date(date);
  
  // Safety limit to prevent infinite loop (max 7 days)
  const maxIterations = 7;
  let iterations = 0;
  
  while (!isWorkingDay(currentDate, effectiveDays) && iterations < maxIterations) {
    currentDate = new Date(currentDate.getTime() + MS_PER_DAY);
    iterations++;
  }
  
  return currentDate;
};

/**
 * Get the previous working day from a given date
 * If the date is already a working day, returns the same date
 * @param date - The starting date
 * @param workingDays - Array of working days
 * @returns The previous working day (or same date if already working day)
 */
export const getPreviousWorkingDay = (date: Date, workingDays: WorkingDay[]): Date => {
  const effectiveDays = getEffectiveWorkingDays(workingDays);
  let currentDate = new Date(date);
  
  // Safety limit to prevent infinite loop (max 7 days)
  const maxIterations = 7;
  let iterations = 0;
  
  while (!isWorkingDay(currentDate, effectiveDays) && iterations < maxIterations) {
    currentDate = new Date(currentDate.getTime() - MS_PER_DAY);
    iterations++;
  }
  
  return currentDate;
};

// ============================================================================
// WORKING DAY ARITHMETIC
// ============================================================================

/**
 * Add working days to a date
 * @param date - The starting date
 * @param days - Number of working days to add (must be >= 0)
 * @param workingDays - Array of working days
 * @returns New date after adding the specified working days
 * 
 * @example
 * // Friday + 1 working day (Mon-Fri working) = Monday
 * addWorkingDays(new Date('2025-01-10'), 1, [1,2,3,4,5])
 */
export const addWorkingDays = (
  date: Date,
  days: number,
  workingDays: WorkingDay[]
): Date => {
  const effectiveDays = getEffectiveWorkingDays(workingDays);
  
  // Handle zero days case
  const zeroDays = days === 0;
  if (zeroDays) {
    return new Date(date);
  }
  
  let currentDate = new Date(date);
  let remainingDays = days;
  
  // Safety limit (reasonable max: 365 days worth of calendar days)
  const maxIterations = days * 7;
  let iterations = 0;
  
  while (remainingDays > 0 && iterations < maxIterations) {
    // Move to next calendar day
    currentDate = new Date(currentDate.getTime() + MS_PER_DAY);
    iterations++;
    
    // Count only if it's a working day
    const isWorking = isWorkingDay(currentDate, effectiveDays);
    if (isWorking) {
      remainingDays--;
    }
  }
  
  return currentDate;
};

/**
 * Subtract working days from a date
 * @param date - The starting date
 * @param days - Number of working days to subtract (must be >= 0)
 * @param workingDays - Array of working days
 * @returns New date after subtracting the specified working days
 * 
 * @example
 * // Monday - 1 working day (Mon-Fri working) = Friday
 * subtractWorkingDays(new Date('2025-01-13'), 1, [1,2,3,4,5])
 */
export const subtractWorkingDays = (
  date: Date,
  days: number,
  workingDays: WorkingDay[]
): Date => {
  const effectiveDays = getEffectiveWorkingDays(workingDays);
  
  // Handle zero days case
  const zeroDays = days === 0;
  if (zeroDays) {
    return new Date(date);
  }
  
  let currentDate = new Date(date);
  let remainingDays = days;
  
  // Safety limit
  const maxIterations = days * 7;
  let iterations = 0;
  
  while (remainingDays > 0 && iterations < maxIterations) {
    // Move to previous calendar day
    currentDate = new Date(currentDate.getTime() - MS_PER_DAY);
    iterations++;
    
    // Count only if it's a working day
    const isWorking = isWorkingDay(currentDate, effectiveDays);
    if (isWorking) {
      remainingDays--;
    }
  }
  
  return currentDate;
};

// ============================================================================
// TIMEZONE UTILITIES
// ============================================================================

/**
 * Get timezone offset in minutes for a specific date and timezone
 * Uses Intl.DateTimeFormat to determine the offset
 * 
 * @param date - The date to check offset for
 * @param timezone - IANA timezone string (e.g., "Asia/Kolkata", "America/New_York")
 * @returns Offset in minutes (positive = ahead of UTC, negative = behind)
 * 
 * @example
 * getTimezoneOffsetMinutes(new Date('2025-01-15'), 'Asia/Kolkata') // Returns 330 (UTC+5:30)
 */
export const getTimezoneOffsetMinutes = (date: Date, timezone: string): number => {
  // Create formatter for the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Format the date in the target timezone
  const parts = formatter.formatToParts(date);
  
  // Extract components
  const year = parseInt(parts.find(p => p.type === 'year')?.value ?? '0', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value ?? '0', 10) - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value ?? '0', 10);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  const second = parseInt(parts.find(p => p.type === 'second')?.value ?? '0', 10);
  
  // Create a date as if it were UTC
  const tzDate = Date.UTC(year, month, day, hour, minute, second);
  
  // The difference is the offset
  const offsetMs = tzDate - date.getTime();
  const offsetMinutes = Math.round(offsetMs / (60 * 1000));
  
  return offsetMinutes;
};

/**
 * Parse time string in "HH:mm" format
 * @param time - Time string in "HH:mm" format
 * @returns Object with hours and minutes
 */
export const parseTimeString = (time: string): { hours: number; minutes: number } => {
  const [hoursStr, minutesStr] = time.split(':');
  return {
    hours: parseInt(hoursStr, 10),
    minutes: parseInt(minutesStr, 10)
  };
};

/**
 * Combine date + time + timezone into a UTC ISO string
 * 
 * @param dateStr - Date string in "YYYY-MM-DD" format (or ISO date)
 * @param time - Time string in "HH:mm" format
 * @param timezone - IANA timezone string
 * @returns UTC ISO string
 * 
 * @example
 * // "2025-01-15 09:00 Asia/Kolkata" → "2025-01-15T03:30:00.000Z"
 * toUTCISOString('2025-01-15', '09:00', 'Asia/Kolkata')
 */
export const toUTCISOString = (
  dateStr: string,
  time: string,
  timezone: string
): string => {
  // Parse the date (extract just the date part if ISO string)
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Parse the time
  const { hours, minutes } = parseTimeString(time);
  
  // Create a Date object assuming the input is in the target timezone
  // First, create a "fake" UTC date with the local time values
  const fakeUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  
  // Get the timezone offset for this date
  const offsetMinutes = getTimezoneOffsetMinutes(fakeUTC, timezone);
  
  // Adjust to get the actual UTC time
  // If timezone is UTC+5:30, local 09:00 = UTC 03:30
  // So we subtract the offset
  const utcMs = fakeUTC.getTime() - (offsetMinutes * 60 * 1000);
  const utcDate = new Date(utcMs);
  
  return utcDate.toISOString();
};

/**
 * Convert a Date object to just the date string "YYYY-MM-DD"
 * Uses UTC to avoid timezone issues
 */
export const toDateString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse an ISO date string to a Date object
 * Handles both "YYYY-MM-DD" and full ISO strings
 */
export const parseISODate = (dateStr: string): Date => {
  // If it's just a date, add time to avoid timezone issues
  const hasTime = dateStr.includes('T');
  const isoString = hasTime ? dateStr : `${dateStr}T00:00:00.000Z`;
  return new Date(isoString);
};
