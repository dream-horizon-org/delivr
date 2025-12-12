/**
 * Submission Details Page
 * Shows detailed information about a specific store submission
 * 
 * Route: /dashboard/:org/releases/:releaseId/submissions/:submissionId
 * 
 * Features:
 * - Submission status and metadata
 * - Rollout controls (pause/resume/halt/update)
 * - Full event history
 * - Error details (if rejected)
 * - Retry submission
 */

import { Badge, Button, Card, Container, Group, Stack, Text, Title } from '@mantine/core';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate, useRevalidator } from '@remix-run/react';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
  ERROR_MESSAGES,
  LOG_CONTEXT,
} from '~/constants/distribution-api.constants';
import {
  BUTTON_LABELS,
  PLATFORM_LABELS,
  ROLLOUT_COMPLETE_PERCENT,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution.constants';
import type {
  Submission,
  SubmissionHistoryResponse,
} from '~/types/distribution.types';
import { HaltSeverity, Platform, SubmissionAction, SubmissionStatus } from '~/types/distribution.types';
import {
  createValidationError,
  handleAxiosError,
  isValidPercentage,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import { authenticateActionRequest, authenticateLoaderRequest } from '~/utils/authenticate';

// Components
import {
  HaltRolloutDialog,
  RolloutControls,
  SubmissionCard,
  SubmissionHistoryPanel,
} from '~/components/distribution';

// ============================================================================
// TYPES
// ============================================================================

type SubmissionLoaderData = {
  submission: Submission;
  history: SubmissionHistoryResponse['data'];
  releaseId: string;
  org: string;
};

// ============================================================================
// LOADER
// ============================================================================

export const loader = authenticateLoaderRequest(
  async ({ params }: LoaderFunctionArgs & { user: User }) => {
    const { submissionId, releaseId, org } = params;

    if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
    }

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      // Fetch submission details and history
      const [submissionResponse, historyResponse] = await Promise.all([
        DistributionService.getSubmission(submissionId),
        DistributionService.getSubmissionHistory(submissionId, 50, 0),
      ]);

      const loaderData: SubmissionLoaderData = {
        submission: submissionResponse.data,
        history: historyResponse.data,
        releaseId: releaseId!,
        org: org!,
      };

      return json(loaderData);
    } catch (error) {
      logApiError('[Submission Details Loader]', error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_SUBMISSION);
    }
  }
);

// ============================================================================
// ACTION
// ============================================================================

export const action = authenticateActionRequest({
  POST: async ({ request, params }: ActionFunctionArgs & { user: User }) => {
    const { submissionId } = params;

    if (!validateRequired(submissionId, ERROR_MESSAGES.SUBMISSION_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.SUBMISSION_ID_REQUIRED);
    }

    try {
      const formData = await request.formData();
      const actionType = formData.get('_action') as string;

      switch (actionType) {
        case 'update-rollout':
          return await handleUpdateRollout(submissionId, formData);
        
        case 'pause-rollout':
          return await handlePauseRollout(submissionId, formData);
        
        case 'resume-rollout':
          return await handleResumeRollout(submissionId);
        
        case 'halt-rollout':
          return await handleHaltRollout(submissionId, formData);
        
        case 'retry-submission':
          return await handleRetrySubmission(submissionId, formData);
        
        default:
          return createValidationError('Invalid action type');
      }
    } catch (error) {
      logApiError('[Submission Action]', error);
      return handleAxiosError(error, 'Action failed');
    }
  },
});

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubmissionDetailsPage() {
  const data = useLoaderData<SubmissionLoaderData>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const { submission, history, org, releaseId } = data;

  // Halt dialog state
  const [showHaltDialog, setShowHaltDialog] = useState(false);

  // Determine state
  const isAndroid = submission.platform === Platform.ANDROID;
  const isRejected = submission.submissionStatus === SubmissionStatus.REJECTED;
  const isReleased = submission.submissionStatus === SubmissionStatus.LIVE && submission.exposurePercent === ROLLOUT_COMPLETE_PERCENT;
  const showRolloutControls = isAndroid && 
    (submission.submissionStatus === SubmissionStatus.LIVE ||
     submission.submissionStatus === SubmissionStatus.APPROVED);

  const isLoading = fetcher.state === 'submitting';

  // Handlers
  const handleUpdateRollout = useCallback((percentage: number) => {
    const formData = new FormData();
    formData.append('_action', 'update-rollout');
    formData.append('percentage', percentage.toString());
    fetcher.submit(formData, { method: 'post' });
  }, [fetcher]);

  const handlePause = useCallback(() => {
    const formData = new FormData();
    formData.append('_action', 'pause-rollout');
    fetcher.submit(formData, { method: 'post' });
  }, [fetcher]);

  const handleResume = useCallback(() => {
    const formData = new FormData();
    formData.append('_action', 'resume-rollout');
    fetcher.submit(formData, { method: 'post' });
  }, [fetcher]);

  const handleHalt = useCallback((reason: string, severity: HaltSeverity) => {
    const formData = new FormData();
    formData.append('_action', 'halt-rollout');
    formData.append('reason', reason);
    formData.append('severity', severity);
    fetcher.submit(formData, { method: 'post' });
    setShowHaltDialog(false);
  }, [fetcher]);

  const handleRetry = useCallback(() => {
    const formData = new FormData();
    formData.append('_action', 'retry-submission');
    fetcher.submit(formData, { method: 'post' });
  }, [fetcher]);

  const handleLoadMoreHistory = useCallback(() => {
    // This would fetch more history - for now just revalidate
    revalidator.revalidate();
  }, [revalidator]);

  return (
    <Container size="xl" className="py-8">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(`/dashboard/${org}/releases/${releaseId}/distribution`)}
          >
            Back to Distribution
          </Button>
          <Title order={2} mt="md">
            {PLATFORM_LABELS[submission.platform as Platform]} Submission
          </Title>
          <Text c="dimmed" size="sm">
            Version {submission.versionName} ({submission.versionCode})
          </Text>
        </div>

        <Badge 
          color={SUBMISSION_STATUS_COLORS[submission.submissionStatus as SubmissionStatus]} 
          size="xl"
          variant="light"
        >
          {SUBMISSION_STATUS_LABELS[submission.submissionStatus as SubmissionStatus]}
        </Badge>
      </Group>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Submission Details + Rollout */}
        <div className="lg:col-span-2">
      <Stack gap="lg">
            {/* Submission Card */}
            <SubmissionCard submission={submission} />
          
            {/* Rollout Controls (Android only, if approved) */}
            {showRolloutControls && (
              <RolloutControls
                submissionId={submission.id}
                currentPercentage={submission.exposurePercent}
                status={submission.submissionStatus}
                platform={submission.platform}
                isLoading={isLoading}
                availableActions={submission.availableActions.filter(
                  (action) => action.action !== SubmissionAction.RETRY
                ) as any}
                onUpdateRollout={handleUpdateRollout}
                onPause={handlePause}
                onResume={handleResume}
                onHalt={() => setShowHaltDialog(true)}
              />
        )}

            {/* Rejection Details */}
            {isRejected && submission.rejectionReason && (
              <Card shadow="sm" padding="lg" radius="md" withBorder className="border-red-300">
                <Title order={3} mb="md" c="red.7">
              Rejection Details
            </Title>
            
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed">Reason</Text>
                    <Text fw={500}>{submission.rejectionReason}</Text>
                  </div>
              
              {submission.rejectionDetails && (
                    <>
                      {submission.rejectionDetails.guideline && (
                        <div>
                          <Text size="sm" c="dimmed">Guideline Violated</Text>
                          <Text>{submission.rejectionDetails.guideline}</Text>
                        </div>
                      )}
                      
                      {submission.rejectionDetails.description && (
                        <div>
                          <Text size="sm" c="dimmed">Description</Text>
                          <Text>{submission.rejectionDetails.description}</Text>
                        </div>
                      )}
                    </>
              )}

                  <Button 
                    color="red" 
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleRetry}
                    loading={isLoading}
                  >
                    {BUTTON_LABELS.RETRY}
              </Button>
            </Stack>
          </Card>
            )}
          </Stack>
        </div>

        {/* Right Column - History */}
        <div className="lg:col-span-1">
          <SubmissionHistoryPanel
            events={history.events}
            hasMore={history.pagination.hasMore}
            isLoadingMore={revalidator.state === 'loading'}
            onLoadMore={handleLoadMoreHistory}
          />
        </div>
      </div>

      {/* Halt Dialog */}
      <HaltRolloutDialog
        opened={showHaltDialog}
        submissionId={submission.id}
        platform={submission.platform as Platform}
        isHalting={isLoading}
        onHalt={handleHalt}
        onClose={() => setShowHaltDialog(false)}
      />
    </Container>
  );
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleUpdateRollout(submissionId: string, formData: FormData) {
  const percentageStr = formData.get('percentage') as string;
  const percentage = parseFloat(percentageStr);

  if (!isValidPercentage(percentage)) {
    return createValidationError(ERROR_MESSAGES.PERCENTAGE_REQUIRED);
  }

  try {
    const requestData = { submissionId, exposurePercent: percentage };
    const response = await DistributionService.updateRollout(submissionId, requestData);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.UPDATE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_UPDATE_ROLLOUT);
  }
}

async function handlePauseRollout(submissionId: string, formData: FormData) {
  const reason = formData.get('reason') as string;

  try {
    const requestData = { submissionId, reason };
    const response = await DistributionService.pauseRollout(submissionId, requestData);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.PAUSE_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_PAUSE_ROLLOUT);
  }
}

async function handleResumeRollout(submissionId: string) {
  try {
    const response = await DistributionService.resumeRollout(submissionId);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.RESUME_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_RESUME_ROLLOUT);
  }
}

async function handleHaltRollout(submissionId: string, formData: FormData) {
  const reason = formData.get('reason') as string;
  const severity = formData.get('severity') as HaltSeverity;

  if (!reason) {
    return createValidationError(ERROR_MESSAGES.REASON_REQUIRED);
  }

  try {
    const requestData = { submissionId, reason, severity };
    const response = await DistributionService.haltRollout(submissionId, requestData);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.HALT_ROLLOUT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_HALT_ROLLOUT);
  }
}

async function handleRetrySubmission(submissionId: string, formData: FormData) {
  const updatesRaw = formData.get('updates');
  const newBuildId = formData.get('newBuildId');

  try {
    const requestData = {
      submissionId,
      ...(updatesRaw && typeof updatesRaw === 'string' && { updates: JSON.parse(updatesRaw) }),
      ...(newBuildId && typeof newBuildId === 'string' && { newBuildId }),
    };
    const response = await DistributionService.retrySubmission(submissionId, requestData);
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.RETRY_SUBMISSION_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_RETRY_SUBMISSION);
  }
}
