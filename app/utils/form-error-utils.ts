/**
 * Form Error Utilities
 * Centralized logic for clearing form errors when fields are updated
 */

import { FIELD_GROUPS } from '~/constants/release-creation';
import { TARGET_PLATFORM_LABELS } from '~/constants/release-config-ui';
import type { TargetPlatform } from '~/types/release-config';

/**
 * Clear errors for updated fields and their related fields
 * 
 * @param errors - Current error object
 * @param updatedFields - Array of field names that were updated
 * @returns New error object with cleared errors
 */
export function clearErrorsForFields(
  errors: Record<string, string>,
  updatedFields: string[]
): Record<string, string> {
  const cleared = { ...errors };

  updatedFields.forEach((field) => {
    // Clear direct field errors
    if (cleared[field]) {
      delete cleared[field];
    }

    // Clear errors for field groups
    Object.entries(FIELD_GROUPS).forEach(([groupKey, groupFields]) => {
      if ((groupFields as readonly string[]).includes(field)) {
        (groupFields as readonly string[]).forEach((groupField) => {
          if (cleared[groupField]) {
            delete cleared[groupField];
          }
        });
      }
    });

    // Special handling for nested errors
    if (field === 'regressionBuildSlots') {
      Object.keys(cleared).forEach((errorKey) => {
        if (errorKey.startsWith('regressionBuildSlots[')) {
          delete cleared[errorKey];
        }
      });
    }

    if (field === 'platformTargets') {
      Object.keys(cleared).forEach((errorKey) => {
        if (errorKey.startsWith('platformTargets') || errorKey.startsWith('version-')) {
          delete cleared[errorKey];
        }
      });
    }

    // Clear dependent field errors
    if (field === 'kickOffDate' || field === 'kickOffTime') {
      if (cleared.targetReleaseDate?.includes('after kickoff')) {
        delete cleared.targetReleaseDate;
      }
    }
  });

  return cleared;
}

/**
 * Format field name for display in error messages
 * Converts camelCase/PascalCase field names to human-readable labels
 * 
 * @param field - Field name (e.g., 'platformTargets', 'kickOffDate', 'version-PLAY_STORE')
 * @returns Formatted label (e.g., 'Platform Targets', 'Kickoff Date', 'Play Store Version')
 * 
 * @example
 * formatFieldLabel('platformTargets')  // → 'Platform Targets'
 * formatFieldLabel('kickOffDate')      // → 'Kickoff Date'
 * formatFieldLabel('targetReleaseDate') // → 'Target Release Date'
 * formatFieldLabel('version-PLAY_STORE') // → 'Play Store Version'
 * formatFieldLabel('platformTargets[0].version') // → 'Platform Target 1 Version'
 */
export function formatFieldLabel(field: string): string {
  // Handle slot-{number} format - message already includes slot number, so return empty
  if (field.startsWith('slot-')) {
    return '';
  }

  // Handle version-{TARGET} format (e.g., "version-PLAY_STORE" → "Play Store Version")
  if (field.startsWith('version-')) {
    const target = field.replace('version-', '') as TargetPlatform;
    const targetLabel = TARGET_PLATFORM_LABELS[target] || target.replace(/_/g, ' ');
    return `${targetLabel} Version`;
  }

  // Handle platformTargets[index].version format
  const platformTargetVersionMatch = field.match(/^platformTargets\[(\d+)\]\.version$/);
  if (platformTargetVersionMatch) {
    const index = parseInt(platformTargetVersionMatch[1]) + 1;
    return `Platform Target ${index} Version`;
  }

  // Handle platformTargets[index] format
  const platformTargetIndexMatch = field.match(/^platformTargets\[(\d+)\]$/);
  if (platformTargetIndexMatch) {
    const index = parseInt(platformTargetIndexMatch[1]) + 1;
    return `Platform Target ${index}`;
  }

  // Handle initialVersions[index].version format (scheduling config)
  const initialVersionMatch = field.match(/^initialVersions\[(\d+)\]\.version$/);
  if (initialVersionMatch) {
    const index = parseInt(initialVersionMatch[1]) + 1;
    return `Initial Version ${index}`;
  }

  // Handle initialVersions[index] format
  const initialVersionIndexMatch = field.match(/^initialVersions\[(\d+)\]$/);
  if (initialVersionIndexMatch) {
    const index = parseInt(initialVersionIndexMatch[1]) + 1;
    return `Initial Version ${index}`;
  }

  // Default formatting for other fields
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/platform targets/i, 'Platform Targets')
    .replace(/kick off/i, 'Kickoff')
    .replace(/target release/i, 'Target Release')
    .replace(/release config/i, 'Configuration');
}
