/**
 * Regression Slot Utility Functions
 * Business logic for regression slot operations
 */

import type { RegressionSlot } from '~/types/release-config';
import { REGRESSION_ACTIVITY_LABELS } from '~/constants/release-config-ui';

/**
 * Sort regression slots by offset from kickoff, then by time
 * @param slots - Array of regression slots to sort
 * @returns Sorted array of regression slots
 */
export function sortRegressionSlots(slots: RegressionSlot[]): RegressionSlot[] {
  return [...slots].sort((a, b) => {
    if (a.regressionSlotOffsetFromKickoff !== b.regressionSlotOffsetFromKickoff) {
      return a.regressionSlotOffsetFromKickoff - b.regressionSlotOffsetFromKickoff;
    }
    return a.time.localeCompare(b.time);
  });
}

/**
 * Get activity badge labels for a regression slot
 * @param slot - Regression slot to extract activities from
 * @returns Array of activity label strings
 */
export function getSlotActivityLabels(slot: RegressionSlot): string[] {
  const activities: string[] = [];
  
  if (slot.config.regressionBuilds) {
    activities.push(REGRESSION_ACTIVITY_LABELS.REGRESSION_BUILDS);
  }
  if (slot.config.postReleaseNotes) {
    activities.push(REGRESSION_ACTIVITY_LABELS.POST_RELEASE_NOTES);
  }
  if (slot.config.automationBuilds) {
    activities.push(REGRESSION_ACTIVITY_LABELS.AUTOMATION_BUILDS);
  }
  if (slot.config.automationRuns) {
    activities.push(REGRESSION_ACTIVITY_LABELS.AUTOMATION_RUNS);
  }
  
  return activities;
}




