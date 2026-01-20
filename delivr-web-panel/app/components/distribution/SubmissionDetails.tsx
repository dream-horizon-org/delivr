/**
 * SubmissionDetails - Displays submission version and metadata
 */

import { Group, Stack, Text } from '@mantine/core';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution/distribution-design.constants';
import { Platform, type Submission } from '~/types/distribution/distribution.types';

export type SubmissionDetailsProps = {
  submission: Submission;
};

export function SubmissionDetails({ 
  submission 
}: SubmissionDetailsProps) {
  const isIOS = submission.platform === Platform.IOS;
  const isAndroid = submission.platform === Platform.ANDROID;
  const testflightNumber = isIOS && 'artifact' in submission && submission.artifact && 'testflightNumber' in submission.artifact 
    ? submission.artifact.testflightNumber 
    : null;

  return (
    <Stack gap={DS_SPACING.XS}>
      <Group gap={DS_SPACING.XS}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>Version:</Text>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
          {submission.version}
          {isAndroid && 'versionCode' in submission && ` (${submission.versionCode})`}
        </Text>
      </Group>
      
      {/* iOS-specific: TestFlight Build Number */}
      {isIOS && testflightNumber && (
        <Group gap={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>TestFlight Build:</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>{testflightNumber}</Text>
        </Group>
      )}

      <Group gap={DS_SPACING.XS}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>Exposure:</Text>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>{submission.rolloutPercentage}%</Text>
      </Group>

      {submission.submittedAt && (
        <Group gap={DS_SPACING.XS}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>Submitted:</Text>
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>{new Date(submission.submittedAt).toLocaleDateString()}</Text>
        </Group>
      )}
    </Stack>
  );
}

