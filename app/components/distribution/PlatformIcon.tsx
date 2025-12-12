/**
 * PlatformIcon - Displays Android or iOS platform icon
 */

import { ThemeIcon } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple } from '@tabler/icons-react';
import { Platform } from '~/types/distribution.types';

type PlatformIconProps = {
  platform: Platform;
};

export function PlatformIcon({ platform }: PlatformIconProps) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <ThemeIcon 
      size="lg" 
      radius="md" 
      variant="light" 
      color={isAndroid ? 'green' : 'blue'}
    >
      {isAndroid ? <IconBrandAndroid size={20} /> : <IconBrandApple size={20} />}
    </ThemeIcon>
  );
}

