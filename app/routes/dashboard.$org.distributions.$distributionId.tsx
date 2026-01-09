/**
 * Distribution Detail Page
 * Shows distribution overview with platform tabs for managing submissions
 * Route: /dashboard/:org/distributions/:distributionId
 */

import {
  Badge,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useNavigate, useNavigation, useRevalidator } from '@remix-run/react';
import { Breadcrumb } from '~/components/Common';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { IconArrowLeft, IconBrandAndroid, IconBrandApple, IconExternalLink, IconRefresh } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '~/.server/services/Auth/auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import { RolloutService } from '~/.server/services/Rollout';
import { ActivityHistoryLog } from '~/components/distribution/ActivityHistoryLog';
import { CancelSubmissionDialog } from '~/components/distribution/CancelSubmissionDialog';
import { ErrorState, StaleDataWarning } from '~/components/distribution/ErrorRecovery';
import { LatestSubmissionCard } from '~/components/distribution/LatestSubmissionCard';
import { PauseRolloutDialog } from '~/components/distribution/PauseRolloutDialog';
import { PromoteAndroidSubmissionDialog } from '~/components/distribution/PromoteAndroidSubmissionDialog';
import { PromoteIOSSubmissionDialog } from '~/components/distribution/PromoteIOSSubmissionDialog';
import { ResubmissionDialog } from '~/components/distribution/ReSubmissionDialog';
import { ResumeRolloutDialog } from '~/components/distribution/ResumeRolloutDialog';
import { SubmissionHistoryTimeline } from '~/components/distribution/SubmissionHistoryTimeline';
import { UpdateRolloutDialog } from '~/components/distribution/UpdateRolloutDialog';
import {
  DISTRIBUTION_MANAGEMENT_UI,
  DISTRIBUTION_STATUS_COLORS,
  SUBMISSION_STATUS_COLORS,
} from '~/constants/distribution/distribution.constants';
import {
  Platform,
  SubmissionStatus,
  type DistributionDetail,
  type Submission,
} from '~/types/distribution/distribution.types';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { formatDateTime, formatStatus } from '~/utils/distribution/distribution-ui.utils';
import { ErrorCategory, checkStaleData, type AppError } from '~/utils/error-handling';
import { showErrorToast } from '~/utils/toast';

interface LoaderData {
  org: string;
  distribution: DistributionDetail;
  loadedAt: string;
  error?: AppError | string;
}

export const loader = authenticateLoaderRequest(
  async ({ params, request, user }: LoaderFunctionArgs & { user: User }) => {
    const { org, distributionId } = params;

    if (!org || !distributionId) {
      throw new Response('Organization or Distribution ID not found', { status: 404 });
    }

    try {
      // Fetch distribution details by distributionId
      // This calls GET /api/v1/tenants/:tenantId/distributions/:distributionId
      const response = await DistributionService.getDistribution(org, distributionId);
      const distribution = response.data.data;

      return json<LoaderData>({
        org,
        distribution,
        loadedAt: new Date().toISOString(),
      });
    } catch (error) {
      const appError: AppError = {
        category: ErrorCategory.NETWORK,
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        userMessage: 'Failed to load distribution details',
        recoveryGuidance: 'Check your connection and try again.',
        retryable: true,
      };
      
      return json<LoaderData>({
        org,
        distribution: {} as DistributionDetail,
        loadedAt: new Date().toISOString(),
        error: appError,
      });
    }
  }
);

export const action = authenticateLoaderRequest(
  async ({ request, params }: ActionFunctionArgs & { user: User }) => {
    const { org, distributionId } = params;
    const formData = await request.formData();
    const intent = formData.get('intent') as string;
    const submissionId = formData.get('submissionId') as string;
    const platform = formData.get('platform') as Platform;

    try {
      switch (intent) {
        case 'promoteSubmission': {
          const releaseNotes = formData.get('releaseNotes') as string;

          type AndroidSubmitRequest = {
            rolloutPercentage: number;
            inAppUpdatePriority: number;
            releaseNotes: string;
          };

          type IOSSubmitRequest = {
            phasedRelease: boolean;
            resetRating: boolean;
            releaseNotes: string;
          };

          let submitRequest: AndroidSubmitRequest | IOSSubmitRequest;

          if (platform === Platform.ANDROID) {
            const rolloutPercentage = parseFloat(formData.get('rolloutPercentage') as string);
            const inAppUpdatePriority = parseInt(formData.get('inAppUpdatePriority') as string);

            submitRequest = {
              rolloutPercentage,
              inAppUpdatePriority,
              releaseNotes,
            };
          } else {
            // iOS
            const phasedRelease = formData.get('phasedRelease') === 'true';
            const resetRating = formData.get('resetRating') === 'true';

            submitRequest = {
              phasedRelease,
              resetRating,
              releaseNotes,
            };
          }

          await DistributionService.submitSubmission(org!, submissionId, submitRequest, platform);
          return json({ success: true });
        }

        case 'pauseRollout': {
          const reason = formData.get('reason') as string;
          await RolloutService.pauseRollout(submissionId, { reason }, platform);
          return json({ success: true });
        }

        case 'resumeRollout': {
          await RolloutService.resumeRollout(submissionId, platform);
          return json({ success: true });
        }

        case 'updateRollout': {
          const rolloutPercentage = parseFloat(formData.get('rolloutPercentage') as string);
          await RolloutService.updateRollout(submissionId, { rolloutPercentage }, platform);
          return json({ success: true });
        }

        default:
          return json({ success: false, error: 'Unknown intent' }, { status: 400 });
      }
    } catch (error) {
      return json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }
);

export default function DistributionDetailPage() {
  const { org, distribution, loadedAt, error } = useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const isLoading = navigation.state === 'loading';
  const staleInfo = loadedAt ? checkStaleData(loadedAt) : null;

  // Dialog state management
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isPromoteAndroidDialogOpen, setIsPromoteAndroidDialogOpen] = useState(false);
  const [isPromoteIOSDialogOpen, setIsPromoteIOSDialogOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isUpdateRolloutDialogOpen, setIsUpdateRolloutDialogOpen] = useState(false);
  const [isResubmitDialogOpen, setIsResubmitDialogOpen] = useState(false);
  
  // Track when we need to close dialog after revalidation
  const [shouldCloseAfterRevalidation, setShouldCloseAfterRevalidation] = useState(false);

  // Dialog handlers
  const handleOpenPauseDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsPauseDialogOpen(true);
  }, []);

  const handleOpenResumeDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsResumeDialogOpen(true);
  }, []);


  const handleOpenCancelDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsCancelDialogOpen(true);
  }, []);

  const handleOpenUpdateRolloutDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsUpdateRolloutDialogOpen(true);
  }, []);

  const handleOpenResubmitDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsResubmitDialogOpen(true);
  }, []);

  const handleCloseDialogs = useCallback(() => {
    setIsPromoteAndroidDialogOpen(false);
    setIsPromoteIOSDialogOpen(false);
    setIsPauseDialogOpen(false);
    setIsResumeDialogOpen(false);
    setIsCancelDialogOpen(false);
    setIsUpdateRolloutDialogOpen(false);
    setIsResubmitDialogOpen(false);
    setSelectedSubmission(null);
  }, []);

  // Close specific dialog after action completes (without clearing selectedSubmission)
  const handleCloseSpecificDialog = useCallback((dialogType: 'pause' | 'resume' | 'updateRollout' | 'cancel') => {
    switch (dialogType) {
      case 'pause':
        setIsPauseDialogOpen(false);
        break;
      case 'resume':
        setIsResumeDialogOpen(false);
        break;
      case 'updateRollout':
        setIsUpdateRolloutDialogOpen(false);
        break;
      case 'cancel':
        setIsCancelDialogOpen(false);
        break;
    }
    // Don't clear selectedSubmission - allow user to perform another action
  }, []);

  // Close dialogs after revalidation completes
  useEffect(() => {
    if (shouldCloseAfterRevalidation && revalidator.state === 'idle') {
      handleCloseDialogs();
      setShouldCloseAfterRevalidation(false);
    }
  }, [shouldCloseAfterRevalidation, revalidator.state, handleCloseDialogs]);

  // Action handlers - Call API via fetcher
  const handlePause = useCallback((reason?: string) => {
    if (!selectedSubmission) return;
    
    const formData = new FormData();
    formData.append('intent', 'pauseRollout');
    formData.append('submissionId', selectedSubmission.id);
    formData.append('platform', selectedSubmission.platform);
    if (reason) {
      formData.append('reason', reason);
    }
    
    fetcher.submit(formData, { method: 'post' });
  }, [selectedSubmission, fetcher]);

  const handleResume = useCallback(() => {
    if (!selectedSubmission) return;
    
    const formData = new FormData();
    formData.append('intent', 'resumeRollout');
    formData.append('submissionId', selectedSubmission.id);
    formData.append('platform', selectedSubmission.platform);
    
    fetcher.submit(formData, { method: 'post' });
  }, [selectedSubmission, fetcher]);


  const handleUpdateRolloutSubmit = useCallback((rolloutPercentage: number) => {
    if (!selectedSubmission) return;
    
    const formData = new FormData();
    formData.append('intent', 'updateRollout');
    formData.append('submissionId', selectedSubmission.id);
    formData.append('platform', selectedSubmission.platform);
    formData.append('rolloutPercentage', rolloutPercentage.toString());
    
    fetcher.submit(formData, { method: 'post' });
  }, [selectedSubmission, fetcher]);

  // Helper: Revalidate data and then close dialogs
  const revalidateAndCloseSpecific = useCallback((dialogType: 'pause' | 'resume' | 'updateRollout' | 'cancel') => {
    // Close only the specific dialog immediately
    handleCloseSpecificDialog(dialogType);
    // Trigger revalidation to fetch fresh data
    revalidator.revalidate();
  }, [revalidator, handleCloseSpecificDialog]);

  const handleCancelComplete = useCallback(() => {
    revalidateAndCloseSpecific('cancel');
  }, [revalidateAndCloseSpecific]);

  const handlePromoteComplete = useCallback(() => {
    // Promote dialogs are platform-specific, close all and reset
    revalidator.revalidate();
    setShouldCloseAfterRevalidation(true);
  }, [revalidator]);

  const handleResubmitComplete = useCallback(() => {
    // Resubmit creates new submission, close all and reset
    revalidator.revalidate();
    setShouldCloseAfterRevalidation(true);
  }, [revalidator]);

  const handlePauseComplete = useCallback(() => {
    revalidateAndCloseSpecific('pause');
  }, [revalidateAndCloseSpecific]);

  const handleResumeComplete = useCallback(() => {
    revalidateAndCloseSpecific('resume');
  }, [revalidateAndCloseSpecific]);


  const handleUpdateRolloutComplete = useCallback(() => {
    revalidateAndCloseSpecific('updateRollout');
  }, [revalidateAndCloseSpecific]);

  // Watch fetcher state and trigger revalidation when API calls complete
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const response = fetcher.data as { success: boolean; error?: string };
      
      if (response.success === true) {
        // Success: Close dialog and refresh data (no toast needed - dialog closing = success indicator)
        if (isPauseDialogOpen) {
          handlePauseComplete();
        } else if (isResumeDialogOpen) {
          handleResumeComplete();
        } else if (isUpdateRolloutDialogOpen) {
          handleUpdateRolloutComplete();
        }
        // Note: Promote and Cancel dialogs are handled elsewhere
      } else if (response.success === false) {
        // API call failed - show error toast and keep dialog open
        let errorMessage = response.error || 'An unexpected error occurred. Please try again.';
        
        // Clean up technical error messages for better UX
        if (errorMessage.includes('status code 404')) {
          errorMessage = 'The requested resource was not found. Please refresh and try again.';
        } else if (errorMessage.includes('status code 500')) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (errorMessage.includes('status code 403')) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (errorMessage.includes('status code 401')) {
          errorMessage = 'Your session has expired. Please refresh the page.';
        } else if (errorMessage.includes('Network Error') || errorMessage.includes('ERR_NETWORK')) {
          errorMessage = 'Network connection failed. Please check your internet connection.';
        }
        
        // Determine which action failed and show appropriate error message
        let actionName = 'Action';
        if (isPauseDialogOpen) actionName = 'Pause Rollout';
        else if (isResumeDialogOpen) actionName = 'Resume Rollout';
        else if (isUpdateRolloutDialogOpen) actionName = 'Update Rollout';
        else if (isCancelDialogOpen) actionName = 'Cancel Submission';
        else if (isPromoteAndroidDialogOpen || isPromoteIOSDialogOpen) actionName = 'Submit to Store';
        
        showErrorToast({
          title: `${actionName} Failed`,
          message: errorMessage,
          duration: 8000, // Show longer for errors
        });
        
        // Dialog stays open so user can retry or cancel manually
        // DO NOT call completion handlers - let user close dialog manually
      }
    }
  }, [
    fetcher.state,
    fetcher.data,
    isPauseDialogOpen,
    isResumeDialogOpen,
    isUpdateRolloutDialogOpen,
    isCancelDialogOpen,
    isPromoteAndroidDialogOpen,
    isPromoteIOSDialogOpen,
    handlePauseComplete,
    handleResumeComplete,
    handleUpdateRolloutComplete,
  ]);

  // Separate active and historical submissions per platform
  const androidSubmissions = useMemo(
    () => distribution.submissions?.filter((s) => s.platform === Platform.ANDROID) || [],
    [distribution.submissions]
  );

  const iosSubmissions = useMemo(
    () => distribution.submissions?.filter((s) => s.platform === Platform.IOS) || [],
    [distribution.submissions]
  );

  // Get latest (active) submissions
  const latestAndroidSubmission = useMemo(
    () => androidSubmissions.find((s) => s.isActive),
    [androidSubmissions]
  );

  const latestIOSSubmission = useMemo(
    () => iosSubmissions.find((s) => s.isActive),
    [iosSubmissions]
  );

  // Get historical submissions (not active)
  const historicalAndroidSubmissions = useMemo(
    () => androidSubmissions.filter((s) => !s.isActive),
    [androidSubmissions]
  );

  const historicalIOSSubmissions = useMemo(
    () => iosSubmissions.filter((s) => !s.isActive),
    [iosSubmissions]
  );

  // Platform-specific update rollout dialog handlers (defined after submissions)
  const handleOpenAndroidUpdateRolloutDialog = useCallback(() => {
    if (latestAndroidSubmission) {
      handleOpenUpdateRolloutDialog(latestAndroidSubmission);
    }
  }, [latestAndroidSubmission, handleOpenUpdateRolloutDialog]);

  const handleOpenIOSUpdateRolloutDialog = useCallback(() => {
    if (latestIOSSubmission) {
      handleOpenUpdateRolloutDialog(latestIOSSubmission);
    }
  }, [latestIOSSubmission, handleOpenUpdateRolloutDialog]);

  // Platform-specific promote dialog handlers (for PENDING status)
  const handleOpenAndroidPromoteDialog = useCallback(() => {
    if (latestAndroidSubmission) {
      setSelectedSubmission(latestAndroidSubmission);
      setIsPromoteAndroidDialogOpen(true);
    }
  }, [latestAndroidSubmission]);

  const handleOpenIOSPromoteDialog = useCallback(() => {
    if (latestIOSSubmission) {
      setSelectedSubmission(latestIOSSubmission);
      setIsPromoteIOSDialogOpen(true);
    }
  }, [latestIOSSubmission]);

  // Platform-specific resubmit dialog handlers
  const handleOpenAndroidResubmitDialog = useCallback(() => {
    // Use active submission if available, otherwise use the most recent historical submission
    const submissionToResubmit = latestAndroidSubmission || historicalAndroidSubmissions[0];
    if (submissionToResubmit) {
      handleOpenResubmitDialog(submissionToResubmit);
    }
  }, [latestAndroidSubmission, historicalAndroidSubmissions, handleOpenResubmitDialog]);

  const handleOpenIOSResubmitDialog = useCallback(() => {
    // Use active submission if available, otherwise use the most recent historical submission
    const submissionToResubmit = latestIOSSubmission || historicalIOSSubmissions[0];
    if (submissionToResubmit) {
      handleOpenResubmitDialog(submissionToResubmit);
    }
  }, [latestIOSSubmission, historicalIOSSubmissions, handleOpenResubmitDialog]);

  // Platform-specific dialog handlers
  const handleOpenAndroidPauseDialog = useCallback(() => {
    if (latestAndroidSubmission) {
      handleOpenPauseDialog(latestAndroidSubmission);
    }
  }, [latestAndroidSubmission, handleOpenPauseDialog]);

  const handleOpenAndroidResumeDialog = useCallback(() => {
    if (latestAndroidSubmission) {
      handleOpenResumeDialog(latestAndroidSubmission);
    }
  }, [latestAndroidSubmission, handleOpenResumeDialog]);


  const handleOpenAndroidCancelDialog = useCallback(() => {
    if (latestAndroidSubmission) {
      handleOpenCancelDialog(latestAndroidSubmission);
    }
  }, [latestAndroidSubmission, handleOpenCancelDialog]);

  const handleOpenIOSPauseDialog = useCallback(() => {
    if (latestIOSSubmission) {
      handleOpenPauseDialog(latestIOSSubmission);
    }
  }, [latestIOSSubmission, handleOpenPauseDialog]);

  const handleOpenIOSResumeDialog = useCallback(() => {
    if (latestIOSSubmission) {
      handleOpenResumeDialog(latestIOSSubmission);
    }
  }, [latestIOSSubmission, handleOpenResumeDialog]);


  const handleOpenIOSCancelDialog = useCallback(() => {
    if (latestIOSSubmission) {
      handleOpenCancelDialog(latestIOSSubmission);
    }
  }, [latestIOSSubmission, handleOpenCancelDialog]);

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('distributions.detail', {
    org,
    distributionBranch: distribution.branch,
  });

  if (error || !distribution.id) {
    return (
      <Container size="lg" className="py-8">
        <Breadcrumb items={breadcrumbItems} mb={16} />
        {/* Back Button - Navigate back to preserve page state */}
        <Group mb="lg">
          <Button
            onClick={() => navigate(-1)}
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            size="sm"
          >
            Back to Distributions
          </Button>
        </Group>
        
        <ErrorState
          error={error || 'Distribution not found'}
          onRetry={() => window.location.reload()}
          title="Failed to Load Distribution"
        />
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-8">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} mb={16} />
      
      {/* Stale Data Warning */}
      {staleInfo?.shouldRefresh && (
        <StaleDataWarning
          loadedAt={new Date(loadedAt)}
          onRefresh={() => window.location.reload()}
          threshold={5}
        />
      )}

      {/* Back Button - Outside of header */}
      <Group mb="lg">
        <Button
          onClick={() => navigate(-1)}
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          size="sm"
        >
          Back to Distributions
        </Button>
      </Group>

      {/* Header Section - Complete Distribution Summary */}
      <Paper shadow="sm" p="xl" radius="md" withBorder mb="xl">
        <Stack gap="lg">
          {/* Title Row */}
          <Group justify="space-between" align="center">
            <Group gap="md" align="center">
              <Title order={1} size="h2">
                {distribution.branch}
              </Title>
              <Badge
                size="xl"
                variant="light"
                color={DISTRIBUTION_STATUS_COLORS[distribution.status] || 'gray'}
                radius="sm"
                styles={{ root: { textTransform: 'uppercase' } }}
              >
                {formatStatus(distribution.status)}
              </Badge>
            </Group>
            {isLoading && <Loader size="md" />}
          </Group>

          <Divider />

          {/* Metadata Row - All in one line */}
          <Group gap="xl" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Release
              </Text>
              <Text
                component={Link}
                to={`/dashboard/${org}/releases/${distribution.releaseId}`}
                size="sm"
                fw={600}
                c="blue"
                td="none"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {distribution.branch}
                <IconExternalLink size={14} />
              </Text>
            </Stack>

            <Divider orientation="vertical" />

            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Created
              </Text>
              <Text size="sm" fw={500}>
                {formatDateTime(distribution.createdAt)}
              </Text>
            </Stack>

            <Divider orientation="vertical" />

            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                Last Updated
              </Text>
              <Text size="sm" fw={500} c="dimmed">
                {distribution.updatedAt ? formatDateTime(distribution.updatedAt) : 'N/A'}
              </Text>
            </Stack>

            <Divider orientation="vertical" />

            {/* Only show Platform Status if there are any submissions */}
            {(androidSubmissions.length > 0 || iosSubmissions.length > 0) && (
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  Platform Status
                </Text>
                <Group gap="sm">
                  {/* Android Status - Only show if there are Android submissions */}
                  {androidSubmissions.length > 0 && (
                    <Badge
                      size="lg"
                      variant="light"
                      color={
                        latestAndroidSubmission
                          ? SUBMISSION_STATUS_COLORS[latestAndroidSubmission.status] || 'gray'
                          : 'gray'
                      }
                      leftSection={<IconBrandAndroid size={16} />}
                      styles={{ root: { paddingLeft: 8 } }}
                    >
                      {latestAndroidSubmission?.rolloutPercentage || 0}%
                    </Badge>
                  )}

                  {/* iOS Status - Only show if there are iOS submissions */}
                  {iosSubmissions.length > 0 && (
                    <Badge
                      size="lg"
                      variant="light"
                      color={
                        latestIOSSubmission
                          ? SUBMISSION_STATUS_COLORS[latestIOSSubmission.status] || 'gray'
                          : 'gray'
                      }
                      leftSection={<IconBrandApple size={16} />}
                      styles={{ root: { paddingLeft: 8 } }}
                    >
                      {latestIOSSubmission?.rolloutPercentage || 0}%
                    </Badge>
                  )}
                </Group>
              </Stack>
            )}
          </Group>
        </Stack>
      </Paper>

      {/* Platform Tabs */}
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Tabs defaultValue={androidSubmissions.length > 0 ? 'android' : 'ios'}>
          <Tabs.List>
            {androidSubmissions.length > 0 && (
              <Tabs.Tab
                value="android"
                leftSection={<IconBrandAndroid size={18} />}
              >
                Android
              </Tabs.Tab>
            )}
            {iosSubmissions.length > 0 && (
              <Tabs.Tab
                value="ios"
                leftSection={<IconBrandApple size={18} />}
              >
                iOS
              </Tabs.Tab>
            )}
          </Tabs.List>

          {/* Android Tab - Only render if there are Android submissions */}
          {androidSubmissions.length > 0 && (
            <Tabs.Panel value="android" pt="xl">
            <Stack gap="xl">
              {/* Latest Android Submission */}
              <div>
                <Title order={4} mb="md">{DISTRIBUTION_MANAGEMENT_UI.SECTIONS.LATEST_ANDROID_SUBMISSION}</Title>
                {latestAndroidSubmission ? (
                  <LatestSubmissionCard
                    submission={latestAndroidSubmission}
                    tenantId={org}
                    onPromote={handleOpenAndroidPromoteDialog}
                    onUpdateRollout={handleOpenAndroidUpdateRolloutDialog}
                    onPause={handleOpenAndroidPauseDialog}
                    onResume={handleOpenAndroidResumeDialog}
                    onCancel={handleOpenAndroidCancelDialog}
                    onResubmit={handleOpenAndroidResubmitDialog}
                  />
                ) : (
                  <Paper p="xl" radius="md" withBorder>
                    <Stack align="center" gap="md">
                      <Text c="dimmed" ta="center">{DISTRIBUTION_MANAGEMENT_UI.EMPTY_STATES.NO_ACTIVE_ANDROID_SUBMISSION}</Text>
                      {/* Show Resubmit button if there's a rejected/cancelled/action-pending submission */}
                      {historicalAndroidSubmissions.length > 0 && 
                       (historicalAndroidSubmissions[0].status === SubmissionStatus.REJECTED || 
                        historicalAndroidSubmissions[0].status === SubmissionStatus.CANCELLED ||
                        historicalAndroidSubmissions[0].status === SubmissionStatus.USER_ACTION_PENDING) && (
                        <Button
                          variant="filled"
                          color="blue"
                          leftSection={<IconRefresh size={16} />}
                          onClick={handleOpenAndroidResubmitDialog}
                        >
                          {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.RESUBMIT}
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )}
              </div>

              <Divider />

              {/* Android Submission History */}
              <div>
                <Title order={4} mb="md">{DISTRIBUTION_MANAGEMENT_UI.SECTIONS.ANDROID_SUBMISSION_HISTORY}</Title>
                {historicalAndroidSubmissions.length > 0 ? (
                  <SubmissionHistoryTimeline
                    submissions={historicalAndroidSubmissions}
                    platform={Platform.ANDROID}
                    tenantId={org}
                  />
                ) : (
                  <Paper p="xl" radius="md" withBorder className="text-center">
                    <Text c="dimmed">{DISTRIBUTION_MANAGEMENT_UI.EMPTY_STATES.NO_HISTORICAL_ANDROID_SUBMISSIONS}</Text>
                  </Paper>
                )}
              </div>

              <Divider />

              {/* Android Activity History */}
              <div>
                <Title order={4} mb="md">{DISTRIBUTION_MANAGEMENT_UI.SECTIONS.ANDROID_ACTIVITY_HISTORY}</Title>
                {latestAndroidSubmission?.actionHistory &&
                latestAndroidSubmission.actionHistory.length > 0 ? (
                  <ActivityHistoryLog actionHistory={latestAndroidSubmission.actionHistory} />
                ) : (
                  <Paper p="xl" radius="md" withBorder className="text-center">
                    <Text c="dimmed">{DISTRIBUTION_MANAGEMENT_UI.EMPTY_STATES.NO_ANDROID_ACTIVITY_HISTORY}</Text>
                  </Paper>
                )}
              </div>
            </Stack>
          </Tabs.Panel>
          )}

          {/* iOS Tab - Only render if there are iOS submissions */}
          {iosSubmissions.length > 0 && (
            <Tabs.Panel value="ios" pt="xl">
            <Stack gap="xl">
              {/* Latest iOS Submission */}
              <div>
                <Title order={4} mb="md">{DISTRIBUTION_MANAGEMENT_UI.SECTIONS.LATEST_IOS_SUBMISSION}</Title>
                {latestIOSSubmission ? (
                  <LatestSubmissionCard
                    submission={latestIOSSubmission}
                    tenantId={org}
                    onPromote={handleOpenIOSPromoteDialog}
                    onUpdateRollout={handleOpenIOSUpdateRolloutDialog}
                    onPause={handleOpenIOSPauseDialog}
                    onResume={handleOpenIOSResumeDialog}
                    onCancel={handleOpenIOSCancelDialog}
                    onResubmit={handleOpenIOSResubmitDialog}
                  />
                ) : (
                  <Paper p="xl" radius="md" withBorder>
                    <Stack align="center" gap="md">
                      <Text c="dimmed" ta="center">{DISTRIBUTION_MANAGEMENT_UI.EMPTY_STATES.NO_ACTIVE_IOS_SUBMISSION}</Text>
                      {/* Show Resubmit button if there's a rejected/cancelled submission */}
                      {historicalIOSSubmissions.length > 0 && 
                       (historicalIOSSubmissions[0].status === SubmissionStatus.REJECTED || 
                        historicalIOSSubmissions[0].status === SubmissionStatus.CANCELLED) && (
                        <Button
                          variant="filled"
                          color="blue"
                          leftSection={<IconRefresh size={16} />}
                          onClick={handleOpenIOSResubmitDialog}
                        >
                          {DISTRIBUTION_MANAGEMENT_UI.BUTTONS.RESUBMIT}
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                )}
              </div>

              <Divider />

              {/* iOS Submission History */}
              <div>
                <Title order={4} mb="md">{DISTRIBUTION_MANAGEMENT_UI.SECTIONS.IOS_SUBMISSION_HISTORY}</Title>
                {historicalIOSSubmissions.length > 0 ? (
                  <SubmissionHistoryTimeline
                    submissions={historicalIOSSubmissions}
                    platform={Platform.IOS}
                    tenantId={org}
                  />
                ) : (
                  <Paper p="xl" radius="md" withBorder className="text-center">
                    <Text c="dimmed">{DISTRIBUTION_MANAGEMENT_UI.EMPTY_STATES.NO_HISTORICAL_IOS_SUBMISSIONS}</Text>
                  </Paper>
                )}
              </div>

              <Divider />

              {/* iOS Activity History */}
              <div>
                <Title order={4} mb="md">{DISTRIBUTION_MANAGEMENT_UI.SECTIONS.IOS_ACTIVITY_HISTORY}</Title>
                {latestIOSSubmission?.actionHistory &&
                latestIOSSubmission.actionHistory.length > 0 ? (
                  <ActivityHistoryLog actionHistory={latestIOSSubmission.actionHistory} />
                ) : (
                  <Paper p="xl" radius="md" withBorder className="text-center">
                    <Text c="dimmed">{DISTRIBUTION_MANAGEMENT_UI.EMPTY_STATES.NO_IOS_ACTIVITY_HISTORY}</Text>
                  </Paper>
                )}
              </div>
            </Stack>
          </Tabs.Panel>
          )}
        </Tabs>
      </Paper>

      {/* Action Dialogs */}
      {selectedSubmission && (
        <>
          {/* Promote Android Submission Dialog (PENDING) */}
          {selectedSubmission.platform === Platform.ANDROID && (
            <PromoteAndroidSubmissionDialog
              opened={isPromoteAndroidDialogOpen}
              onClose={handleCloseDialogs}
              submission={selectedSubmission as any}
              onPromoteComplete={handlePromoteComplete}
            />
          )}

          {/* Promote iOS Submission Dialog (PENDING) */}
          {selectedSubmission.platform === Platform.IOS && (
            <PromoteIOSSubmissionDialog
              opened={isPromoteIOSDialogOpen}
              onClose={handleCloseDialogs}
              submission={selectedSubmission as any}
              onPromoteComplete={handlePromoteComplete}
            />
          )}

          {/* Pause Rollout Dialog */}
          <PauseRolloutDialog
            opened={isPauseDialogOpen}
            onClose={handleCloseDialogs}
            platform={selectedSubmission.platform}
            currentPercentage={selectedSubmission.rolloutPercentage}
            onConfirm={handlePause}
            isLoading={fetcher.state === 'submitting'}
          />

          {/* Resume Rollout Dialog */}
          <ResumeRolloutDialog
            opened={isResumeDialogOpen}
            onClose={handleCloseDialogs}
            platform={selectedSubmission.platform}
            currentPercentage={selectedSubmission.rolloutPercentage}
            onConfirm={handleResume}
            isLoading={fetcher.state === 'submitting'}
          />

          {/* Cancel Submission Dialog */}
          <CancelSubmissionDialog
            opened={isCancelDialogOpen}
            onClose={handleCloseDialogs}
            tenantId={org}
            submissionId={selectedSubmission.id}
            platform={selectedSubmission.platform}
            version={selectedSubmission.version}
            currentStatus={selectedSubmission.status}
            onCancelComplete={handleCancelComplete}
          />

          {/* Update Rollout Dialog */}
          <UpdateRolloutDialog
            opened={isUpdateRolloutDialogOpen}
            onClose={handleCloseDialogs}
            platform={selectedSubmission.platform}
            currentPercentage={selectedSubmission.rolloutPercentage}
            {...(selectedSubmission.platform === Platform.IOS && 
              'phasedRelease' in selectedSubmission && 
              selectedSubmission.phasedRelease != null 
                ? { phasedRelease: selectedSubmission.phasedRelease } 
                : {}
            )}
            onConfirm={handleUpdateRolloutSubmit}
            isLoading={fetcher.state === 'submitting'}
          />

          {/* Resubmit Dialog */}
          {selectedSubmission && (
            <ResubmissionDialog
              opened={isResubmitDialogOpen}
              onClose={handleCloseDialogs}
              tenantId={org}
              distributionId={distribution.id}
              previousSubmission={selectedSubmission}
              onResubmitComplete={handleResubmitComplete}
            />
          )}
        </>
      )}
    </Container>
  );
}
