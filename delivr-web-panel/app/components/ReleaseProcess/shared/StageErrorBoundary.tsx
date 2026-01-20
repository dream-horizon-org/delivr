/**
 * StageErrorBoundary Component
 * Handles loading, error, and no-data states for stage components
 */

import { Alert, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { ERROR_MESSAGES } from '~/constants/release-process-ui';
import { getApiErrorMessage } from '~/utils/api-client';

interface StageErrorBoundaryProps {
  isLoading: boolean;
  error: unknown;
  data: unknown;
  stageName: string;
  children: ReactNode;
}

export function StageErrorBoundary({
  isLoading,
  error,
  data,
  stageName,
  children,
}: StageErrorBoundaryProps) {
  if (isLoading) {
    return (
      <Stack gap="md">
        <Text c="dimmed">Loading {stageName}...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert color="red" icon={<IconInfoCircle size={16} />} title="Error">
        {getApiErrorMessage(error, ERROR_MESSAGES.FAILED_TO_LOAD_STAGE)}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert color="yellow" icon={<IconInfoCircle size={16} />} title="No Data">
        No {stageName} data available
      </Alert>
    );
  }

  return <>{children}</>;
}

