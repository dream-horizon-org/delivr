/**
 * Activity Log Utilities
 * 
 * Utility functions for formatting and processing activity log data
 */

import type { ActivityLog } from '~/types/release-process.types';
import { formatReleaseDateTime } from '~/utils/release-process-date';

/**
 * Get display name for the user who made the change
 */
export function getUpdatedByName(log: ActivityLog): string {
  return log.updatedByAccount?.name || log.updatedBy || 'Unknown';
}

/**
 * Format field name from camelCase to Title Case
 * Example: "targetReleaseDate" -> "Target Release Date"
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format a value, converting ISO date strings to readable format
 */
function formatValue(val: any): string {
  if (!val || val === 'N/A') return 'N/A';
  
  // Check if it's an ISO date string (contains 'T' and ends with 'Z' or has time component)
  if (typeof val === 'string' && (val.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(val))) {
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return formatReleaseDateTime(val);
      }
    } catch {
      // If parsing fails, return original value
    }
  }
  
  return String(val);
}

/**
 * Format complete activity log message
 * Returns a single formatted message instead of separate label + description
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL, RELEASE_ARCHIVED, RELEASE_CREATED, MANUAL_BUILD_UPLOADED, TASK_RETRIED, TESTFLIGHT_BUILD_VERIFIED
 */
export function formatActivityLogMessage(log: ActivityLog): string {
  const { type, previousValue, newValue } = log;

  // Handle null values
  if (!previousValue && !newValue) {
    return 'Activity recorded';
  }

  switch (type) {
    case 'PAUSE_RELEASE':
      if (newValue?.reason) {
        return `Release paused: ${newValue.reason}`;
      }
      return 'Release paused';

    case 'RESUME_RELEASE':
      return 'Release resumed';

    case 'REGRESSION_STAGE_APPROVAL':
      if (newValue) {
        const approvedBy = newValue.approvedBy || getUpdatedByName(log) || 'Unknown';
        return `Regression stage approved by ${approvedBy}`;
      }
      return 'Regression stage approval removed';

    case 'PRE_RELEASE_STAGE_APPROVAL':
      if (previousValue && newValue) {
        const oldStage = previousValue.currentActiveStage || 'N/A';
        const newStage = newValue.currentActiveStage || 'N/A';
        const approvedBy = getUpdatedByName(log);
        return `Pre-release stage approved by ${approvedBy}: ${oldStage} → ${newStage}`;
      }
      if (newValue) {
        const approvedBy = newValue.approvedBy || getUpdatedByName(log) || 'Unknown';
        return `Pre-release stage approved by ${approvedBy}`;
      }
      return 'Pre-release stage approval removed';

    case 'RELEASE':
      if (previousValue && newValue) {
        // Field updates
        const fields = Object.keys(newValue);
        const changes = fields
          .map(field => {
            const oldVal = previousValue[field];
            const newVal = newValue[field];
            if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
              const fieldLabel = formatFieldName(field);
              return `${fieldLabel}: ${formatValue(oldVal)} → ${formatValue(newVal)}`;
            }
            return null;
          })
          .filter(Boolean);
        
        if (changes.length > 0) {
          return `Release updated: ${changes.join(', ')}`;
        }
        
        if (previousValue.status && newValue.status) {
          return `Release status changed: ${previousValue.status} → ${newValue.status}`;
        }
        
        return 'Release updated';
      }
      if (newValue && !previousValue) {
        return 'Release created';
      }
      if (previousValue && !newValue) {
        return 'Release removed';
      }
      return 'Release activity';

    case 'PLATFORM_TARGET':
      if (previousValue && newValue) {
        const oldPlatform = previousValue.platform || 'N/A';
        const oldTarget = previousValue.target || 'N/A';
        const newPlatform = newValue.platform || 'N/A';
        const newTarget = newValue.target || 'N/A';
        return `Platform target updated: ${oldPlatform}/${oldTarget} → ${newPlatform}/${newTarget}`;
      }
      if (newValue && !previousValue) {
        const platform = newValue.platform || 'N/A';
        const target = newValue.target || 'N/A';
        return `Platform target added: ${platform}/${target}`;
      }
      if (previousValue && !newValue) {
        const platform = previousValue.platform || 'N/A';
        const target = previousValue.target || 'N/A';
        return `Platform target removed: ${platform}/${target}`;
      }
      return 'Platform target activity';

    case 'REGRESSION':
      if (previousValue && newValue) {
        const oldDate = previousValue.date ? new Date(previousValue.date).toLocaleDateString() : 'N/A';
        const newDate = newValue.date ? new Date(newValue.date).toLocaleDateString() : 'N/A';
        return `Regression slot updated: ${oldDate} → ${newDate}`;
      }
      if (newValue && !previousValue) {
        const date = newValue.date ? new Date(newValue.date).toLocaleDateString() : 'N/A';
        return `Regression slot added: ${date}`;
      }
      if (previousValue && !newValue) {
        const date = previousValue.date ? new Date(previousValue.date).toLocaleDateString() : 'N/A';
        return `Regression slot removed: ${date}`;
      }
      return 'Regression activity';

    case 'CRONCONFIG':
      if (previousValue && newValue) {
        return 'Cron configuration updated';
      }
      if (newValue && !previousValue) {
        return 'Cron configuration set';
      }
      if (previousValue && !newValue) {
        return 'Cron configuration removed';
      }
      return 'Cron configuration activity';

    case 'RELEASE_ARCHIVED':
      return 'Release archived';

    case 'RELEASE_CREATED':
      if (newValue) {
        const releaseType = newValue.type || 'Release';
        const branch = newValue.branch || 'N/A';
        const releaseId = newValue.releaseId || '';
        return `${releaseType} release created: ${branch}${releaseId ? ` (${releaseId})` : ''}`;
      }
      return 'Release created';

    case 'MANUAL_BUILD_UPLOADED':
      if (newValue) {
        const platform = newValue.platform || 'Unknown';
        const filename = newValue.filename || 'build file';
        const stage = newValue.stage || '';
        const allPlatformsReady = newValue.allPlatformsReady ? ' (All platforms ready)' : '';
        return `Manual build uploaded for ${platform}: ${filename}${stage ? ` in ${stage}` : ''}${allPlatformsReady}`;
      }
      return 'Manual build uploaded';

    case 'TASK_RETRIED':
      if (previousValue && newValue) {
        const oldStatus = previousValue.taskStatus || 'FAILED';
        const newStatus = newValue.taskStatus || 'PENDING';
        return `Task retried: ${oldStatus} → ${newStatus}`;
      }
      return 'Task retried';

    case 'TESTFLIGHT_BUILD_VERIFIED':
      if (newValue) {
        const platform = newValue.platform || 'Unknown';
        const version = newValue.version || 'N/A';
        const testflightNumber = newValue.testflightNumber || '';
        const stage = newValue.stage || '';
        return `TestFlight build verified for ${platform} ${version}${testflightNumber ? ` (#${testflightNumber})` : ''}${stage ? ` in ${stage}` : ''}`;
      }
      return 'TestFlight build verified';

    default:
      // Fallback for unknown types
      if (previousValue && newValue) {
        if (previousValue.status && newValue.status) {
          return `Status changed: ${previousValue.status} → ${newValue.status}`;
        }
        if (previousValue.field && newValue.field && previousValue.field === newValue.field) {
          return `${previousValue.field} updated: ${formatValue(previousValue.value)} → ${formatValue(newValue.value)}`;
        }
        if (previousValue.taskId && newValue.taskId && previousValue.taskId === newValue.taskId) {
          const taskType = newValue.taskType || previousValue.taskType || 'Task';
          const oldStatus = previousValue.status || 'N/A';
          const newStatus = newValue.status || 'N/A';
          return `${taskType} status changed: ${oldStatus} → ${newStatus}`;
        }
        return 'Activity updated';
      }
      if (newValue && !previousValue) {
        if (newValue.field) {
          return `${newValue.field} added: ${formatValue(newValue.value)}`;
        }
        if (newValue.integration) {
          return `${newValue.integration} event: ${newValue.event || 'N/A'}`;
        }
        return 'Activity added';
      }
      if (previousValue && !newValue) {
        if (previousValue.field) {
          return `${previousValue.field} removed: ${formatValue(previousValue.value)}`;
        }
        return 'Activity removed';
      }
      return 'Activity recorded';
  }
}
