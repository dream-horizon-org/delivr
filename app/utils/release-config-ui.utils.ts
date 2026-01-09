/**
 * Release Configuration UI Utilities
 * Domain-specific utilities for release configuration display.
 * For generic utilities (platform icons, provider icons, etc.), use ui-utils.tsx
 */

import type { ReleaseConfiguration } from '~/types/release-config';

// Re-export getPlatformIcon from ui-utils for backward compatibility
export { getPlatformIcon } from '~/utils/ui-utils';

export function getReleaseConfigStatusDisplay(config: ReleaseConfiguration): {
  label: string;
  color: string;
} {
  if (config.status === 'DRAFT') {
    return { label: 'DRAFT', color: 'yellow' };
  }
  return config.isActive
    ? { label: 'ACTIVE', color: 'green' }
    : { label: 'ARCHIVED', color: 'gray' };
}

/**
 * Note: These colors are specifically for Release Configuration display.
 * For Release cards, use getReleaseTypeColor from release-utils.ts which may have different colors.
 */
export const RELEASE_CONFIG_TYPE_COLORS = {
  MAJOR: 'red',
  MINOR: 'blue',
  HOTFIX: 'orange',
} as const;

export function getReleaseConfigTypeColor(type: string): string {
  return RELEASE_CONFIG_TYPE_COLORS[type.toUpperCase() as keyof typeof RELEASE_CONFIG_TYPE_COLORS] || 'blue';
}

