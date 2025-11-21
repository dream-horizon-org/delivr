/**
 * Project Management Platform Types
 * Defines valid platforms for project management integrations
 */

export enum Platform {
  WEB = 'WEB',
  IOS = 'IOS',
  ANDROID = 'ANDROID'
}

export const PLATFORMS = Object.values(Platform) as Platform[];

export const PLATFORM_DISPLAY_NAMES: Record<Platform, string> = {
  [Platform.WEB]: 'Web',
  [Platform.IOS]: 'iOS',
  [Platform.ANDROID]: 'Android'
};

