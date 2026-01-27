/**
 * App Platform Target type definitions
 * Separated for type safety and reusability
 */

export enum Platform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
}

export enum Target {
  PLAY_STORE = 'PLAY_STORE',
  APP_STORE = 'APP_STORE',
  WEB = 'WEB',
  DOTA = 'DOTA',
}

export interface AppPlatformTargetAttributes {
  id: string;
  appId: string;
  platform: Platform;
  target: Target;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppPlatformTargetRequest {
  appId: string;
  platform: Platform;
  target: Target;
  isActive?: boolean;
}

export interface UpdateAppPlatformTargetRequest {
  platform?: Platform;
  target?: Target;
  isActive?: boolean;
}

export interface ConfigurePlatformTargetsRequest {
  platformTargets: Array<{
    platform: Platform;
    target: Target;
    isActive?: boolean;
  }>;
}
