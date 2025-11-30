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



