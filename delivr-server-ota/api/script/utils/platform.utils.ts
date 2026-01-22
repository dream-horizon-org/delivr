import { PlatformName, TargetName } from '~models/release/release.interface';


export const getPlatformDisplayName = (platform: PlatformName): string => {
  switch (platform) {
    case PlatformName.IOS:
      return 'iOS';
    case PlatformName.ANDROID:
      return 'Android';
    case PlatformName.WEB:
      return 'Web';
    default:
      return platform;
  }
};

export const getTargetDisplayName = (target: TargetName): string => {
  switch (target) {
    case TargetName.APP_STORE:
      return 'App Store';
    case TargetName.PLAY_STORE:
      return 'Play Store';
    case TargetName.WEB:
      return 'Web';
    default:
      return target;
  }
};

/**
 * Get store console name for notifications (e.g., "Google Play Console", "App Store Connect")
 */
export const getStoreConsoleName = (target: TargetName): string => {
  switch (target) {
    case TargetName.PLAY_STORE:
      return 'Google Play Console';
    case TargetName.APP_STORE:
      return 'App Store Connect';
    default:
      return getTargetDisplayName(target);
  }
};