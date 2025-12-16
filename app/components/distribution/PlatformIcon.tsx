/**
 * PlatformIcon - Displays Android or iOS platform icon
 */

import { ThemeIcon } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple } from '@tabler/icons-react';
import {
  DS_COLORS,
  DIST_ICON_PROPS,
  DIST_ICON_SIZES,
} from '~/constants/distribution/distribution-design.constants';
import { Platform } from '~/types/distribution/distribution.types';

export type PlatformIconProps = {
  platform: Platform;
};

export function PlatformIcon({ platform }: PlatformIconProps) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <ThemeIcon 
      {...DIST_ICON_PROPS.LARGE}
      color={isAndroid ? DS_COLORS.PLATFORM.ANDROID : DS_COLORS.PLATFORM.IOS}
    >
      {isAndroid ? <IconBrandAndroid size={DIST_ICON_SIZES.XL} /> : <IconBrandApple size={DIST_ICON_SIZES.XL} />}
    </ThemeIcon>
  );
}

