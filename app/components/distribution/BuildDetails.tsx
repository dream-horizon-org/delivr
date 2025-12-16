/**
 * BuildDetails - Displays build version and metadata
 */

import { Anchor, Group, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { DISTRIBUTION_UI_LABELS } from '~/constants/distribution.constants';
import type { Build } from '~/types/distribution.types';
import { BuildStrategy } from '~/types/distribution.types';
import { CIJobStatus } from './CIJobStatus';

type BuildDetailsProps = {
  build: Build;
  isAndroid: boolean;
};

export function BuildDetails({ build, isAndroid }: BuildDetailsProps) {
  const isCICD = build.buildStrategy === BuildStrategy.CICD;
  const showCIRunType = isCICD && !!build.ciRunType;
  const showCIJobStatus = isCICD;
  const showInternalTestingLink = isAndroid && !!build.internalTrackLink;
  const showTestFlightNumber = !isAndroid && !!build.testflightNumber;
  
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm" c="dimmed">{DISTRIBUTION_UI_LABELS.VERSION_LABEL}</Text>
        <Text size="sm" fw={500}>{build.versionName}</Text>
        <Text size="xs" c="dimmed">({build.versionCode})</Text>
      </Group>
      
      {showCIRunType && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">{DISTRIBUTION_UI_LABELS.BUILT_VIA_LABEL}</Text>
          <Text size="sm">{build.ciRunType}</Text>
        </Group>
      )}
      
      {showCIJobStatus && <CIJobStatus build={build} />}

      {showInternalTestingLink && (
        <Anchor
          href={build.internalTrackLink!}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          <Group gap={4}>
            <IconExternalLink size={14} />
            {DISTRIBUTION_UI_LABELS.INTERNAL_TESTING_LINK}
          </Group>
        </Anchor>
      )}

      {showTestFlightNumber && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">{DISTRIBUTION_UI_LABELS.TESTFLIGHT_LABEL}</Text>
          <Text size="sm">Build #{build.testflightNumber}</Text>
        </Group>
      )}
    </Stack>
  );
}

