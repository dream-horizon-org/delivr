/**
 * DistributionStage Component
 * 
 * Stage 4 in the release process - Submit once, then view-only
 * 
 * Philosophy:
 * - PENDING: Show "Submit to Stores" button (one-time action)
 * - SUBMITTED+: Show status only (read-only, NO actions)
 * - Always: Link to Distribution Management for advanced actions (promote, rollout, etc.)
 * 
 * Once submitted, all management happens on the Distribution Management page
 * Only visible after Pre-Release stage is approved
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
  Modal,
  Paper,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core';
import { Link } from '@remix-run/react';
import {
  IconAlertCircle,
  IconBrandAndroid,
  IconBrandApple,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconRefresh,
  IconRocket,
  IconSend
} from '@tabler/icons-react';
import { useState } from 'react';
import { SubmitToStoresForm } from '~/components/Distribution';
import {
  DIALOG_TITLES,
  DISTRIBUTION_STATUS_COLORS,
  SUBMISSION_STATUS_COLORS,
} from '~/constants/distribution/distribution.constants';
import { useDistributionStage } from '~/hooks/useDistributionStage';
import {
  Platform,
  SubmissionStatus,
  type Submission
} from '~/types/distribution/distribution.types';
import { formatStatus } from '~/utils/distribution/distribution-ui.utils';

interface DistributionStageProps {
  tenantId: string;
  releaseId: string;
  className?: string;
}

/**
 * Empty state when no distribution exists yet
 */
function NoDistributionState({ 
  releaseId, 
  tenantId, 
  onOpenSubmitModal 
}: { 
  releaseId: string; 
  tenantId: string;
  onOpenSubmitModal: () => void;
}) {
  return (
    <Card withBorder p="xl" radius="md">
      <Center py="xl">
        <Stack align="center" gap="md">
          <ThemeIcon size={64} radius="xl" variant="light" color="blue">
            <IconRocket size={32} />
          </ThemeIcon>
          <Title order={4}>Ready to Submit</Title>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            Pre-release is complete. Submit your builds to the app stores.
          </Text>
          <Button
            onClick={onOpenSubmitModal}
            leftSection={<IconSend size={16} />}
            size="md"
          >
            Submit to Stores
          </Button>
        </Stack>
      </Center>
    </Card>
  );
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
 * Simple submission status card - just status and store info
 */
function SubmissionStatusCard({ submission }: { submission: Submission }) {
  const isAndroid = submission.platform === Platform.ANDROID;
  const statusColor = SUBMISSION_STATUS_COLORS[submission.status] || 'gray';
  
  // Determine store name
  const storeName = isAndroid ? 'Google Play Store' : 'App Store';
  
  // Show rollout if live
  const isLive = submission.status === SubmissionStatus.LIVE;
  const rolloutPercentage = submission.rolloutPercentage || 0;
  
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="flex-start">
        <Group gap="md">
          <ThemeIcon 
            size={40} 
            radius="md" 
            variant="light" 
            color={isAndroid ? 'green' : 'gray'}
          >
            {isAndroid ? <IconBrandAndroid size={20} /> : <IconBrandApple size={20} />}
          </ThemeIcon>
          <div>
            <Text fw={600} size="sm">{isAndroid ? 'Android' : 'iOS'}</Text>
            <Text size="xs" c="dimmed">{storeName}</Text>
          </div>
        </Group>
        
        <Badge color={statusColor} variant="filled" size="lg">
          {formatStatus(submission.status)}
        </Badge>
      </Group>
      
      {/* Show rollout progress if live */}
      {isLive && (
        <Stack gap="xs" mt="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Rollout Progress</Text>
            <Text size="xs" fw={500}>{rolloutPercentage}%</Text>
          </Group>
          <Progress 
            value={rolloutPercentage} 
            color={rolloutPercentage === 100 ? 'green' : 'blue'} 
            size="sm" 
            radius="xl"
          />
        </Stack>
      )}
      
      {/* Show waiting message if in review */}
      {submission.status === SubmissionStatus.IN_REVIEW && (
        <Group gap="xs" mt="md">
          <IconClock size={14} color="gray" />
          <Text size="xs" c="dimmed">Waiting for store review...</Text>
        </Group>
      )}
      
      {/* Show approved message */}
      {submission.status === SubmissionStatus.APPROVED && (
        <Group gap="xs" mt="md">
          <IconCheck size={14} color="green" />
          <Text size="xs" c="green">Approved - Ready for rollout</Text>
        </Group>
      )}
    </Paper>
  );
}

/**
 * Pending submission card - not yet submitted
 */
function PendingSubmissionCard({ 
  platform, 
  releaseId, 
  tenantId 
}: { 
  platform: Platform; 
  releaseId: string; 
  tenantId: string;
}) {
  const isAndroid = platform === Platform.ANDROID;
  const storeName = isAndroid ? 'Google Play Store' : 'App Store';
  
  return (
    <Paper withBorder p="md" radius="md" style={{ opacity: 0.8 }}>
      <Group justify="space-between" align="flex-start">
        <Group gap="md">
          <ThemeIcon 
            size={40} 
            radius="md" 
            variant="light" 
            color="gray"
          >
            {isAndroid ? <IconBrandAndroid size={20} /> : <IconBrandApple size={20} />}
          </ThemeIcon>
          <div>
            <Text fw={600} size="sm">{isAndroid ? 'Android' : 'iOS'}</Text>
            <Text size="xs" c="dimmed">{storeName}</Text>
          </div>
        </Group>
        
        <Badge color="gray" variant="light" size="lg">
          Not Submitted
        </Badge>
      </Group>
    </Paper>
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
  const { distribution, isLoading, error, refetch } = useDistributionStage(tenantId, releaseId);
  
  // Modal state for submit to stores form
  const [submitModalOpened, setSubmitModalOpened] = useState(false);

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // Handle submission complete - refresh data and close modal
  const handleSubmitComplete = () => {
    setSubmitModalOpened(false);
    refetch(); // Refresh distribution data
  };
  
  // No distribution yet - show submit button
  if (!distribution) {
    return (
      <>
        <NoDistributionState 
          releaseId={releaseId} 
          tenantId={tenantId}
          onOpenSubmitModal={() => setSubmitModalOpened(true)}
        />
        
        {/* Submit Modal - only show if we have distribution ID (from error or created) */}
        {/* For now, link to the distribution page as fallback */}
      </>
    );
  }

  // Get submissions from distribution
  const submissions = distribution.submissions || [];
  const androidSubmission = submissions.find((s) => s.platform === Platform.ANDROID);
  const iosSubmission = submissions.find((s) => s.platform === Platform.IOS);
  
  // Check if all are pending (can still submit)
  const allPending = submissions.every(s => s.status === SubmissionStatus.PENDING);
  const hasSubmissions = submissions.length > 0;
  
  // Distribution status
  const statusColor = DISTRIBUTION_STATUS_COLORS[distribution.status] || 'gray';

  return (
    <Stack gap="lg" className={className}>
      {/* Header with overall status - NO actions, just status display */}
      <Paper withBorder p="lg" radius="md">
        <Group gap="md">
          <ThemeIcon size={48} radius="md" variant="light" color={statusColor}>
            <IconRocket size={24} />
          </ThemeIcon>
          <div>
            <Text fw={600} size="lg">Distribution</Text>
            <Group gap="xs" mt={4}>
              <Badge color={statusColor} variant="filled">
                {formatStatus(distribution.status)}
              </Badge>
              {allPending && (
                <Text size="xs" c="dimmed">Ready to submit</Text>
              )}
            </Group>
          </div>
        </Group>
      </Paper>

      {/* Platform Status Cards */}
      <div>
        <Text fw={600} size="sm" mb="sm">Store Submissions</Text>
        <Stack gap="sm">
          {androidSubmission ? (
            <SubmissionStatusCard submission={androidSubmission} />
          ) : (
            <PendingSubmissionCard platform={Platform.ANDROID} releaseId={releaseId} tenantId={tenantId} />
          )}
          
          {iosSubmission ? (
            <SubmissionStatusCard submission={iosSubmission} />
          ) : (
            <PendingSubmissionCard platform={Platform.IOS} releaseId={releaseId} tenantId={tenantId} />
          )}
        </Stack>
      </div>

      {/* Link to full distribution management - ALL post-submission actions happen there */}
      <Divider />
      
      <Paper p="md" bg="blue.0" radius="md">
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" fw={500} mb={4}>
              {allPending ? 'Ready to submit?' : 'Need to manage this release?'}
            </Text>
            <Text size="xs" c="dimmed">
              {allPending 
                ? 'Submit to stores and track progress' 
                : 'Promote, manage rollouts, view history, and more'}
            </Text>
          </div>
          {allPending ? (
            <Button
              onClick={() => setSubmitModalOpened(true)}
              variant="light"
              rightSection={<IconSend size={14} />}
            >
              Submit to Stores
            </Button>
          ) : (
            <Button
              component={Link}
              to={`/dashboard/${tenantId}/distributions/${distribution.id}`}
              variant="light"
              rightSection={<IconExternalLink size={14} />}
            >
              Open Distribution
            </Button>
          )}
        </Group>
      </Paper>
      
      {/* Submit to Stores Modal */}
      <Modal
        opened={submitModalOpened}
        onClose={() => setSubmitModalOpened(false)}
        title={DIALOG_TITLES.SUBMIT_TO_STORES}
        size="lg"
      >
        <SubmitToStoresForm
          releaseId={releaseId}
          distributionId={distribution.id}
          submissions={submissions}
          onSubmitComplete={handleSubmitComplete}
          onClose={() => setSubmitModalOpened(false)}
          isFirstSubmission={true}
        />
      </Modal>
    </Stack>
  );
}
