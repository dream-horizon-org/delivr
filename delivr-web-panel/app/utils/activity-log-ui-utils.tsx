/**
 * Activity Log UI Utilities
 * 
 * Utility functions for activity log UI components (icons, colors)
 */

import {
  IconCheck,
  IconClock,
  IconEdit,
  IconPlayerPause,
  IconPlayerPlay,
  IconSettings,
  IconTag,
  IconUpload,
  IconArchive,
  IconRocket,
  IconRefresh,
  IconPlane,
  IconMessageCircle,
} from '@tabler/icons-react';

/**
 * Get icon for activity type
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL, RELEASE_ARCHIVED, RELEASE_CREATED, MANUAL_BUILD_UPLOADED, TASK_RETRIED, TESTFLIGHT_BUILD_VERIFIED, AD_HOC_NOTIFICATION
 */
export function getActivityIcon(type: string): React.ReactNode {
  switch (type) {
    // Backend activity types
    case 'RELEASE':
      return <IconTag size={16} />;
    case 'PLATFORM_TARGET':
      return <IconSettings size={16} />;
    case 'REGRESSION':
      return <IconCheck size={16} />;
    case 'CRONCONFIG':
      return <IconSettings size={16} />;
    case 'PAUSE_RELEASE':
      return <IconPlayerPause size={16} />;
    case 'RESUME_RELEASE':
      return <IconPlayerPlay size={16} />;
    case 'REGRESSION_STAGE_APPROVAL':
      return <IconCheck size={16} />;
    case 'PRE_RELEASE_STAGE_APPROVAL':
      return <IconCheck size={16} />;
    case 'RELEASE_ARCHIVED':
      return <IconArchive size={16} />;
    case 'RELEASE_CREATED':
      return <IconRocket size={16} />;
    case 'MANUAL_BUILD_UPLOADED':
      return <IconUpload size={16} />;
    case 'TASK_RETRIED':
      return <IconRefresh size={16} />;
    case 'TESTFLIGHT_BUILD_VERIFIED':
      return <IconPlane size={16} />;
    case 'AD_HOC_NOTIFICATION':
      return <IconMessageCircle size={16} />;
    // Legacy types (for backward compatibility)
    case 'RELEASE_STATUS_CHANGE':
      return <IconTag size={16} />;
    case 'TASK_UPDATE':
      return <IconCheck size={16} />;
    case 'RELEASE_FIELD_UPDATE':
      return <IconEdit size={16} />;
    case 'RELEASE_PAUSED':
      return <IconPlayerPause size={16} />;
    case 'RELEASE_RESUMED':
      return <IconPlayerPlay size={16} />;
    case 'INTEGRATION_EVENT':
      return <IconSettings size={16} />;
    default:
      return <IconClock size={16} />;
  }
}

/**
 * Get color for activity type
 * Handles backend activity types: RELEASE, PLATFORM_TARGET, REGRESSION, CRONCONFIG, PAUSE_RELEASE, RESUME_RELEASE, REGRESSION_STAGE_APPROVAL, RELEASE_ARCHIVED, RELEASE_CREATED, MANUAL_BUILD_UPLOADED, TASK_RETRIED, TESTFLIGHT_BUILD_VERIFIED, AD_HOC_NOTIFICATION
 */
export function getActivityColor(type: string): string {
  switch (type) {
    // Backend activity types
    case 'RELEASE':
      return 'blue';
    case 'PLATFORM_TARGET':
      return 'violet';
    case 'REGRESSION':
      return 'green';
    case 'CRONCONFIG':
      return 'orange';
    case 'PAUSE_RELEASE':
      return 'red';
    case 'RESUME_RELEASE':
      return 'teal';
    case 'REGRESSION_STAGE_APPROVAL':
      return 'green';
    case 'PRE_RELEASE_STAGE_APPROVAL':
      return 'green';
    case 'RELEASE_ARCHIVED':
      return 'gray';
    case 'RELEASE_CREATED':
      return 'blue';
    case 'MANUAL_BUILD_UPLOADED':
      return 'green';
    case 'TASK_RETRIED':
      return 'orange';
    case 'TESTFLIGHT_BUILD_VERIFIED':
      return 'teal';
    case 'AD_HOC_NOTIFICATION':
      return 'brand';
    // Legacy types (for backward compatibility)
    case 'RELEASE_STATUS_CHANGE':
      return 'blue';
    case 'TASK_UPDATE':
      return 'green';
    case 'RELEASE_FIELD_UPDATE':
      return 'orange';
    case 'RELEASE_PAUSED':
      return 'red';
    case 'RELEASE_RESUMED':
      return 'teal';
    case 'INTEGRATION_EVENT':
      return 'violet';
    default:
      return 'gray';
  }
}
