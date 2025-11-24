/**
 * Scheduling Configuration Default Values
 * Business logic defaults for release train scheduling
 * 
 * NO HARDCODED VALUES IN COMPONENTS - USE THIS FILE!
 */

// ============================================================================
// Default Scheduling Values
// ============================================================================

export const SCHEDULING_DEFAULTS = {
  // Version numbering
  INITIAL_VERSION: '1.0.0',
  
  // Release frequency
  RELEASE_FREQUENCY: 'WEEKLY' as const,
  CUSTOM_FREQUENCY_DAYS: undefined,
  
  // Timing
  KICKOFF_TIME: '10:00',
  KICKOFF_REMINDER_ENABLED: true,
  KICKOFF_REMINDER_TIME: '09:00',
  TARGET_RELEASE_TIME: '18:00',
  TARGET_RELEASE_OFFSET_DAYS: 5,
  
  // Working days (Monday = 1, Sunday = 7)
  WORKING_DAYS: [1, 2, 3, 4, 5] as number[], // Monday to Friday
  
  // Timezone
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  
  // Regression slots
  REGRESSION_SLOTS: [] as any[], // Empty by default
  
  // First release kickoff date
  FIRST_RELEASE_KICKOFF_DATE: '', // To be set by user
} as const;

// ============================================================================
// Working Days Constants
// ============================================================================

export const WORKING_DAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

// Standard working week (Monday - Friday)
export const STANDARD_WORKING_WEEK = [
  WORKING_DAYS.MONDAY,
  WORKING_DAYS.TUESDAY,
  WORKING_DAYS.WEDNESDAY,
  WORKING_DAYS.THURSDAY,
  WORKING_DAYS.FRIDAY,
] as const;

// ============================================================================
// Release Frequency Options
// ============================================================================

export const RELEASE_FREQUENCY = {
  WEEKLY: 'WEEKLY',
  BI_WEEKLY: 'BI_WEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM',
} as const;

export type ReleaseFrequency = typeof RELEASE_FREQUENCY[keyof typeof RELEASE_FREQUENCY];

// ============================================================================
// Timezone Options (Common timezones)
// ============================================================================

export const COMMON_TIMEZONES = {
  IST: 'Asia/Kolkata',
  PST: 'America/Los_Angeles',
  EST: 'America/New_York',
  UTC: 'UTC',
  GMT: 'Europe/London',
  CET: 'Europe/Paris',
} as const;

