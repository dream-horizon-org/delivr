/**
 * DistributionStage Component
 * 
 * Stage 4 in the release process - LIMITED distribution view
 * 
 * Philosophy:
 * - PENDING: Show "Submit" button per platform (one-time action)
 * - SUBMITTED+: Show status in tabs (read-only, NO promote/pause/update actions)
 * - Always: Link to Distribution Management for advanced actions
 * 
 * Uses same tab UI as Distribution Management for consistency
 * Limited to submit-only; all management happens in Distribution Management
 */

import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core';
import { Link } from '@remix-run/react';
import {
  IconAlertCircle,
  IconArchive,
  IconBrandAndroid,
  IconBrandApple,
  IconExternalLink,
  IconRefresh,
  IconRocket
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { LatestSubmissionCard } from '~/components/Distribution/LatestSubmissionCard';
import { PromoteAndroidSubmissionDialog } from '~/components/Distribution/PromoteAndroidSubmissionDialog';
import { PromoteIOSSubmissionDialog } from '~/components/Distribution/PromoteIOSSubmissionDialog';
import {
  DISTRIBUTION_STATUS_COLORS,
  SUBMISSION_STATUS_COLORS
} from '~/constants/distribution/distribution.constants';
import { useDistributionStage } from '~/hooks/useDistributionStage';
import { useRelease } from '~/hooks/useRelease';
import {
  Platform,
  SubmissionStatus
} from '~/types/distribution/distribution.types';
import { ReleaseStatus } from '~/types/release-process-enums';
import { formatStatus } from '~/utils/distribution/distribution-ui.utils';

interface DistributionStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

/**
 * Loading state
 */
function LoadingState() {
  return (
    <Card withBorder p="xl" radius="md">
      <Center py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="sm" c="dimmed">Loading distribution status...</Text>
        </Stack>
      </Center>
    </Card>
  );
}

/**
 * Error state with retry
 */
function ErrorState({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Failed to load distribution"
      color="red"
      variant="light"
    >
      <Stack gap="sm">
        <Text size="sm">{error?.message || 'An error occurred while loading distribution data.'}</Text>
        <Button
          variant="light"
          color="red"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      </Stack>
    </Alert>
  );
}

/**
 * Empty state when no distribution exists yet
 */
function NoDistributionState() {
  return (
    <Card withBorder p="xl" radius="md">
      <Center py="xl">
        <Stack align="center" gap="md">
          <ThemeIcon size={64} radius="xl" variant="light" color="blue">
            <IconRocket size={32} />
          </ThemeIcon>
          <Text fw={600} size="lg">Distribution Not Created</Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            Distribution will be automatically created when pre-release is completed.
          </Text>
        </Stack>
      </Center>
    </Card>
  );
}

/**
 * Main DistributionStage component
 */
export function DistributionStage({
  tenantId,
  releaseId,
  className,
}: DistributionStageProps) {
  console.log('[DistributionStage] Rendering with:', { tenantId, releaseId });
  
  const { distribution, isLoading, error, refetch } = useDistributionStage(tenantId, releaseId);
  const { release } = useRelease(tenantId, releaseId);
  const isArchived = release?.status === ReleaseStatus.ARCHIVED;
  
  console.log('[DistributionStage] Hook state:', { 
    hasDistribution: !!distribution, 
    isLoading, 
    hasError: !!error,
    errorMessage: error?.message 
  });
  
  // Dialog state - platform-specific dialogs (same as Distribution Management)
  const [isPromoteAndroidDialogOpen, setIsPromoteAndroidDialogOpen] = useState(false);
  const [isPromoteIOSDialogOpen, setIsPromoteIOSDialogOpen] = useState(false);

  // Get submissions and platforms (always run, before early returns)
  const submissions = distribution?.submissions || [];
  const configuredPlatforms = distribution?.platforms || [];
  
  // Separate by platform (always run useMemo before early returns - Rules of Hooks!)
  const androidSubmissions = useMemo(
    () => submissions.filter(s => s.platform === Platform.ANDROID && s.isActive),
    [submissions]
  );
  
  const iosSubmissions = useMemo(
    () => submissions.filter(s => s.platform === Platform.IOS && s.isActive),
    [submissions]
  );
  
  const latestAndroidSubmission = androidSubmissions[0] || null;
  const latestIOSSubmission = iosSubmissions[0] || null;
  
  // Check which platforms are configured for this release
  const hasAndroid = configuredPlatforms.includes(Platform.ANDROID);
  const hasIOS = configuredPlatforms.includes(Platform.IOS);

  // Handlers for platform-specific promote dialogs
  const handleOpenPromoteAndroidDialog = useCallback(() => {
    setIsPromoteAndroidDialogOpen(true);
  }, []);

  const handleOpenPromoteIOSDialog = useCallback(() => {
    setIsPromoteIOSDialogOpen(true);
  }, []);

  const handlePromoteComplete = useCallback(() => {
    setIsPromoteAndroidDialogOpen(false);
    setIsPromoteIOSDialogOpen(false);
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // No distribution yet
  if (!distribution) {
    return <NoDistributionState />;
  }
  
  // Check if any are pending
  const hasPendingSubmissions = submissions.some(s => s.status === SubmissionStatus.PENDING);
  
  // Distribution status
  const statusColor = DISTRIBUTION_STATUS_COLORS[distribution.status] || 'gray';

  return (
    <Stack gap="lg" className={className}>
      {/* Archived Message Banner */}
      {isArchived && (
        <Alert
          icon={<IconArchive size={16} />}
          title="This release is archived"
          color="gray"
          variant="light"
        >
          <Text size="sm">
            This release has been archived. You can view the distribution and history, but no actions can be performed.
          </Text>
        </Alert>
      )}

      {/* Header - Same as Distribution Management */}
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Stack gap="lg">
          {/* Title Row */}
          <Group justify="space-between" align="center">
            <Group gap="md" align="center">
              <Title order={2} size="h3">
                Distribution
              </Title>
              <Badge
                size="xl"
                variant="light"
                color={statusColor}
                radius="sm"
                styles={{ root: { textTransform: 'uppercase' } }}
              >
                {formatStatus(distribution.status)}
              </Badge>
            </Group>
            {isLoading && <Loader size="md" />}
          </Group>

          <Divider />

          {/* Platform Status Row - Only show configured platforms */}
          <Group gap="xl" align="flex-start">
            {(hasAndroid || hasIOS) && (
              <>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Platform Status
                  </Text>
                  <Group gap="sm">
                    {/* Android Status - Only if configured */}
                    {hasAndroid && latestAndroidSubmission && (
                      <Badge
                        size="lg"
                        variant="light"
                        color={SUBMISSION_STATUS_COLORS[latestAndroidSubmission.status] || 'gray'}
                        leftSection={<IconBrandAndroid size={16} />}
                        styles={{ root: { paddingLeft: 8 } }}
                      >
                        {latestAndroidSubmission.rolloutPercentage || 0}%
                      </Badge>
                    )}

                    {/* iOS Status - Only if configured */}
                    {hasIOS && latestIOSSubmission && (
                      <Badge
                        size="lg"
                        variant="light"
                        color={SUBMISSION_STATUS_COLORS[latestIOSSubmission.status] || 'gray'}
                        leftSection={<IconBrandApple size={16} />}
                        styles={{ root: { paddingLeft: 8 } }}
                      >
                        {latestIOSSubmission.rolloutPercentage || 0}%
                      </Badge>
                    )}
                  </Group>
                </Stack>

                <Divider orientation="vertical" />
              </>
            )}

            {/* Link to Full Distribution */}
            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Full Management
              </Text>
              <Button
                component={Link}
                to={`/dashboard/${tenantId}/distributions/${distribution.id}`}
                variant="subtle"
                size="xs"
                rightSection={<IconExternalLink size={14} />}
              >
                Open Distribution
              </Button>
            </Stack>
          </Group>
        </Stack>
      </Paper>

      {/* Platform Tabs - Only show configured platforms */}
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Tabs defaultValue={hasAndroid ? 'android' : 'ios'}>
          <Tabs.List>
            {hasAndroid && (
              <Tabs.Tab
                value="android"
                leftSection={<IconBrandAndroid size={16} />}
              >
                Android
              </Tabs.Tab>
            )}
            {hasIOS && (
              <Tabs.Tab
                value="ios"
                leftSection={<IconBrandApple size={16} />}
              >
                iOS
              </Tabs.Tab>
            )}
          </Tabs.List>

          {/* Android Tab - Only if configured */}
          {hasAndroid && (
            <Tabs.Panel value="android" pt="lg">
              <Stack gap="lg">
                {latestAndroidSubmission ? (
                  <>
                    {/* Latest Submission Card - LIMITED MODE: Only show Promote if PENDING */}
                    <LatestSubmissionCard
                      submission={latestAndroidSubmission}
                      tenantId={tenantId}
                      // LIMITED MODE: Only pass onPromote if PENDING
                      {...(latestAndroidSubmission.status === SubmissionStatus.PENDING && {
                        onPromote: handleOpenPromoteAndroidDialog
                      })}
                      // NO onPause, onResume, onUpdate, onCancel - this is LIMITED mode
                    />
                    
                    {/* Info: For advanced actions */}
                    {latestAndroidSubmission.status !== SubmissionStatus.PENDING && (
                      <Paper p="sm" bg="blue.0" radius="md">
                        <Text size="xs" c="dimmed">
                          For promotion, rollout management, and other actions, visit the{' '}
                          <Text
                            component={Link}
                            to={`/dashboard/${tenantId}/distributions/${distribution.id}`}
                            size="xs"
                            fw={600}
                            c="blue"
                            td="underline"
                          >
                            Distribution Management page
                          </Text>
                        </Text>
                      </Paper>
                    )}
                  </>
                ) : (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    No Android submission found for this release.
                  </Alert>
                )}
              </Stack>
            </Tabs.Panel>
          )}

          {/* iOS Tab - Only if configured */}
          {hasIOS && (
            <Tabs.Panel value="ios" pt="lg">
              <Stack gap="lg">
                {latestIOSSubmission ? (
                  <>
                    {/* Latest Submission Card - LIMITED MODE: Only show Promote if PENDING */}
                    <LatestSubmissionCard
                      submission={latestIOSSubmission}
                      tenantId={tenantId}
                      // LIMITED MODE: Only pass onPromote if PENDING
                      {...(latestIOSSubmission.status === SubmissionStatus.PENDING && {
                        onPromote: handleOpenPromoteIOSDialog
                      })}
                      // NO onPause, onResume, onUpdate, onCancel - this is LIMITED mode
                    />
                    
                    {/* Info: For advanced actions */}
                    {latestIOSSubmission.status !== SubmissionStatus.PENDING && (
                      <Paper p="sm" bg="blue.0" radius="md">
                        <Text size="xs" c="dimmed">
                          For promotion, rollout management, and other actions, visit the{' '}
                          <Text
                            component={Link}
                            to={`/dashboard/${tenantId}/distributions/${distribution.id}`}
                            size="xs"
                            fw={600}
                            c="blue"
                            td="underline"
                          >
                            Distribution Management page
                          </Text>
                        </Text>
                      </Paper>
                    )}
                  </>
                ) : (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    No iOS submission found for this release.
                  </Alert>
                )}
              </Stack>
            </Tabs.Panel>
          )}
        </Tabs>
      </Paper>

      {/* Platform-Specific Promote Dialogs (same as Distribution Management) */}
      {latestAndroidSubmission && latestAndroidSubmission.platform === Platform.ANDROID && (
        <PromoteAndroidSubmissionDialog
          opened={isPromoteAndroidDialogOpen}
          submission={latestAndroidSubmission}
          onClose={() => setIsPromoteAndroidDialogOpen(false)}
          onPromoteComplete={handlePromoteComplete}
          action={`/dashboard/${tenantId}/distributions/${distribution.id}`}
        />
      )}

      {latestIOSSubmission && latestIOSSubmission.platform === Platform.IOS && (
        <PromoteIOSSubmissionDialog
          opened={isPromoteIOSDialogOpen}
          submission={latestIOSSubmission}
          onClose={() => setIsPromoteIOSDialogOpen(false)}
          onPromoteComplete={handlePromoteComplete}
          action={`/dashboard/${tenantId}/distributions/${distribution.id}`}
        />
      )}
    </Stack>
  );
}
