/**
 * Submission Detail Page
 * Full view of a single submission with rollout controls and history
 * Route: /dashboard/:org/releases/:releaseId/submissions/:submissionId
 */

import {
    Alert,
    Badge,
    Button,
    Card,
    Container,
    Divider,
    Group,
    Loader,
    Modal,
    NumberInput,
    Paper,
    Progress,
    Stack,
    Text,
    Textarea,
    ThemeIcon,
    Title
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useNavigation } from '@remix-run/react';
import {
    IconAlertCircle,
    IconArrowLeft,
    IconBrandAndroid,
    IconBrandApple,
    IconPlayerPause,
    IconRotateClockwise,
    IconX
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { RolloutService } from '~/.server/services/Rollout';
import { CancelSubmissionDialog } from '~/components/distribution/CancelSubmissionDialog';
import { ReSubmissionDialog } from '~/components/distribution/ReSubmissionDialog';
import { ROLLOUT_COMPLETE_PERCENT, SUBMISSION_STATUS_LABELS } from '~/constants/distribution.constants';
import {
    Platform,
    SubmissionStatus,
    type Submission,
} from '~/types/distribution.types';
import { authenticateActionRequest, authenticateLoaderRequest, type AuthenticatedActionFunction } from '~/utils/authenticate';

interface LoaderData {
  org: string;
  releaseId: string;
  submission: Submission;
  error?: string;
}

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { org, releaseId, submissionId } = params;

    if (!org || !releaseId || !submissionId) {
      throw new Response('Missing required parameters', { status: 404 });
    }

    // Extract platform from query string
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform');

    if (!platform || (platform !== Platform.ANDROID && platform !== Platform.IOS)) {
      return json<LoaderData>({
        org,
        releaseId,
        submission: {} as Submission,
        error: 'Platform query parameter is required and must be either ANDROID or IOS',
      });
    }

    try {
      // Fetch submission details
      const submissionResponse = await DistributionService.getSubmission(submissionId, platform as Platform);
      const submission = submissionResponse.data;

      return json<LoaderData>({
        org,
        releaseId,
        submission,
      });
    } catch (error) {
      console.error('[Submission Detail] Failed to fetch:', error);
      return json<LoaderData>({
        org,
        releaseId,
        submission: {} as Submission,
        error: 'Failed to fetch submission details',
      });
    }
  }
);

// Actions
const updateRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;
  if (!submissionId) {
    return json({ error: 'Submission ID required' }, { status: 400 });
  }

  const formData = await request.formData();
  const rolloutPercentage = parseInt(formData.get('rolloutPercentage') as string);
  const platform = formData.get('platform') as Platform;

  if (!platform || (platform !== Platform.ANDROID && platform !== Platform.IOS)) {
    return json({ error: 'Platform is required' }, { status: 400 });
  }

  try {
    await RolloutService.updateRollout(submissionId, { rolloutPercentage }, platform);
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to update rollout' }, { status: 500 });
  }
};

const pauseRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;
  if (!submissionId) {
    return json({ error: 'Submission ID required' }, { status: 400 });
  }

  const formData = await request.formData();
  const reason = formData.get('reason') as string;
  const platform = formData.get('platform') as Platform;

  if (!platform) {
    return json({ error: 'Platform is required' }, { status: 400 });
  }

  try {
    await RolloutService.pauseRollout(submissionId, reason ? { reason } : undefined, platform);
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to pause rollout' }, { status: 500 });
  }
};

const resumeRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;
  if (!submissionId) {
    return json({ error: 'Submission ID required' }, { status: 400 });
  }

  const formData = await request.formData();
  const platform = formData.get('platform') as Platform;

  if (!platform) {
    return json({ error: 'Platform is required' }, { status: 400 });
  }

  try {
    await RolloutService.resumeRollout(submissionId, platform);
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to resume rollout' }, { status: 500 });
  }
};

const haltRollout: AuthenticatedActionFunction = async ({ params, request, user }) => {
  const { submissionId } = params;
  if (!submissionId) {
    return json({ error: 'Submission ID required' }, { status: 400 });
  }

  const formData = await request.formData();
  const reason = formData.get('reason') as string;
  const platform = formData.get('platform') as Platform;

  if (!platform || (platform !== Platform.ANDROID && platform !== Platform.IOS)) {
    return json({ error: 'Platform is required' }, { status: 400 });
  }

  try {
    await RolloutService.haltRollout(submissionId, { reason }, platform);
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to halt rollout' }, { status: 500 });
  }
};

export const action = authenticateActionRequest({
  POST: async (args) => {
    const formData = await args.request.formData();
    const action = formData.get('_action');
    
    switch (action) {
      case 'updateRollout':
        return updateRollout(args);
      case 'pauseRollout':
        return pauseRollout(args);
      case 'resumeRollout':
        return resumeRollout(args);
      case 'haltRollout':
        return haltRollout(args);
      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  },
});

// Helper functions
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    IN_REVIEW: 'yellow',
    APPROVED: 'cyan',
    LIVE: 'green',
    REJECTED: 'red',
    HALTED: 'orange',
  };
  return colors[status] ?? 'gray';
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPlatformIcon(platform: Platform, size: number = 24) {
  return platform === Platform.ANDROID ? (
    <IconBrandAndroid size={size} stroke={2} />
  ) : (
    <IconBrandApple size={size} stroke={2} />
  );
}

// Components
function SubmissionHeader({ submission, org }: { submission: Submission; org: string }) {
  const platformName = submission.platform === Platform.ANDROID ? 'Android' : 'iOS';
  const platformColor = submission.platform === Platform.ANDROID ? 'green' : 'blue';

  return (
    <Paper shadow="sm" p="lg" radius="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <Group>
          <ThemeIcon size="xl" variant="light" color={platformColor} radius="md">
            {getPlatformIcon(submission.platform, 32)}
          </ThemeIcon>
          <div>
            <Title order={3}>{platformName} Submission</Title>
            <Text size="sm" c="dimmed">{submission.storeType}</Text>
          </div>
        </Group>
        <Badge 
          color={getStatusColor(submission.status)} 
          variant="dot"
          size="xl"
          radius="sm"
        >
          {formatStatus(submission.status)}
        </Badge>
      </Group>
    </Paper>
  );
}

function RolloutControlPanel({ submission }: { submission: Submission }) {
  const [targetPercent, setTargetPercent] = useState(submission.rolloutPercentage);
  const fetcher = useFetcher();
  const isUpdating = fetcher.state === 'submitting';

  const handleUpdateRollout = useCallback(() => {
    fetcher.submit(
      { _action: 'updateRollout', rolloutPercentage: targetPercent.toString(), platform: submission.platform },
      { method: 'post' }
    );
  }, [targetPercent, submission.platform, fetcher]);

  const canIncrease = submission.status === SubmissionStatus.LIVE && 
                       submission.rolloutPercentage < ROLLOUT_COMPLETE_PERCENT;

  if (!canIncrease) {
    return null;
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600} size="lg">Rollout Control</Text>
          <Badge color="blue" variant="light">Active</Badge>
        </Group>

        <Divider />

        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Current Exposure</Text>
            <Text size="lg" fw={700}>{submission.rolloutPercentage}%</Text>
          </Group>
          <Progress value={submission.rolloutPercentage} size="xl" color="blue" />
        </div>

        <NumberInput
          label="Target Percentage"
          description="Increase rollout to reach more users"
          value={targetPercent}
          onChange={(val) => setTargetPercent(Number(val))}
          min={submission.rolloutPercentage}
          max={100}
          step={5}
          suffix="%"
          disabled={isUpdating}
        />

        <Button
          onClick={handleUpdateRollout}
          disabled={targetPercent <= submission.rolloutPercentage || isUpdating}
          loading={isUpdating}
          fullWidth
          color="blue"
        >
          Update Rollout
        </Button>
      </Stack>
    </Card>
  );
}

function HaltDialog({ 
  opened, 
  onClose, 
  submissionId,
  platform
}: { 
  opened: boolean; 
  onClose: () => void; 
  submissionId: string;
  platform: Platform;
}) {
  const [reason, setReason] = useState('');
  const fetcher = useFetcher();

  const handleSubmit = useCallback(() => {
    fetcher.submit(
      { _action: 'haltRollout', reason, platform },
      { method: 'post' }
    );
    onClose();
  }, [reason, platform, fetcher, onClose]);

  return (
    <Modal opened={opened} onClose={onClose} title="Emergency Halt" size="md" centered>
      <Stack gap="md">
        <Alert color="red" icon={<IconAlertCircle />}>
          This will immediately halt the rollout. Users who already have the update will keep it,
          but no new users will receive it.
        </Alert>

        <Textarea
          label="Reason"
          placeholder="Describe why this rollout needs to be halted..."
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          minRows={3}
          required
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button color="red" onClick={handleSubmit} disabled={!reason.trim()}>
            Halt Rollout
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


export default function SubmissionDetailPage() {
  const { org, releaseId, submission, error } = useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const [haltDialogOpened, { open: openHaltDialog, close: closeHaltDialog }] = useDisclosure(false);
  const [retryDialogOpened, { open: openRetryDialog, close: closeRetryDialog }] = useDisclosure(false);
  const [cancelDialogOpened, { open: openCancelDialog, close: closeCancelDialog }] = useDisclosure(false);
  
  const isLoading = navigation.state === 'loading';
  const canRetry = submission.status === SubmissionStatus.REJECTED;
  const canCancel = [
    SubmissionStatus.IN_REVIEW,
    SubmissionStatus.APPROVED,
  ].includes(submission.status as SubmissionStatus);
  const canHalt = submission.status === SubmissionStatus.LIVE;

  if (error || !submission.id) {
    return (
      <Container size="lg" className="py-8">
        <Alert color="red" icon={<IconAlertCircle />} title="Error">
          {error || 'Submission not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-8">
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder className="mb-6">
        <Group justify="space-between">
          <Group>
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions/${submission.distributionId}`}
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              size="sm"
            >
              Back
            </Button>
            <Divider orientation="vertical" />
            <Title order={2}>Submission Details</Title>
          </Group>
          {isLoading && <Loader size="sm" />}
        </Group>
      </Paper>

      {/* Submission Header */}
      <SubmissionHeader submission={submission} org={org} />

      {/* Main Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
        gap: '1rem',
        marginTop: '1.5rem'
      }}>
        {/* Rollout Control */}
        <RolloutControlPanel submission={submission} />

        {/* Actions Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">Actions</Text>
            <Divider />
            
            {canRetry && (
              <Button
                color="blue"
                variant="light"
                fullWidth
                leftSection={<IconRotateClockwise size={16} />}
                onClick={openRetryDialog}
              >
                Retry Submission
              </Button>
            )}
            
            {canCancel && (
              <Button
                color="orange"
                variant="light"
                fullWidth
                leftSection={<IconX size={16} />}
                onClick={openCancelDialog}
              >
                Cancel Submission
              </Button>
            )}
            
            {canHalt && (
              <Button
                color="red"
                variant="light"
                fullWidth
                leftSection={<IconPlayerPause size={16} />}
                onClick={openHaltDialog}
              >
                Emergency Halt
              </Button>
            )}

            {!canRetry && !canCancel && !canHalt && (
              <Text size="sm" c="dimmed" ta="center">
                No actions available for current status
              </Text>
            )}
          </Stack>
        </Card>
      </div>

      {/* Timeline */}

      {/* Halt Dialog */}
      <HaltDialog
        opened={haltDialogOpened}
        onClose={closeHaltDialog}
        submissionId={submission.id}
        platform={submission.platform}
      />

      {/* Resubmission Dialog */}
      <ReSubmissionDialog
        opened={retryDialogOpened}
        onClose={closeRetryDialog}
        distributionId={submission.distributionId}
        previousSubmission={submission}
      />

      {/* Cancel Dialog */}
      <CancelSubmissionDialog
        opened={cancelDialogOpened}
        onClose={closeCancelDialog}
        submissionId={submission.id}
        platform={submission.platform === Platform.ANDROID ? 'Android' : 'iOS'}
        version={submission.version}
        currentStatus={SUBMISSION_STATUS_LABELS[submission.status as SubmissionStatus]}
      />
    </Container>
  );
}
