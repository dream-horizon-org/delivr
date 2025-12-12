/**
 * PreKickoffStage Component
 * Displayed when release is created but kickoff hasn't started yet
 */

import { Alert, Card, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { PRE_KICKOFF_LABELS } from '~/constants/release-process-ui';

interface PreKickoffStageProps {
  className?: string;
}

export function PreKickoffStage({ className }: PreKickoffStageProps) {
  return (
    <Card shadow="sm" padding="xl" radius="md" withBorder className={className}>
      <Stack gap="md" align="center">
        <ThemeIcon size={64} radius="md" variant="light" color="blue">
          <IconClock size={32} />
        </ThemeIcon>
        
        <Stack gap="xs" align="center">
          <Text fw={600} size="xl">
            {PRE_KICKOFF_LABELS.TITLE}
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={500}>
            {PRE_KICKOFF_LABELS.DESCRIPTION}
          </Text>
        </Stack>

        <Alert color="blue" variant="light" icon={<IconClock size={16} />}>
          {PRE_KICKOFF_LABELS.WAITING}
        </Alert>
      </Stack>
    </Card>
  );
}

