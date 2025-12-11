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

import { useCallback, useEffect, useState } from 'react';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  useRevalidator,
} from '@remix-run/react';
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
import {
  IconArrowLeft,
  IconBrandAndroid,
  IconBrandApple,
  IconRefresh,
  IconRocket,
} from '@tabler/icons-react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import ReleaseService from '~/.server/services/ReleaseManagement';
import {
  HaltRolloutDialog,
  PauseRolloutDialog,
  RejectedSubmissionView,
  ReSubmissionDialog,
  ResumeRolloutDialog,
  RolloutControls,
  SubmissionHistoryPanel,
  SubmitToStoresForm,
} from '~/components/distribution';
import {
  BUTTON_LABELS,
  PLATFORM_LABELS,
  RELEASE_STATUS_COLORS,
  RELEASE_STATUS_LABELS,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '~/constants/distribution.constants';
import { ERROR_MESSAGES, LOG_CONTEXT } from '~/constants/distribution-api.constants';
import type {
  AndroidSubmitOptions,
  HaltSeverity,
  IOSSubmitOptions,
  Release,
  Submission,
  SubmissionHistoryResponse,
} from '~/types/distribution.types';
import { Platform, ReleaseStatus, SubmissionStatus } from '~/types/distribution.types';
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
    releaseStatus: ReleaseStatus;
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
        throw new Response(releaseResponse.error || 'Release not found', { status: 404 });
      }

      const release = releaseResponse.release;

      return json<LoaderData>({
        release: {
          id: release.id,
          version: release.version,
          platforms: release.platforms as Platform[],
          status: release.status as ReleaseStatus,
          releaseStatus: release.status as ReleaseStatus,
          branch: release.branch,
          targetReleaseDate: release.targetReleaseDate,
          createdAt: release.createdAt,
          updatedAt: release.updatedAt,
        },
        submissions: submissionsResponse.data.data.submissions,
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
                { intent: 'pause', submissionId: selectedSubmission.id, reason: reason || '' },
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
            isSubmitting={fetcher.state === 'submitting'}
          />

          <ReSubmissionDialog
            opened={isRetryDialogOpen}
            onClose={() => setIsRetryDialogOpen(false)}
            platform={selectedSubmission.platform}
            versionName={selectedSubmission.versionName}
            versionCode={selectedSubmission.versionCode}
            rejectionReason={selectedSubmission.rejectionReason}
            rejectionDetails={selectedSubmission.rejectionDetails}
            onSubmit={(formData) => {
              fetcher.submit(
                { intent: 'retry', submissionId: selectedSubmission.id, updates: JSON.stringify(formData) },
                { method: 'post' }
              );
              setIsRetryDialogOpen(false);
            }}
            isSubmitting={fetcher.state === 'submitting'}
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
                platform={selectedSubmission.platform}
                versionName={selectedSubmission.versionName}
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
// SUB-COMPONENTS
// ============================================================================

type PlatformTabContentProps = {
  platform: Platform;
  submission: Submission | undefined;
  onOpenSubmitDialog: () => void;
  onOpenPauseDialog: (submission: Submission) => void;
  onOpenResumeDialog: (submission: Submission) => void;
  onOpenHaltDialog: (submission: Submission) => void;
  onOpenRetryDialog: (submission: Submission) => void;
  onOpenHistoryPanel: (submission: Submission) => void;
  fetcher: ReturnType<typeof useFetcher>;
};

function PlatformTabContent(props: PlatformTabContentProps) {
  const {
    platform,
    submission,
    onOpenSubmitDialog,
    onOpenPauseDialog,
    onOpenResumeDialog,
    onOpenHaltDialog,
    onOpenRetryDialog,
    onOpenHistoryPanel,
    fetcher,
  } = props;

  const storeName = platform === Platform.ANDROID ? 'Google Play Store' : 'Apple App Store';

  // No submission yet
  if (!submission) {
    return (
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack align="center" gap="md" py="xl">
          <ThemeIcon
            size={64}
            radius="xl"
            variant="light"
            color={platform === Platform.ANDROID ? 'green' : 'blue'}
          >
            {platform === Platform.ANDROID ? (
              <IconBrandAndroid size={32} />
            ) : (
              <IconBrandApple size={32} />
            )}
          </ThemeIcon>
          <div style={{ textAlign: 'center' }}>
            <Text size="lg" fw={600} mb="xs">
              No submission yet for {PLATFORM_LABELS[platform]}
            </Text>
            <Text c="dimmed">Ready to submit this release to {storeName}</Text>
          </div>
          <Button
            leftSection={<IconRocket size={16} />}
            onClick={onOpenSubmitDialog}
            size="md"
            mt="md"
          >
            Submit to {storeName}
          </Button>
        </Stack>
      </Card>
    );
  }

  // Has submission - show full management
  return (
    <Stack gap="lg">
      {/* Submission Status Card */}
      <SubmissionManagementCard
        submission={submission}
        onPause={() => onOpenPauseDialog(submission)}
        onResume={() => onOpenResumeDialog(submission)}
        onHalt={() => onOpenHaltDialog(submission)}
        onRetry={() => onOpenRetryDialog(submission)}
        onViewHistory={() => onOpenHistoryPanel(submission)}
      />

      {/* Rollout Controls (if applicable) */}
      {(submission.submissionStatus === SubmissionStatus.APPROVED ||
        (submission.submissionStatus === SubmissionStatus.LIVE &&
          submission.exposurePercent < 100)) &&
        platform === Platform.ANDROID && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Rollout Controls
            </Title>
            <RolloutControls
              submissionId={submission.id}
              platform={submission.platform}
              currentPercentage={submission.exposurePercent}
              onUpdatePercentage={(percentage) => {
                fetcher.submit(
                  { intent: 'updateRollout', submissionId: submission.id, percentage: String(percentage) },
                  { method: 'post' }
                );
              }}
              onPause={() => onOpenPauseDialog(submission)}
              onHalt={() => onOpenHaltDialog(submission)}
              isLoading={false}
            />
          </Card>
        )}

      {/* Rejected View */}
      {submission.submissionStatus === SubmissionStatus.REJECTED && submission.rejectionReason && (
        <RejectedSubmissionView
          platform={submission.platform}
          submissionId={submission.id}
          versionName={submission.versionName}
          rejectionReason={submission.rejectionReason}
          rejectionDetails={submission.rejectionDetails}
          onFixMetadata={() => onOpenRetryDialog(submission)}
          onUploadNewBuild={() => onOpenRetryDialog(submission)}
        />
      )}
    </Stack>
  );
}

// ============================================================================
// SUBMISSION MANAGEMENT CARD (Full Actions)
// ============================================================================

type SubmissionManagementCardProps = {
  submission: Submission;
  onPause: () => void;
  onResume: () => void;
  onHalt: () => void;
  onRetry: () => void;
  onViewHistory: () => void;
};

function SubmissionManagementCard(props: SubmissionManagementCardProps) {
  const { submission, onPause, onResume, onHalt, onRetry, onViewHistory } = props;

  const isPaused = submission.submissionStatus === SubmissionStatus.LIVE && submission.exposurePercent === 0;
  const isRejected = submission.submissionStatus === SubmissionStatus.REJECTED;
  const isInReview = submission.submissionStatus === SubmissionStatus.IN_REVIEW;
  const isComplete = submission.submissionStatus === SubmissionStatus.LIVE && submission.exposurePercent === 100;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Group gap="sm" mb="xs">
              <Text fw={600} size="lg">
                {submission.versionName} ({submission.versionCode})
              </Text>
              <Badge
                color={SUBMISSION_STATUS_COLORS[submission.submissionStatus]}
                variant="light"
                size="lg"
              >
                {SUBMISSION_STATUS_LABELS[submission.submissionStatus]}
              </Badge>
            </Group>
            {submission.track && (
              <Text size="sm" c="dimmed">
                Track: {submission.track}
              </Text>
            )}
          </div>
        </Group>

        {/* Timeline */}
        {submission.submittedAt && (
          <Group gap="lg">
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Submitted:
              </Text>
              <Text size="sm">{new Date(submission.submittedAt).toLocaleString()}</Text>
            </Group>
            {submission.approvedAt && (
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Approved:
                </Text>
                <Text size="sm">{new Date(submission.approvedAt).toLocaleString()}</Text>
              </Group>
            )}
          </Group>
        )}

        {/* Action Buttons */}
        <Group gap="sm" mt="md">
          {isRejected && (
            <Button onClick={onRetry} color="blue">
              Fix & Re-Submit
            </Button>
          )}

          {!isInReview && !isRejected && !isComplete && (
            <>
              {isPaused ? (
                <Button onClick={onResume} color="green">
                  Resume Rollout
                </Button>
              ) : (
                <Button onClick={onPause} variant="light">
                  Pause Rollout
                </Button>
              )}
            </>
          )}

          {!isComplete && (
            <Button onClick={onHalt} color="red" variant="light">
              Emergency Halt
            </Button>
          )}

          <Button onClick={onViewHistory} variant="subtle">
            View History
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

