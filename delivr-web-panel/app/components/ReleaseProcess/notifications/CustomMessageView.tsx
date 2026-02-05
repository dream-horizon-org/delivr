import { Stack, Textarea, Text, Group, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { AD_HOC_NOTIFICATION_LABELS } from '~/constants/release-process-ui';

interface CustomMessageViewProps {
  message: string;
  onChange: (message: string) => void;
  error?: string;
}

export function CustomMessageView({ message, onChange, error }: CustomMessageViewProps) {
  const charLimit = AD_HOC_NOTIFICATION_LABELS.CHARACTER_LIMIT;
  const charCount = message.length;
  const isOverLimit = charCount > charLimit;

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={600} mb="xs">
          {AD_HOC_NOTIFICATION_LABELS.CUSTOM_MESSAGE_LABEL}
        </Text>
        <Text size="xs" c="dimmed" mb="sm">
          {AD_HOC_NOTIFICATION_LABELS.CUSTOM_MESSAGE_DESCRIPTION}
        </Text>
      </div>

      <Textarea
        placeholder={AD_HOC_NOTIFICATION_LABELS.CUSTOM_MESSAGE_PLACEHOLDER}
        value={message}
        onChange={(e) => onChange(e.currentTarget.value)}
        minRows={6}
        maxRows={10}
        autosize
        error={error || (isOverLimit && AD_HOC_NOTIFICATION_LABELS.ERROR_MESSAGE_TOO_LONG)}
        styles={{ input: { fontFamily: 'monospace', fontSize: '14px' } }}
      />

      <Group justify="space-between" align="center">
        <Text size="xs" c={isOverLimit ? 'red' : 'dimmed'}>
          {AD_HOC_NOTIFICATION_LABELS.CHARACTER_COUNTER(charCount, charLimit)}
        </Text>
        <Text size="xs" c="dimmed">Supports basic Slack markdown</Text>
      </Group>

      {isOverLimit && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          <Text size="xs">Please shorten your message to {charLimit} characters or less.</Text>
        </Alert>
      )}
    </Stack>
  );
}
