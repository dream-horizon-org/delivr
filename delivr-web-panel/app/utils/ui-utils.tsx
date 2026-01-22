/**
 * Generic UI Utilities
 * Cross-cutting utilities for icons, labels, and formatting
 * Used across releases, configs, workflows, distribution, etc.
 * 
 * These utilities are domain-agnostic and can be used anywhere in the app.
 */

import { 
  IconBrandAndroid, 
  IconBrandApple, 
  IconDeviceMobile,
  IconServer,
  IconBrandGithub,
  IconRocket,
} from '@tabler/icons-react';
import { PLATFORMS } from '~/types/release-config-constants';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { PROVIDER_LABELS, BUILD_UPLOAD_LABELS } from '~/constants/release-config-ui';
import type { Platform } from '~/types/release-config';

/**
 * Get platform icon component
 * Supports ANDROID, IOS, and WEB platforms
 * 
 * @param platform - Platform string (ANDROID, IOS, or WEB)
 * @param size - Icon size in pixels (default: 16)
 * @returns React component for the platform icon
 * 
 * @example
 * getPlatformIcon('ANDROID', 20) // Returns <IconBrandAndroid size={20} />
 * getPlatformIcon('IOS', 16)     // Returns <IconBrandApple size={16} />
 * getPlatformIcon('WEB', 16)      // Returns <IconDeviceMobile size={16} />
 */
export function getPlatformIcon(platform: Platform | string, size: number = 16) {
  switch (platform.toUpperCase()) {
    case PLATFORMS.ANDROID:
      return <IconBrandAndroid size={size} />;
    case PLATFORMS.IOS:
      return <IconBrandApple size={size} />;
    default:
      return <IconDeviceMobile size={size} />;
  }
}

/**
 * Get build provider icon component
 * Returns icon for Jenkins, GitHub Actions, or default icon
 * 
 * @param provider - Build provider string (JENKINS, GITHUB_ACTIONS, etc.)
 * @param size - Icon size in pixels (default: 18)
 * @returns React component for the provider icon
 * 
 * @example
 * getBuildProviderIcon('JENKINS', 20)        // Returns <IconServer size={20} />
 * getBuildProviderIcon('GITHUB_ACTIONS', 18) // Returns <IconBrandGithub size={18} />
 */
export function getBuildProviderIcon(provider: string, size: number = 18) {
  switch (provider) {
    case BUILD_PROVIDERS.JENKINS:
      return <IconServer size={size} />;
    case BUILD_PROVIDERS.GITHUB_ACTIONS:
      return <IconBrandGithub size={size} />;
    default:
      return <IconRocket size={size} />;
  }
}

/**
 * Get build provider display label
 * Returns human-readable label for build providers
 * 
 * @param provider - Build provider string (JENKINS, GITHUB_ACTIONS, MANUAL_UPLOAD, etc.)
 * @returns Display label string
 * 
 * @example
 * getBuildProviderLabel('JENKINS')        // Returns 'Jenkins'
 * getBuildProviderLabel('GITHUB_ACTIONS') // Returns 'GitHub Actions'
 * getBuildProviderLabel('MANUAL_UPLOAD')  // Returns 'Manual Upload'
 */
export function getBuildProviderLabel(provider: string): string {
  if (provider === BUILD_PROVIDERS.JENKINS) return PROVIDER_LABELS.JENKINS;
  if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) return PROVIDER_LABELS.GITHUB_ACTIONS;
  if (provider === BUILD_PROVIDERS.MANUAL_UPLOAD) return BUILD_UPLOAD_LABELS.MANUAL;
  return provider;
}

/**
 * Format date and time for display
 * Returns formatted date string with month, day, year, hour, and minute
 * 
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "Jan 15, 2024, 10:30 AM")
 * 
 * @example
 * formatDateTime('2024-01-15T10:30:00Z') // Returns "Jan 15, 2024, 10:30 AM"
 * formatDateTime(new Date())              // Returns current date/time formatted
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

