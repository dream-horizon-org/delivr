/**
 * Offline Banner Component
 * Displays a banner when user is offline and data is served from cache
 */

import { Box, Group, Text } from '@mantine/core';
import { IconWifiOff } from '@tabler/icons-react';

interface OfflineBannerProps {
  /** Whether to show the banner */
  show: boolean;
}

export function OfflineBanner({ show }: OfflineBannerProps) {
  if (!show) {
    return null;
  }

  return (
    <Box
      bg="gray.2"
      py={8}
      px={24}
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        flexShrink: 0,
      }}
    >
      <Group gap="sm" justify="center" align="center">
        <IconWifiOff size={18} color="var(--mantine-color-gray-7)" />
        <Text size="sm" c="gray.7" fw={500}>
          You're in offline mode.
        </Text>
      </Group>
    </Box>
  );
}

