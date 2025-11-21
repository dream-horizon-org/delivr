import { Platform, PLATFORMS } from './platform.interface';

/**
 * Type guard to check if a value is a valid Platform
 */
export const isValidPlatform = (value: unknown): value is Platform => {
  const isString = typeof value === 'string';
  if (!isString) {
    return false;
  }
  return PLATFORMS.includes(value as Platform);
};

/**
 * Get display name for a platform
 */
export const getPlatformDisplayName = (platform: Platform): string => {
  const displayNames: Record<Platform, string> = {
    [Platform.WEB]: 'Web',
    [Platform.IOS]: 'iOS',
    [Platform.ANDROID]: 'Android'
  };
  return displayNames[platform];
};

/**
 * Validate array of platforms
 */
export const validatePlatforms = (platforms: unknown[]): boolean => {
  return platforms.every(isValidPlatform);
};

