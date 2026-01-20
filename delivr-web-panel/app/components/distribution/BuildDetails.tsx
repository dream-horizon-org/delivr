/**
 * BuildDetails - Displays build version and metadata
 */

import { Anchor, Group, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { DISTRIBUTION_UI_LABELS } from '~/constants/distribution/distribution.constants';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import type { Build } from '~/types/distribution/distribution.types';
import { BuildStrategy } from '~/types/distribution/distribution.types';
import { CIJobStatus } from './CIJobStatus';

export type BuildDetailsProps = {
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
    <Stack gap={DS_SPACING.XS}>
      <Group gap={DS_SPACING.XS}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>{DISTRIBUTION_UI_LABELS.VERSION_LABEL}</Text>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>{build.versionName}</Text>
        <Text size={DS_TYPOGRAPHY.SIZE.XS} c={DS_COLORS.TEXT.MUTED}>({build.versionCode})</Text>
      </Group>
      
      {showCIRunType && (
        <Group gap={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>{DISTRIBUTION_UI_LABELS.BUILT_VIA_LABEL}</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>{build.ciRunType}</Text>
        </Group>
      )}
      
      {showCIJobStatus && <CIJobStatus build={build} />}

      {showInternalTestingLink && (
        <Anchor
          href={build.internalTrackLink!}
          target="_blank"
          rel="noopener noreferrer"
          size={DS_TYPOGRAPHY.SIZE.SM}
        >
          <Group gap={DS_SPACING.XXS}>
            <IconExternalLink size={14} />
            {DISTRIBUTION_UI_LABELS.INTERNAL_TESTING_LINK}
          </Group>
        </Anchor>
      )}

      {showTestFlightNumber && (
        <Group gap={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>{DISTRIBUTION_UI_LABELS.TESTFLIGHT_LABEL}</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>Build #{build.testflightNumber}</Text>
        </Group>
      )}
    </Stack>
  );
}

