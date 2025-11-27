/**
 * Page Error Component
 * Common error state component used across the app
 */

import { memo } from 'react';
import { Container, Paper, Text, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface PageErrorProps {
  message?: string;
  error?: Error | null;
  title?: string;
  variant?: 'paper' | 'alert';
}

export const PageError = memo(function PageError({
  message,
  error,
  title = 'Error',
  variant = 'alert',
}: PageErrorProps) {
  const displayMessage = error?.message || message || 'An error occurred';

  if (variant === 'paper') {
    return (
      <Container size="xl" className="py-8">
        <Paper p="xl" withBorder className="text-center">
          <Text c="red" size="lg" fw={600} className="mb-2">
            {title}
          </Text>
          <Text c="dimmed" size="sm">
            {displayMessage}
          </Text>
        </Paper>
      </Container>
    );
  }

  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title={title}
      color="red"
      variant="light"
      mb="md"
    >
      <Text size="sm">{displayMessage}</Text>
    </Alert>
  );
});

