/**
 * Platform Icon Component
 * Returns the appropriate icon component for the given platform
 */

import { IconBrandAndroid, IconBrandApple, IconDeviceMobile } from '@tabler/icons-react';
import { PLATFORMS } from '~/types/release-config-constants';

interface PlatformIconProps {
  platform: string;
  size?: number;
}

export function PlatformIcon({ platform, size = 16 }: PlatformIconProps) {
  switch (platform.toUpperCase()) {
    case PLATFORMS.ANDROID:
      return <IconBrandAndroid size={size} />;
    case PLATFORMS.IOS:
      return <IconBrandApple size={size} />;
    default:
      return <IconDeviceMobile size={size} />;
  }
}

