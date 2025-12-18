/**
 * Release Not Found Component
 * Displays error state when a release is not found or cannot be loaded
 */

import { memo } from 'react';
import { Link } from '@remix-run/react';
import { Container, Title, Text, Paper, Button, Group, Stack } from '@mantine/core';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';

interface ReleaseNotFoundProps {
  org: string;
  error?: Error | null;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ReleaseNotFound = memo(function ReleaseNotFound({
  org,
  error,
  message,
  onRetry,
  isRetrying = false,
}: ReleaseNotFoundProps) {
  const defaultMessage = error 
    ? 'Failed to load release. Please try again.' 
    : 'The release you\'re looking for doesn\'t exist or has been deleted.';
  const displayMessage = error?.message || message || defaultMessage;

  return (
    <Container size="xl" className="py-8">
      <Paper p="xl" withBorder className="text-center">
        <Stack gap="md" align="center">
          <Title order={2}>Failed to load release</Title>
          <Text c="dimmed" maw={500}>
            {displayMessage}
          </Text>
          <Group gap="md" justify="center">
            {onRetry && (
              <Button 
                leftSection={<IconRefresh size={16} />} 
                onClick={onRetry}
                loading={isRetrying}
                color="brand"
              >
                Try Again
              </Button>
            )}
            <Link to={`/dashboard/${org}/releases`}>
              <Button leftSection={<IconArrowLeft size={16} />} variant="light">
                Back to Releases
              </Button>
            </Link>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
});

