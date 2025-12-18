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
  return (
    <Stack gap={DS_SPACING.XS}>
      <Group gap={DS_SPACING.XS}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>Version:</Text>
        <Text size={DS_TYPOGRAPHY.SIZE.SM} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM}>
          {submission.version}
          {submission.platform === Platform.ANDROID && 'versionCode' in submission && ` (${submission.versionCode})`}
        </Text>
      </Group>
      
      {/* track field is not in API spec */}

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

