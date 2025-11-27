/**
 * Release Not Found Component
 * Displays error state when a release is not found or cannot be loaded
 */

import { memo } from 'react';
import { Link } from '@remix-run/react';
import { Container, Title, Text, Paper, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';

interface ReleaseNotFoundProps {
  org: string;
  error?: Error | null;
  message?: string;
}

export const ReleaseNotFound = memo(function ReleaseNotFound({
  org,
  error,
  message,
}: ReleaseNotFoundProps) {
  const defaultMessage = 'The release you\'re looking for doesn\'t exist or has been deleted.';
  const displayMessage = error?.message || message || defaultMessage;

  return (
    <Container size="xl" className="py-8">
      <Paper p="xl" withBorder className="text-center">
        <Title order={2} className="mb-2">Release not found</Title>
        <Text c="dimmed" mb="md">
          {displayMessage}
        </Text>
        <Link to={`/dashboard/${org}/releases`}>
          <Button leftSection={<IconArrowLeft size={16} />} variant="light">
            Back to Releases
          </Button>
        </Link>
      </Paper>
    </Container>
  );
});

