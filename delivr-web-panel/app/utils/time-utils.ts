/**
 * Time Utility Functions
 * 
 * Reusable time-related utility functions
 * No 'any' or 'unknown' types - all explicitly typed
 */

/**
 * Convert HH:MM time string to minutes for comparison
 * 
 * @param time - Time string in HH:MM format (e.g., '09:30')
 * @returns Number of minutes from midnight, or 0 if time is invalid/undefined
 * 
 * @example
 * timeToMinutes('09:30') // returns 570 (9 * 60 + 30)
 * timeToMinutes('00:00') // returns 0
 * timeToMinutes(undefined) // returns 0
 */
export function timeToMinutes(time: string | undefined): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  
  // Validate parsed values
  if (isNaN(hours) || isNaN(minutes)) {
    return 0;
  }
  
  return hours * 60 + minutes;
}

/**
 * Add hours to a time string
 * 
 * @param time - Time string in HH:MM format (e.g., '09:30')
 * @param hoursToAdd - Number of hours to add (can be negative)
 * @returns New time string in HH:MM format
 * 
 * @example
 * addHoursToTime('09:30', 6) // returns '15:30'
 * addHoursToTime('20:00', 6) // returns '02:00' (wraps to next day)
 */
export function addHoursToTime(time: string, hoursToAdd: number): string {
  if (!time) return '00:00';
  const [hours, minutes] = time.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return '00:00';
  }
  
  let newHours = hours + hoursToAdd;
  // Handle day overflow (24-hour format)
  if (newHours >= 24) {
    newHours = newHours % 24;
  } else if (newHours < 0) {
    newHours = 24 + (newHours % 24);
  }
  
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Normalize time string to HH:MM format (removes AM/PM)
 * Exported so it can be used in components
 */
export function normalizeTime(time: string): string {
  if (!time) return '00:00';
  // Remove AM/PM and trim
  let normalized = time.replace(/AM|PM/gi, '').trim();
  
  // If it has AM/PM, convert to 24-hour format
  const isPM = /PM/i.test(time);
  const isAM = /AM/i.test(time);
  
  if (isPM || isAM) {
    const [hours, minutes = '00'] = normalized.split(':');
    let hour24 = parseInt(hours, 10);
    if (isPM && hour24 !== 12) hour24 += 12;
    if (isAM && hour24 === 12) hour24 = 0;
    normalized = `${hour24.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  
  // Ensure format is HH:MM
  if (!normalized.includes(':')) {
    return '00:00';
  }
  
  return normalized;
}

/**
 * Calculate next slot time (6 hours after the last slot)
 * If no slots exist, returns default time
 * 
 * @param lastSlot - Last slot in the list (optional)
 * @param defaultOffsetDays - Default days offset if no slots exist
 * @param defaultTime - Default time if no slots exist
 * @returns Object with offsetDays and time for the next slot
 */
export function calculateNextSlotTime(
  lastSlot: { regressionSlotOffsetFromKickoff: number; time: string } | undefined,
  defaultOffsetDays: number,
  defaultTime: string
): { offsetDays: number; time: string } {
  if (!lastSlot) {
    return { offsetDays: defaultOffsetDays, time: normalizeTime(defaultTime) };
  }
  
  // Normalize the last slot time first
  const normalizedLastTime = normalizeTime(lastSlot.time);
  
  // Add 6 hours to the last slot time
  const nextTime = addHoursToTime(normalizedLastTime, 6);
  
  // If time wraps to next day (e.g., 20:00 + 6 = 02:00), increment day offset
  const lastSlotMinutes = timeToMinutes(normalizedLastTime);
  const nextSlotMinutes = timeToMinutes(nextTime);
  
  let nextOffsetDays = lastSlot.regressionSlotOffsetFromKickoff;
  if (nextSlotMinutes < lastSlotMinutes) {
    // Time wrapped to next day (e.g., 22:00 + 6 = 04:00)
    nextOffsetDays += 1;
  }
  
  return { offsetDays: nextOffsetDays, time: nextTime };
}

/**
 * Format date as relative time (compact format)
 * Returns short format like "5m ago", "2h ago", "3d ago" for recent dates
 * Falls back to formatted date for older items (7+ days)
 * 
 * @param dateString - ISO date string or null
 * @returns Formatted relative time string or formatted date
 * 
 * @example
 * formatRelativeTimeCompact('2024-01-15T10:00:00Z') // Returns "5m ago" (if 5 mins ago)
 * formatRelativeTimeCompact('2024-01-15T08:00:00Z') // Returns "2h ago" (if 2 hours ago)
 * formatRelativeTimeCompact('2024-01-10T10:00:00Z') // Returns "Jan 10, 2024" (if 7+ days ago)
 */
export function formatRelativeTimeCompact(dateString: string | null): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

