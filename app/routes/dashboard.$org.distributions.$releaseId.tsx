/**
 * Distribution Management Page - Full Management Capabilities
 * 
 * Route: /dashboard/:org/distributions/:releaseId
 * 
 * Purpose: Complete distribution management for a specific release
 * - Platform tabs (Android/iOS separate management)
 * - Full rollout controls per platform
 * - All management actions (pause, resume, halt, retry)
 * - Submission history
 * - Can submit additional platforms
 * 
 * Different from Release Page Distribution Tab (which is read-only monitoring)
 */

import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Container,
  Group,
  Modal,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from '@remix-run/react';
import {
  IconBrandAndroid,
  IconBrandApple,
  IconRefresh
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import ReleaseService from '~/.server/services/ReleaseManagement';
import {
  HaltRolloutDialog,
  PauseRolloutDialog,
  ReSubmissionDialog,
  ResumeRolloutDialog,
  SubmissionHistoryPanel,
  SubmitToStoresForm
} from '~/components/distribution';
import { ERROR_MESSAGES, LOG_CONTEXT } from '~/constants/distribution-api.constants';
import {
  PLATFORM_LABELS,
  RELEASE_STATUS_COLORS,
  RELEASE_STATUS_LABELS,
  ROLLOUT_COMPLETE_PERCENT,
  SUBMISSION_STATUS_COLORS
} from '~/constants/distribution.constants';
import type {
  AndroidSubmitOptions,
  HaltSeverity,
  IOSSubmitOptions,
  Release,
  Submission,
  SubmissionHistoryResponse,
} from '~/types/distribution.types';
import { DistributionReleaseStatus, Platform, SubmissionStatus } from '~/types/distribution.types';
import {
  createValidationError,
  handleAxiosError,
  logApiError,
  validateRequired,
} from '~/utils/api-route-helpers';
import { authenticateActionRequest, authenticateLoaderRequest } from '~/utils/authenticate';

// ============================================================================
// TYPES
// ============================================================================

type LoaderData = {
  release: Release & {
    releaseStatus: DistributionReleaseStatus;
    branch: string;
    targetReleaseDate?: string;
  };
  submissions: Submission[];
  org: string;
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isValidHaltSeverity(value: string): value is HaltSeverity {
  return ['CRITICAL', 'HIGH', 'MEDIUM'].includes(value);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Derive distribution status from submissions
 * 
 * @param submissions - List of submissions
 * @returns Distribution release status
 * 
 * Logic:
 * - COMPLETED: All submissions are LIVE with 100% exposure
 * - READY_FOR_SUBMISSION: Has submissions (actively distributing)
 * - PRE_RELEASE: No submissions yet
 */
function getDistributionStatus(submissions: Submission[]): DistributionReleaseStatus {
  // No submissions yet
  if (submissions.length === 0) {
    return DistributionReleaseStatus.PRE_RELEASE;
  }
  
  // Check if all submissions are fully rolled out
  const allCompleted = submissions.every(
    s => s.submissionStatus === SubmissionStatus.LIVE && s.exposurePercent === ROLLOUT_COMPLETE_PERCENT
  );
  
  if (allCompleted) {
    return DistributionReleaseStatus.COMPLETED;
  }
  
  // Has submissions but not all completed = actively distributing
  return DistributionReleaseStatus.READY_FOR_SUBMISSION;
}

// ============================================================================
// LOADER
// ============================================================================

export const loader = authenticateLoaderRequest(
  async ({ params, user }: LoaderFunctionArgs & { user: User }): Promise<ReturnType<typeof json<LoaderData>>> => {
    const { releaseId, org } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      throw new Response(ERROR_MESSAGES.RELEASE_ID_REQUIRED, { status: 400 });
    }

    if (!validateRequired(org, 'Organization is required')) {
      throw new Response('Organization is required', { status: 400 });
    }

    try {
      // Fetch release info and submissions
      const [releaseResponse, submissionsResponse] = await Promise.all([
        ReleaseService.getReleaseById(releaseId, org, user.user.id),
        DistributionService.getSubmissions(releaseId),
      ]);

      if (!releaseResponse.success || !releaseResponse.release) {
        throw new Response(releaseResponse.error ?? 'Release not found', { status: 404 });
      }

      const release = releaseResponse.release;

      // Extract platforms from platformTargetMappings
      const platforms = Array.from(new Set(
        release.platformTargetMappings?.map((pt: { platform: string }) => pt.platform as Platform) ?? []
      ));

      // Extract submissions
      const submissions = submissionsResponse.data.data.submissions;
      
      // Determine distribution status based on submissions
      // TODO: Backend should provide this status in the release object
      const distributionStatus = getDistributionStatus(submissions);

      return json<LoaderData>({
        release: {
          id: release.id,
          version: release.releaseId, // Use releaseId as version
          platforms,
          status: distributionStatus,
          releaseStatus: distributionStatus,
          branch: release.branch ?? '',
          ...(release.targetReleaseDate && { targetReleaseDate: release.targetReleaseDate }),
          createdAt: release.createdAt ?? new Date().toISOString(),
          updatedAt: release.updatedAt ?? new Date().toISOString(),
        },
        submissions,
        org,
      });
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_MANAGEMENT_LOADER, error);
      return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_FETCH_DISTRIBUTION);
    }
  }
);

// ============================================================================
// ACTION
// ============================================================================

export const action = authenticateActionRequest({
  POST: async ({ request, params }: ActionFunctionArgs & { user: User }) => {
    const { releaseId } = params;
    const formData = await request.formData();
    const intent = formData.get('intent');

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    try {
      switch (intent) {
        case 'submit': {
          // Handle submission to stores
          const platforms = JSON.parse(formData.get('platforms') as string);
          const androidRaw = formData.get('android');
          const iosRaw = formData.get('ios');

          const response = await DistributionService.submitToStores(releaseId, {
            releaseId,
            platforms,
            ...(androidRaw && typeof androidRaw === 'string' && { android: JSON.parse(androidRaw) as AndroidSubmitOptions }),
            ...(iosRaw && typeof iosRaw === 'string' && { ios: JSON.parse(iosRaw) as IOSSubmitOptions }),
          });

          return json({ success: true, data: response.data });
        }

        case 'pause': {
          const submissionId = formData.get('submissionId') as string;
          const reason = formData.get('reason') as string;

          await DistributionService.pauseRollout(submissionId, {
            submissionId,
            reason,
          });
          return json({ success: true });
        }

        case 'resume': {
          const submissionId = formData.get('submissionId') as string;

          await DistributionService.resumeRollout(submissionId);
          return json({ success: true });
        }

        case 'halt': {
          const submissionId = formData.get('submissionId') as string;
          const reason = formData.get('reason') as string;
          const severity = formData.get('severity') as string;

          if (!isValidHaltSeverity(severity)) {
            return createValidationError('Invalid halt severity');
          }

          await DistributionService.haltRollout(submissionId, {
            submissionId,
            reason,
            severity,
          });
          return json({ success: true });
        }

        case 'retry': {
          const submissionId = formData.get('submissionId') as string;
          const updatesRaw = formData.get('updates');

          await DistributionService.retrySubmission(
            submissionId,
            updatesRaw && typeof updatesRaw === 'string' ? JSON.parse(updatesRaw) : {}
          );
          return json({ success: true });
        }

        case 'updateRollout': {
          const submissionId = formData.get('submissionId') as string;
          const percentage = parseInt(formData.get('percentage') as string, 10);

          await DistributionService.updateRollout(submissionId, {
            submissionId,
            exposurePercent: percentage,
          });
          return json({ success: true });
        }

        default:
          return json({ error: 'Invalid intent' }, { status: 400 });
      }
    } catch (error) {
      logApiError(LOG_CONTEXT.DISTRIBUTION_MANAGEMENT_ACTION, error);
      return handleAxiosError(error, ERROR_MESSAGES.ACTION_FAILED);
    }
  },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DistributionManagementPage() {
  const data = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const fetcher = useFetcher();

  const [activeTab, setActiveTab] = useState<string>(
    data.release.platforms.includes(Platform.ANDROID) ? 'android' : 'ios'
  );
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isHaltDialogOpen, setIsHaltDialogOpen] = useState(false);
  const [isRetryDialogOpen, setIsRetryDialogOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | undefined>();
  const [historyData, setHistoryData] = useState<SubmissionHistoryResponse['data'] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Get submissions by platform
  const androidSubmissions = data.submissions.filter((s) => s.platform === Platform.ANDROID);
  const iosSubmissions = data.submissions.filter((s) => s.platform === Platform.IOS);

  const androidSubmission = androidSubmissions[0];
  const iosSubmission = iosSubmissions[0];

  // Determine available platforms (platforms configured but not yet submitted)
  const availablePlatforms = data.release.platforms.filter((platform) => {
    return !data.submissions.some((s) => s.platform === platform);
  });

  // Handlers
  const handleRefresh = useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

  const handleOpenSubmitDialog = useCallback(() => {
    setIsSubmitDialogOpen(true);
  }, []);

  const handleCloseSubmitDialog = useCallback(() => {
    setIsSubmitDialogOpen(false);
  }, []);

  const handleSubmitComplete = useCallback(() => {
    setIsSubmitDialogOpen(false);
    revalidator.revalidate();
  }, [revalidator]);

  const handleOpenPauseDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsPauseDialogOpen(true);
  }, []);

  const handleOpenResumeDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsResumeDialogOpen(true);
  }, []);

  const handleOpenHaltDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsHaltDialogOpen(true);
  }, []);

  const handleOpenRetryDialog = useCallback((submission: Submission) => {
    setSelectedSubmission(submission);
    setIsRetryDialogOpen(true);
  }, []);

  const handleOpenHistoryPanel = useCallback(async (submission: Submission) => {
    setSelectedSubmission(submission);
    setIsHistoryPanelOpen(true);
    setIsLoadingHistory(true);
    setHistoryData(null);

    try {
      const response = await DistributionService.getSubmissionHistory(submission.id);
      setHistoryData(response.data);
    } catch (error) {
      console.error('Failed to fetch submission history:', error);
      setHistoryData({ submissionId: submission.id, events: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } });
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Auto-refresh every 10 seconds if there are active submissions
  useEffect(() => {
    const hasActiveSubmissions = data.submissions.some(
      (s) => s.submissionStatus === SubmissionStatus.IN_REVIEW
    );

    if (hasActiveSubmissions) {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [data.submissions, revalidator]);

  return (
    <Container size="xl" py="xl">
      {/* Breadcrumbs */}
      <Breadcrumbs mb="lg">
        <Link to={`/dashboard/${data.org}/distributions`} className="text-blue-600 hover:underline">
          Distributions
        </Link>
        <Text>{data.release.version}</Text>
      </Breadcrumbs>

      {/* Header */}
      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <Group justify="space-between" mb="md">
          <div>
            <Group gap="sm" mb="xs">
              <Title order={2}>Distribution Management</Title>
              <Badge color={RELEASE_STATUS_COLORS[data.release.releaseStatus]} variant="light" size="lg">
                {RELEASE_STATUS_LABELS[data.release.releaseStatus]}
              </Badge>
            </Group>
            <Group gap="md">
              <Text size="lg" fw={600}>
                {data.release.version}
              </Text>
              <Text c="dimmed">|</Text>
              <Text c="dimmed">{data.release.branch}</Text>
            </Group>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={handleRefresh}
            loading={revalidator.state === 'loading'}
          >
            Refresh
          </Button>
        </Group>

        <Group gap="xl">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Platforms:
            </Text>
            <Group gap="xs">
              {data.release.platforms.map((platform) => (
                <Badge key={platform} variant="outline" size="sm">
                  {PLATFORM_LABELS[platform]}
                </Badge>
              ))}
            </Group>
          </Group>

          {data.release.targetReleaseDate && (
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Target:
              </Text>
              <Text size="sm">
                {new Date(data.release.targetReleaseDate).toLocaleDateString()}
              </Text>
            </Group>
          )}
        </Group>
      </Card>

      {/* Platform Tabs */}
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value ?? 'android')}>
        <Tabs.List mb="lg">
          {data.release.platforms.includes(Platform.ANDROID) && (
            <Tabs.Tab
              value="android"
              leftSection={
                <ThemeIcon size="sm" variant="light" color="green" radius="xl">
                  <IconBrandAndroid size={14} />
                </ThemeIcon>
              }
              rightSection={
                androidSubmission && (
                  <Badge
                    size="xs"
                    color={SUBMISSION_STATUS_COLORS[androidSubmission.submissionStatus]}
                    variant="light"
                  >
                    {androidSubmission.exposurePercent}%
                  </Badge>
                )
              }
            >
              Android
            </Tabs.Tab>
          )}

          {data.release.platforms.includes(Platform.IOS) && (
            <Tabs.Tab
              value="ios"
              leftSection={
                <ThemeIcon size="sm" variant="light" color="blue" radius="xl">
                  <IconBrandApple size={14} />
                </ThemeIcon>
              }
              rightSection={
                iosSubmission && (
                  <Badge
                    size="xs"
                    color={SUBMISSION_STATUS_COLORS[iosSubmission.submissionStatus]}
                    variant="light"
                  >
                    {iosSubmission.exposurePercent}%
                  </Badge>
                )
              }
            >
              iOS
            </Tabs.Tab>
          )}
        </Tabs.List>

        {/* Android Tab Content */}
        {data.release.platforms.includes(Platform.ANDROID) && (
          <Tabs.Panel value="android">
            <PlatformTabContent
              platform={Platform.ANDROID}
              submission={androidSubmission}
              onOpenSubmitDialog={handleOpenSubmitDialog}
              onOpenPauseDialog={handleOpenPauseDialog}
              onOpenResumeDialog={handleOpenResumeDialog}
              onOpenHaltDialog={handleOpenHaltDialog}
              onOpenRetryDialog={handleOpenRetryDialog}
              onOpenHistoryPanel={handleOpenHistoryPanel}
              fetcher={fetcher}
            />
          </Tabs.Panel>
        )}

        {/* iOS Tab Content */}
        {data.release.platforms.includes(Platform.IOS) && (
          <Tabs.Panel value="ios">
            <PlatformTabContent
              platform={Platform.IOS}
              submission={iosSubmission}
              onOpenSubmitDialog={handleOpenSubmitDialog}
              onOpenPauseDialog={handleOpenPauseDialog}
              onOpenResumeDialog={handleOpenResumeDialog}
              onOpenHaltDialog={handleOpenHaltDialog}
              onOpenRetryDialog={handleOpenRetryDialog}
              onOpenHistoryPanel={handleOpenHistoryPanel}
              fetcher={fetcher}
            />
          </Tabs.Panel>
        )}
      </Tabs>

      {/* Dialogs */}
      <Modal
        opened={isSubmitDialogOpen}
        onClose={handleCloseSubmitDialog}
        title="Submit to Stores"
        size="lg"
        centered
      >
        <SubmitToStoresForm
          releaseId={data.release.id}
          availablePlatforms={availablePlatforms}
          hasAndroidActiveRollout={false}
          onSubmitComplete={handleSubmitComplete}
          onClose={handleCloseSubmitDialog}
        />
      </Modal>

      {selectedSubmission && (
        <>
          <PauseRolloutDialog
            opened={isPauseDialogOpen}
            onClose={() => setIsPauseDialogOpen(false)}
            platform={selectedSubmission.platform}
            currentPercentage={selectedSubmission.exposurePercent}
            onConfirm={(reason) => {
              fetcher.submit(
                { intent: 'pause', submissionId: selectedSubmission.id, reason: reason ?? '' },
                { method: 'post' }
              );
              setIsPauseDialogOpen(false);
            }}
            isLoading={fetcher.state === 'submitting'}
          />

          <ResumeRolloutDialog
            opened={isResumeDialogOpen}
            onClose={() => setIsResumeDialogOpen(false)}
            platform={selectedSubmission.platform}
            currentPercentage={selectedSubmission.exposurePercent}
            onConfirm={() => {
              fetcher.submit(
                { intent: 'resume', submissionId: selectedSubmission.id },
                { method: 'post' }
              );
              setIsResumeDialogOpen(false);
            }}
            isLoading={fetcher.state === 'submitting'}
          />

          <HaltRolloutDialog
            opened={isHaltDialogOpen}
            onClose={() => setIsHaltDialogOpen(false)}
            submissionId={selectedSubmission.id}
            platform={selectedSubmission.platform}
            onHalt={(reason, severity) => {
              fetcher.submit(
                { intent: 'halt', submissionId: selectedSubmission.id, reason, severity },
                { method: 'post' }
              );
              setIsHaltDialogOpen(false);
            }}
            isHalting={fetcher.state === 'submitting'}
          />

          <ReSubmissionDialog
            opened={isRetryDialogOpen}
            onClose={() => setIsRetryDialogOpen(false)}
            platform={selectedSubmission.platform}
            submissionId={selectedSubmission.id}
            currentValues={{
              releaseNotes: selectedSubmission.releaseNotes ?? '',
            }}
            onSubmit={(formData) => {
              fetcher.submit(
                { intent: 'retry', submissionId: selectedSubmission.id, updates: JSON.stringify(formData) },
                { method: 'post' }
              );
              setIsRetryDialogOpen(false);
            }}
            isLoading={fetcher.state === 'submitting'}
          />

          <Modal
            opened={isHistoryPanelOpen}
            onClose={() => setIsHistoryPanelOpen(false)}
            title="Submission History"
            size="lg"
            centered
          >
            {isLoadingHistory ? (
              <Stack align="center" py="xl">
                <Text c="dimmed">Loading history...</Text>
              </Stack>
            ) : historyData ? (
              <SubmissionHistoryPanel
                events={historyData.events}
                hasMore={historyData.pagination.hasMore}
                isLoadingMore={false}
                onLoadMore={() => {
                  // TODO: Implement pagination if needed
                  console.log('Load more history');
                }}
              />
            ) : (
              <Stack align="center" py="xl">
                <Text c="dimmed">Failed to load history</Text>
              </Stack>
            )}
          </Modal>
        </>
      )}
    </Container>
  );
}

// ============================================================================
// SUB-COMPONENTS - Imported from _components folder
// ============================================================================

import { PlatformTabContent } from './_components/PlatformTabContent';

