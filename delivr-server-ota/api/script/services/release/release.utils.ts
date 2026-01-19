/**
 * Release Utilities
 * 
 * Domain-specific utility functions for release orchestration.
 */

/**
 * Platform-version mapping for generating version strings
 */
type PlatformVersionMapping = {
  platform: string;
  version: string;
};

/**
 * Generate release version string from platform mappings
 * Format: "{version}_{platform}_{version}_{platform}" (sorted alphabetically by platform)
 * 
 * This implements the Version String Strategy:
 * - Multiple platforms get combined into a single version string
 * - Sorted alphabetically by platform name
 * - Example: Android 7.0.0 + iOS 6.7.0 → "7.0.0_android_6.7.0_ios"
 * 
 * @example
 * // Single platform
 * generatePlatformVersionString([{ platform: 'ANDROID', version: '7.0.0' }])
 * // Returns: "7.0.0_android"
 * 
 * @example
 * // Multiple platforms (sorted alphabetically)
 * generatePlatformVersionString([
 *   { platform: 'IOS', version: '6.7.0' },
 *   { platform: 'ANDROID', version: '7.0.0' }
 * ])
 * // Returns: "7.0.0_android_6.7.0_ios"
 * 
 * @example
 * // Three platforms
 * generatePlatformVersionString([
 *   { platform: 'WEB', version: '8.0.0' },
 *   { platform: 'IOS', version: '6.7.0' },
 *   { platform: 'ANDROID', version: '7.0.0' }
 * ])
 * // Returns: "7.0.0_android_6.7.0_ios_8.0.0_web"
 */
export const generatePlatformVersionString = (
  platformMappings: PlatformVersionMapping[] | null | undefined
): string => {
  const hasNoMappings = !platformMappings || platformMappings.length === 0;
  if (hasNoMappings) {
    return 'unknown';
  }
  
  // Sort alphabetically by platform (ANDROID before IOS before WEB)
  const sorted = [...platformMappings].sort((a, b) => 
    a.platform.localeCompare(b.platform)
  );
  
  // Format: "{version}_{platform}" joined by "_"
  return sorted
    .map(m => `${m.version}_${m.platform.toLowerCase()}`)
    .join('_');
};


