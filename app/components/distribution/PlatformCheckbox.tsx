/**
 * PlatformCheckbox - Checkbox for selecting Android/iOS platforms
 */

import { Checkbox, Group, Text } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple } from '@tabler/icons-react';
import { Platform } from '~/types/distribution.types';

type PlatformCheckboxProps = {
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
  
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      label={
        <Group gap="xs">
          {isAndroid ? <IconBrandAndroid size={16} /> : <IconBrandApple size={16} />}
          <Text size="sm">{isAndroid ? 'Google Play Store' : 'Apple App Store'}</Text>
        </Group>
      }
    />
  );
}

