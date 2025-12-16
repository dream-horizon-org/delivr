/**
 * SubmissionDetails - Displays submission version and metadata
 */

import { Group, Stack, Text } from '@mantine/core';
import { Platform, type Submission } from '~/types/distribution.types';

type SubmissionDetailsProps = {
  submission: Submission;
};

export function SubmissionDetails({ 
  submission 
}: SubmissionDetailsProps) {
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm" c="dimmed">Version:</Text>
        <Text size="sm" fw={500}>
          {submission.version}
          {submission.platform === Platform.ANDROID && 'versionCode' in submission && ` (${submission.versionCode})`}
        </Text>
      </Group>
      
      {/* track field is not in API spec */}

      <Group gap="xs">
        <Text size="sm" c="dimmed">Exposure:</Text>
        <Text size="sm" fw={500}>{submission.rolloutPercentage}%</Text>
      </Group>

      {submission.submittedAt && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">Submitted:</Text>
          <Text size="sm">{new Date(submission.submittedAt).toLocaleDateString()}</Text>
        </Group>
      )}
    </Stack>
  );
}

