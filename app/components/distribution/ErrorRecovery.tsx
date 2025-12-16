/**
 * Error Recovery Components
 * 
 * Provides user-friendly error displays with recovery actions
 */

import { Alert, Button, Code, Group, List, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import {
    IconAlertCircle,
    IconAlertTriangle,
    IconBug,
    IconClockExclamation,
    IconInfoCircle,
    IconLock,
    IconNetwork,
    IconRefresh,
} from '@tabler/icons-react';
import {
  DS_COLORS,
  DS_SPACING,
  DS_TYPOGRAPHY,
} from '~/constants/distribution-design.constants';
import type { AppError, ErrorCategory } from '~/utils/error-handling';

// ============================================================================
// ERROR ICON MAPPING
// ============================================================================

const ERROR_ICONS: Record<ErrorCategory, typeof IconAlertCircle> = {
  NETWORK: IconNetwork,
  VALIDATION: IconAlertCircle,
  AUTHORIZATION: IconLock,
  NOT_FOUND: IconAlertCircle,
  CONFLICT: IconAlertTriangle,
  RATE_LIMIT: IconClockExclamation,
  SERVER: IconBug,
  TIMEOUT: IconClockExclamation,
  UNKNOWN: IconAlertCircle,
};

const ERROR_COLORS: Record<ErrorCategory, string> = {
  NETWORK: DS_COLORS.STATUS.WARNING,
  VALIDATION: DS_COLORS.STATUS.ERROR,
  AUTHORIZATION: DS_COLORS.STATUS.ERROR,
  NOT_FOUND: DS_COLORS.STATUS.WARNING,
  CONFLICT: DS_COLORS.STATUS.WARNING,
  RATE_LIMIT: DS_COLORS.STATUS.WARNING,
  SERVER: DS_COLORS.STATUS.ERROR,
  TIMEOUT: DS_COLORS.STATUS.WARNING,
  UNKNOWN: DS_COLORS.STATUS.MUTED,
};

// ============================================================================
// ERROR ALERT COMPONENT
// ============================================================================

export interface ErrorAlertProps {
  error: AppError | Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ErrorAlert({ 
  error, 
  onRetry, 
  onDismiss,
  showDetails = false,
  size = 'md',
}: ErrorAlertProps) {
  if (!error) return null;
  
  // Parse error
  const appError: AppError | null = typeof error === 'string'
    ? {
        category: 'UNKNOWN' as ErrorCategory,
        code: 'UNKNOWN',
        message: error,
        userMessage: error,
        retryable: false,
      }
    : error instanceof Error
    ? {
        category: 'UNKNOWN' as ErrorCategory,
        code: 'UNKNOWN',
        message: error.message,
        userMessage: 'An unexpected error occurred.',
        retryable: false,
      }
    : error;
  
  if (!appError) return null;
  
  const Icon = ERROR_ICONS[appError.category] || IconAlertCircle;
  const color = ERROR_COLORS[appError.category] || 'red';
  
  return (
    <Alert
      color={color}
      variant="light"
      icon={<Icon size={20} />}
      title={appError.userMessage}
      withCloseButton={!!onDismiss}
      onClose={onDismiss}
    >
      <Stack gap={DS_SPACING.SM}>
        {/* Error message */}
        {appError.message !== appError.userMessage && (
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
            {appError.message}
          </Text>
        )}
        
        {/* Recovery guidance */}
        {appError.recoveryGuidance && (
          <Alert color={color} variant="outline" icon={<IconInfoCircle size={16} />}>
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>{appError.recoveryGuidance}</Text>
          </Alert>
        )}
        
        {/* Actions */}
        {(onRetry || onDismiss) && (
          <Group gap={DS_SPACING.SM}>
            {onRetry && appError.retryable && (
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={onRetry}
                variant="light"
                size={size}
              >
                Try Again
              </Button>
            )}
          </Group>
        )}
        
        {/* Error details (expandable) */}
        {showDetails && appError.details && (
          <Paper p={DS_SPACING.XS} bg="gray.1" withBorder>
            <Text size={DS_TYPOGRAPHY.SIZE.XS} fw={DS_TYPOGRAPHY.WEIGHT.MEDIUM} mb={DS_SPACING.XS}>Error Details:</Text>
            <Code block>{JSON.stringify(appError.details, null, 2)}</Code>
          </Paper>
        )}
      </Stack>
    </Alert>
  );
}

// ============================================================================
// ERROR STATE COMPONENT (Full Page)
// ============================================================================

export interface ErrorStateProps {
  error: AppError | Error | string;
  onRetry?: () => void;
  title?: string;
  illustration?: React.ReactNode;
}

export function ErrorState({ error, onRetry, title, illustration }: ErrorStateProps) {
  const appError: AppError = typeof error === 'string'
    ? {
        category: 'UNKNOWN' as ErrorCategory,
        code: 'UNKNOWN',
        message: error,
        userMessage: error,
        retryable: true,
      }
    : error instanceof Error
    ? {
        category: 'UNKNOWN' as ErrorCategory,
        code: 'UNKNOWN',
        message: error.message,
        userMessage: 'An unexpected error occurred.',
        retryable: true,
      }
    : error;
  
  const Icon = ERROR_ICONS[appError.category] || IconAlertCircle;
  const color = ERROR_COLORS[appError.category] || 'red';
  
  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Stack align="center" justify="center" gap={DS_SPACING.LG} py="xl">
        {illustration || (
          <ThemeIcon size={80} color={color} variant="light" radius="xl">
            <Icon size={48} />
          </ThemeIcon>
        )}
        
        <Stack gap={DS_SPACING.XS} align="center" maw={600}>
          <Text size={DS_TYPOGRAPHY.SIZE.XL} fw={DS_TYPOGRAPHY.WEIGHT.SEMIBOLD} ta="center">
            {title || appError.userMessage}
          </Text>
          
          {appError.message !== appError.userMessage && (
            <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED} ta="center">
              {appError.message}
            </Text>
          )}
        </Stack>
        
        {appError.recoveryGuidance && (
          <Alert
            color={color}
            variant="light"
            icon={<IconInfoCircle size={20} />}
            maw={500}
          >
            <Text size={DS_TYPOGRAPHY.SIZE.SM}>{appError.recoveryGuidance}</Text>
          </Alert>
        )}
        
        {onRetry && appError.retryable && (
          <Button
            leftSection={<IconRefresh size={18} />}
            onClick={onRetry}
            size={DS_TYPOGRAPHY.SIZE.MD}
          >
            Try Again
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

// ============================================================================
// STALE DATA WARNING
// ============================================================================

export interface StaleDataWarningProps {
  loadedAt: Date;
  onRefresh: () => void;
  threshold?: number; // minutes
}

export function StaleDataWarning({ loadedAt, onRefresh, threshold = 5 }: StaleDataWarningProps) {
  const ageMinutes = Math.floor((Date.now() - loadedAt.getTime()) / 60000);
  
  if (ageMinutes < threshold) return null;
  
  return (
    <Alert
      color={DS_COLORS.STATUS.WARNING}
      variant="light"
      icon={<IconClockExclamation size={20} />}
      title="Data may be outdated"
    >
      <Group justify="space-between" align="center">
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>
          This data was loaded {ageMinutes} minute{ageMinutes !== 1 ? 's' : ''} ago. 
          Refresh to get the latest information.
        </Text>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={onRefresh}
          variant="light"
          size={DS_TYPOGRAPHY.SIZE.SM}
        >
          Refresh Now
        </Button>
      </Group>
    </Alert>
  );
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export interface ConflictResolutionProps {
  message: string;
  onRefresh: () => void;
  onCancel?: () => void;
}

export function ConflictResolution({ message, onRefresh, onCancel }: ConflictResolutionProps) {
  return (
    <Alert
      color={DS_COLORS.STATUS.WARNING}
      variant="light"
      icon={<IconAlertTriangle size={20} />}
      title="Data Conflict Detected"
    >
      <Stack gap={DS_SPACING.MD}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>{message}</Text>
        
        <Alert color={DS_COLORS.ACTION.PRIMARY} variant="outline" icon={<IconInfoCircle size={16} />}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>
            Someone else has updated this resource while you were editing. 
            You need to refresh to get the latest version before making changes.
          </Text>
        </Alert>
        
        <Group gap={DS_SPACING.SM}>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={onRefresh}
            variant="filled"
          >
            Refresh and Retry
          </Button>
          {onCancel && (
            <Button onClick={onCancel} variant="subtle">
              Cancel
            </Button>
          )}
        </Group>
      </Stack>
    </Alert>
  );
}

// ============================================================================
// NETWORK ERROR WITH RETRY
// ============================================================================

export interface NetworkErrorProps {
  onRetry: () => void;
  retrying?: boolean;
  attemptCount?: number;
  maxAttempts?: number;
}

export function NetworkError({ 
  onRetry, 
  retrying = false, 
  attemptCount = 0,
  maxAttempts = 3,
}: NetworkErrorProps) {
  return (
    <Alert
      color={DS_COLORS.STATUS.WARNING}
      variant="light"
      icon={<IconNetwork size={20} />}
      title="Connection Problem"
    >
      <Stack gap={DS_SPACING.MD}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>
          Unable to connect to the server. This could be due to:
        </Text>
        
        <List size={DS_TYPOGRAPHY.SIZE.SM} spacing="xs">
          <List.Item>Your internet connection</List.Item>
          <List.Item>The server is temporarily unavailable</List.Item>
          <List.Item>Network firewall or proxy settings</List.Item>
        </List>
        
        {attemptCount > 0 && (
          <Text size={DS_TYPOGRAPHY.SIZE.SM} c={DS_COLORS.TEXT.MUTED}>
            Retry attempt {attemptCount} of {maxAttempts}
          </Text>
        )}
        
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={onRetry}
          loading={retrying}
          variant="filled"
        >
          {retrying ? 'Retrying...' : 'Retry Connection'}
        </Button>
      </Stack>
    </Alert>
  );
}

// ============================================================================
// TIMEOUT ERROR
// ============================================================================

export interface TimeoutErrorProps {
  onRetry: () => void;
  timeout?: number; // seconds
}

export function TimeoutError({ onRetry, timeout = 30 }: TimeoutErrorProps) {
  return (
    <Alert
      color={DS_COLORS.STATUS.WARNING}
      variant="light"
      icon={<IconClockExclamation size={20} />}
      title="Request Timed Out"
    >
      <Stack gap={DS_SPACING.MD}>
        <Text size={DS_TYPOGRAPHY.SIZE.SM}>
          The request took longer than {timeout} seconds to complete.
        </Text>
        
        <Alert color={DS_COLORS.ACTION.PRIMARY} variant="outline" icon={<IconInfoCircle size={16} />}>
          <Text size={DS_TYPOGRAPHY.SIZE.SM}>
            This can happen when:
          </Text>
          <List size={DS_TYPOGRAPHY.SIZE.SM} spacing="xs" mt={DS_SPACING.XS}>
            <List.Item>The server is under heavy load</List.Item>
            <List.Item>You have a slow internet connection</List.Item>
            <List.Item>The operation is taking longer than expected</List.Item>
          </List>
        </Alert>
        
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={onRetry}
          variant="filled"
        >
          Try Again
        </Button>
      </Stack>
    </Alert>
  );
}

