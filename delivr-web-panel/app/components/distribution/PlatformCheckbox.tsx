/**
 * PlatformCheckbox - Checkbox for selecting Android/iOS platforms
 */

import { Checkbox, Group, Text } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple } from '@tabler/icons-react';
import { FORM_ICON_SIZES, STORE_DISPLAY_NAMES } from '~/constants/distribution/distribution.constants';
import {
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { Platform } from '~/types/distribution/distribution.types';

export type PlatformCheckboxProps = {
  platform: Platform;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
};

export function PlatformCheckbox({ 
  platform, 
  checked, 
  disabled,
  onChange 
}: PlatformCheckboxProps) {
  const isAndroid = platform === Platform.ANDROID;
  const storeName = STORE_DISPLAY_NAMES[platform];
  
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      label={
        <Group gap={DS_SPACING.XS}>
          {isAndroid ? (
            <IconBrandAndroid size={FORM_ICON_SIZES.BUTTON} />
          ) : (
            <IconBrandApple size={FORM_ICON_SIZES.BUTTON} />
          )}
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>{storeName}</Text>
        </Group>
      }
    />
  );
}

