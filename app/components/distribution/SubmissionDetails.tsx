/**
 * SubmissionDetails - Displays submission version and metadata
 */

import { Badge, Group, Stack, Text } from '@mantine/core';
import type { Build, Submission } from '~/types/distribution.types';

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
          {submission.versionName} ({submission.versionCode})
        </Text>
      </Group>
      
      {submission.track && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">Track:</Text>
          <Badge size="xs" variant="light">{submission.track}</Badge>
        </Group>
      )}

      <Group gap="xs">
        <Text size="sm" c="dimmed">Exposure:</Text>
        <Text size="sm" fw={500}>{submission.exposurePercent}%</Text>
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

