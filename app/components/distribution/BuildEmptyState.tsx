/**
 * BuildEmptyState - Shown when no build exists yet
 */

import { Badge, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';
import { BUTTON_LABELS, DISTRIBUTION_UI_LABELS, PLATFORM_LABELS } from '~/constants/distribution.constants';
import { Platform } from '~/types/distribution.types';

type BuildEmptyStateProps = {
  platform: Platform;
  isManualMode: boolean;
  onUpload?: () => void;
  onVerify?: () => void;
};

export function BuildEmptyState({ 
  platform, 
  isManualMode, 
  onUpload, 
  onVerify,
}: BuildEmptyStateProps) {
  const isAndroid = platform === Platform.ANDROID;
  
  return (
    <Stack gap="md" align="center" py="md">
      <Text c="dimmed" size="sm" ta="center">
        {isManualMode 
          ? DISTRIBUTION_UI_LABELS.NO_BUILD_UPLOADED(PLATFORM_LABELS[platform])
          : DISTRIBUTION_UI_LABELS.WAITING_FOR_CICD(PLATFORM_LABELS[platform])
        }
      </Text>
      
      {isManualMode ? (
        <Button
          variant="light"
          leftSection={<IconUpload size={16} />}
          onClick={isAndroid ? onUpload : onVerify}
        >
          {isAndroid ? BUTTON_LABELS.UPLOAD : BUTTON_LABELS.VERIFY}
        </Button>
      ) : (
        // CICD mode: Builds are auto-triggered by Release Orchestrator
        // Frontend just tracks status - no trigger button needed
        <Badge color="blue" variant="light" size="lg">
          <Group gap={6}>
            <Loader size={12} />
            <Text size="sm">{DISTRIBUTION_UI_LABELS.CI_BUILD_AUTO_START}</Text>
          </Group>
        </Badge>
      )}
    </Stack>
  );
}

