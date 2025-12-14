/**
 * PlatformCheckbox - Checkbox for selecting Android/iOS platforms
 */

import { Checkbox, Group, Text } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple } from '@tabler/icons-react';
import { FORM_ICON_SIZES } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

type PlatformCheckboxProps = {
  platform: Platform;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
};

const STORE_NAMES = {
  [Platform.ANDROID]: 'Google Play Store',
  [Platform.IOS]: 'Apple App Store',
} as const;

export function PlatformCheckbox({ 
  platform, 
  checked, 
  disabled,
  onChange 
}: PlatformCheckboxProps) {
  const isAndroid = platform === Platform.ANDROID;
  const storeName = STORE_NAMES[platform];
  
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      label={
        <Group gap="xs">
          {isAndroid ? (
            <IconBrandAndroid size={FORM_ICON_SIZES.BUTTON} />
          ) : (
            <IconBrandApple size={FORM_ICON_SIZES.BUTTON} />
          )}
          <Text size="sm">{storeName}</Text>
        </Group>
      }
    />
  );
}

