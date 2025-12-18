/**
 * Form Error Utilities
 * Centralized logic for clearing form errors when fields are updated
 */

import { FIELD_GROUPS } from '~/constants/release-creation';

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
