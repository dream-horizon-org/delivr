/**
 * Distribution Module - Main Page
 * Handles both Pre-Release (Stage 3) and Distribution (Stage 4) stages
 * 
 * Route: /dashboard/:org/releases/:releaseId/distribution
 */

import { Badge, Button, Card, Container, Group, Modal, Stack, Tabs, Text, Title } from '@mantine/core';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useNavigate, useRevalidator, useSearchParams } from '@remix-run/react';
import { IconCheck, IconExternalLink, IconRocket } from '@tabler/icons-react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
  BuildStatusCard,
  DistributionStatusPanel,
  ExtraCommitsWarning,
  ManualApprovalDialog,
  PMApprovalStatus,
  ReleaseCompleteView,
  SubmissionStatusCard,
  SubmitToStoresForm,
  UploadAABForm,
  VerifyTestFlightForm,
} from '~/components/distribution';
import { ERROR_MESSAGES, LOG_CONTEXT } from '~/constants/distribution-api.constants';
import {
  BUTTON_LABELS,
  DIALOG_TITLES,
  RELEASE_STATUS_COLORS,
  RELEASE_STATUS_LABELS,
} from '~/constants/distribution.constants';
import { useDistribution } from '~/hooks/useDistribution';
import { usePreRelease } from '~/hooks/usePreRelease';
import type {
  AndroidSubmitOptions,
  BuildsResponse,
  DistributionStatusResponse,
  ExtraCommitsResponse,
  IOSSubmitOptions,
  PMStatusResponse,
  SubmissionsResponse,
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
  releaseId: string;
  org: string;
  builds: BuildsResponse;
  pmStatus: PMStatusResponse;
  extraCommits: ExtraCommitsResponse;
  distributionStatus: DistributionStatusResponse;
  submissions: SubmissionsResponse;
};

// ============================================================================
// LOADER
// ============================================================================

export const loader = authenticateLoaderRequest(
  async ({ params }: LoaderFunctionArgs & { user: User }): Promise<ReturnType<typeof json<LoaderData>>> => {
    const { releaseId, org } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      throw new Response(ERROR_MESSAGES.RELEASE_ID_REQUIRED, { status: 400 });
    }

    if (!validateRequired(org, 'Organization is required')) {
      throw new Response('Organization is required', { status: 400 });
    }

    try {
      const [builds, pmStatus, extraCommits, distributionStatus, submissions] = await Promise.all([
        DistributionService.getBuilds(releaseId),
        DistributionService.getPMStatus(releaseId),
        DistributionService.checkExtraCommits(releaseId),
        DistributionService.getDistributionStatus(releaseId),
        DistributionService.getSubmissions(releaseId),
      ]);

      return json<LoaderData>({
        releaseId,
        org,
        builds: builds.data,
        pmStatus: pmStatus.data,
        extraCommits: extraCommits.data,
        distributionStatus: distributionStatus.data,
        submissions: submissions.data,
      });
    } catch (error) {
      logApiError('[Distribution Page Loader]', error);
      throw handleAxiosError(error, 'Failed to load distribution data');
    }
  }
);

// ============================================================================
// ACTION
// ============================================================================

export const action = authenticateActionRequest({
  POST: async ({ request, params }: ActionFunctionArgs & { user: User }) => {
    const { releaseId } = params;

    if (!validateRequired(releaseId, ERROR_MESSAGES.RELEASE_ID_REQUIRED)) {
      return createValidationError(ERROR_MESSAGES.RELEASE_ID_REQUIRED);
    }

    const formData = await request.formData();
    const actionType = formData.get('_action');

    if (typeof actionType !== 'string') {
      return createValidationError('Action type is required');
    }

    switch (actionType) {
      case 'upload-aab':
        return handleUploadAAB(releaseId, formData);
      case 'verify-testflight':
        return handleVerifyTestFlight(releaseId, formData);
      // NOTE: No 'retry-build' action - CICD builds are auto-triggered
      // If CI build fails, user retries via their CI system directly
      case 'approve-release':
        return handleApproveRelease(releaseId, formData);
      case 'submit-to-stores':
        return handleSubmitToStores(releaseId, formData);
      default:
        return createValidationError('Invalid action type');
    }
  },
});

// ============================================================================
// ACTION HANDLERS (minimal boundary validation, backend validates deeply)
// ============================================================================

async function handleUploadAAB(releaseId: string, formData: FormData) {
  const file = formData.get('file');
  
  if (!(file instanceof File)) {
    return createValidationError(ERROR_MESSAGES.FILE_REQUIRED);
  }

  try {
    // Convert File to Blob for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const response = await DistributionService.uploadAAB(releaseId, blob, {});
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.UPLOAD_AAB_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_UPLOAD_AAB);
  }
}

async function handleVerifyTestFlight(releaseId: string, formData: FormData) {
  const testflightBuildNumber = formData.get('testflightBuildNumber');
  const versionName = formData.get('versionName');

  // Boundary validation - FormData returns unknown
  if (typeof testflightBuildNumber !== 'string' || !testflightBuildNumber) {
    return createValidationError(ERROR_MESSAGES.TESTFLIGHT_BUILD_NUMBER_REQUIRED);
  }
  if (typeof versionName !== 'string' || !versionName) {
    return createValidationError(ERROR_MESSAGES.VERSION_NAME_REQUIRED);
  }

  try {
    const response = await DistributionService.verifyTestFlight(releaseId, {
      releaseId,
      testflightBuildNumber,
      versionName,
    });
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.VERIFY_TESTFLIGHT_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_VERIFY_TESTFLIGHT);
  }
}

// NOTE: No handleRetryBuild() - CICD builds are auto-triggered by Release Orchestrator
// If a CI build fails, user retries via their CI system (Jenkins, GitHub Actions, etc.)

async function handleApproveRelease(releaseId: string, formData: FormData) {
  const comments = formData.get('comments');

  try {
    const response = await DistributionService.manualApprove(releaseId, {
      releaseId,
      ...(typeof comments === 'string' && { approverComments: comments }),
    });
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.MANUAL_APPROVE_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_APPROVE_RELEASE);
  }
}

async function handleSubmitToStores(releaseId: string, formData: FormData) {
  const platformsRaw = formData.get('platforms');

  // Boundary validation - must have platforms string
  if (typeof platformsRaw !== 'string') {
    return createValidationError(ERROR_MESSAGES.PLATFORMS_REQUIRED);
  }

  // Parse JSON from our own form - backend validates structure
  const platforms = JSON.parse(platformsRaw) as Platform[];
  const androidRaw = formData.get('android');
  const iosRaw = formData.get('ios');

  try {
    const response = await DistributionService.submitToStores(releaseId, {
      releaseId,
      platforms,
      ...(androidRaw && typeof androidRaw === 'string' && { android: JSON.parse(androidRaw) as AndroidSubmitOptions }),
      ...(iosRaw && typeof iosRaw === 'string' && { ios: JSON.parse(iosRaw) as IOSSubmitOptions }),
    });
    return json(response.data);
  } catch (error) {
    logApiError(LOG_CONTEXT.SUBMIT_TO_STORES_API, error);
    return handleAxiosError(error, ERROR_MESSAGES.FAILED_TO_SUBMIT_TO_STORES);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DistributionPage() {
  const data = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const approveFetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read tab from URL query parameter (e.g., ?tab=pre-release or ?tab=distribution)
  const tabFromUrl = searchParams.get('tab');

  const preRelease = usePreRelease({
    builds: data.builds.data.builds,
    summary: data.builds.data.summary,
    pmStatus: data.pmStatus.data,
    extraCommits: data.extraCommits.data,
  });

  const distribution = useDistribution({
    distributionStatus: data.distributionStatus.data,
    submissions: data.submissions.data.submissions,
  });

  const currentStatus = data.distributionStatus.data.releaseStatus;
  const isPreRelease = currentStatus === ReleaseStatus.PRE_RELEASE;

  // Determine which tab to show:
  // 1. If URL has ?tab=distribution and we're past pre-release, show distribution
  // 2. If URL has ?tab=pre-release, show pre-release
  // 3. Default: show pre-release if in PRE_RELEASE status, else distribution
  const validTabs = ['pre-release', 'distribution'] as const;
  const defaultTab = isPreRelease ? 'pre-release' : 'distribution';
  const activeTab = tabFromUrl && validTabs.includes(tabFromUrl as typeof validTabs[number])
    ? (tabFromUrl as typeof validTabs[number])
    : defaultTab;

  // Handle tab change - update URL
  const handleTabChange = (value: string | null) => {
    if (value) {
      setSearchParams({ tab: value });
    }
  };

  const handleApprove = (comments?: string) => {
    const formData = new FormData();
    formData.append('_action', 'approve-release');
    if (comments) formData.append('comments', comments);
    approveFetcher.submit(formData, { method: 'post' });
    preRelease.closeApprovalDialog();
  };

  const handleUploadComplete = () => {
    preRelease.closeUploadDialog();
    revalidator.revalidate();
  };

  const handleVerifyComplete = () => {
    preRelease.closeVerifyDialog();
    revalidator.revalidate();
  };

  const handleSubmitComplete = () => {
    distribution.closeSubmitDialog();
    revalidator.revalidate();
  };

  const handleViewSubmission = (submissionId: string) => {
    navigate(`/dashboard/${data.org}/releases/${data.releaseId}/submissions/${submissionId}`);
  };

  // Derived state: Check if Android has an active rollout (0-100%)
  const hasAndroidActiveRollout = 
    data.distributionStatus.data.platforms.android?.submitted === true &&
    data.distributionStatus.data.platforms.android?.exposurePercent > 0 &&
    data.distributionStatus.data.platforms.android?.exposurePercent < 100;

  return (
    <Container size="xl" className="py-8">
      <PageHeader releaseId={data.releaseId} currentStatus={currentStatus} />

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List mb="xl">
          <Tabs.Tab 
            value="pre-release"
            leftSection={isPreRelease ? null : <IconCheck size={14} />}
          >
            Pre-Release
          </Tabs.Tab>
          <Tabs.Tab 
            value="distribution" 
            disabled={isPreRelease}
            leftSection={<IconRocket size={14} />}
          >
            Distribution
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pre-release">
          <PreReleaseTab
            preRelease={preRelease}
            extraCommitsData={data.extraCommits.data}
            pmStatusData={data.pmStatus.data}
            approveFetcherState={approveFetcher.state}
            onOpenSubmitDialog={distribution.openSubmitDialog}
          />
        </Tabs.Panel>

        <Tabs.Panel value="distribution">
          <DistributionTab
            distribution={distribution}
            distributionStatusData={data.distributionStatus.data}
            org={data.org}
            releaseId={data.releaseId}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Dialogs */}
      <Modal
        opened={preRelease.showUploadDialog}
        onClose={preRelease.closeUploadDialog}
        title={DIALOG_TITLES.UPLOAD_AAB}
        size="lg"
        centered
      >
        <UploadAABForm
          releaseId={data.releaseId}
          onUploadComplete={handleUploadComplete}
          onClose={preRelease.closeUploadDialog}
        />
      </Modal>

      <Modal
        opened={preRelease.showVerifyDialog}
        onClose={preRelease.closeVerifyDialog}
        title={DIALOG_TITLES.VERIFY_TESTFLIGHT}
        size="lg"
        centered
      >
        <VerifyTestFlightForm
          releaseId={data.releaseId}
          onVerifyComplete={handleVerifyComplete}
          onClose={preRelease.closeVerifyDialog}
        />
      </Modal>

      <ManualApprovalDialog
        opened={preRelease.showApprovalDialog}
        releaseId={data.releaseId}
        approverRole={preRelease.approverRole}
        isApproving={approveFetcher.state === 'submitting'}
        onApprove={handleApprove}
        onClose={preRelease.closeApprovalDialog}
      />

      <Modal
        opened={distribution.showSubmitDialog}
        onClose={distribution.closeSubmitDialog}
        title={DIALOG_TITLES.SUBMIT_TO_STORES}
        size="lg"
        centered
      >
        <SubmitToStoresForm
          releaseId={data.releaseId}
          availablePlatforms={distribution.availablePlatforms}
          hasAndroidActiveRollout={hasAndroidActiveRollout}
          onSubmitComplete={handleSubmitComplete}
          onClose={distribution.closeSubmitDialog}
        />
      </Modal>
    </Container>
  );
}

// ============================================================================
// SUB-COMPONENTS (extracted, not inline)
// ============================================================================

type PageHeaderProps = {
  releaseId: string;
  currentStatus: ReleaseStatus;
};

function PageHeader({ releaseId, currentStatus }: PageHeaderProps) {
  return (
    <Group justify="space-between" mb="xl">
      <div>
        <Title order={1}>Distribution</Title>
        <Text c="dimmed" mt="xs">Release {releaseId}</Text>
      </div>
      <Badge color={RELEASE_STATUS_COLORS[currentStatus]} variant="light" size="xl">
        {RELEASE_STATUS_LABELS[currentStatus]}
      </Badge>
    </Group>
  );
}

type PreReleaseTabProps = {
  preRelease: ReturnType<typeof usePreRelease>;
  extraCommitsData: ExtraCommitsResponse['data'];
  pmStatusData: PMStatusResponse['data'];
  approveFetcherState: string;
  onOpenSubmitDialog: () => void;
};

function PreReleaseTab({
  preRelease,
  extraCommitsData,
  pmStatusData,
  approveFetcherState,
  onOpenSubmitDialog,
}: PreReleaseTabProps) {
  return (
    <Stack gap="lg">
      {preRelease.hasExtraCommits && (
        <ExtraCommitsWarning
          extraCommits={extraCommitsData}
          canDismiss
          onProceed={preRelease.acknowledgeExtraCommits}
        />
      )}

      <div>
        <Title order={3} mb="md">Build Status</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BuildStatusCard
            platform={Platform.ANDROID}
            build={preRelease.androidBuild}
            buildStrategy={preRelease.buildStrategy}
            onUploadRequested={preRelease.openUploadDialog}
          />
          <BuildStatusCard
            platform={Platform.IOS}
            build={preRelease.iosBuild}
            buildStrategy={preRelease.buildStrategy}
            onVerifyRequested={preRelease.openVerifyDialog}
          />
        </div>
      </div>

      <div>
        <Title order={3} mb="md">Approval</Title>
        <PMApprovalStatus
          pmStatus={pmStatusData}
          isApproving={approveFetcherState === 'submitting'}
          onApproveRequested={preRelease.openApprovalDialog}
        />
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between">
          <div>
            <Text fw={600}>Ready for Distribution?</Text>
            <Text size="sm" c="dimmed">
              {preRelease.canPromote 
                ? 'All requirements met. You can proceed to store submission.'
                : preRelease.promotionBlockedReason}
            </Text>
          </div>
          <Button
            size="lg"
            disabled={!preRelease.canPromote}
            leftSection={<IconRocket size={18} />}
            onClick={onOpenSubmitDialog}
          >
            {BUTTON_LABELS.PROMOTE_TO_DISTRIBUTION}
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}

type DistributionTabProps = {
  distribution: ReturnType<typeof useDistribution>;
  distributionStatusData: DistributionStatusResponse['data'];
  org: string;
  releaseId: string;
};

function DistributionTab({
  distribution,
  distributionStatusData,
  org,
  releaseId,
}: DistributionTabProps) {
  return (
    <Stack gap="lg">
      <DistributionStatusPanel status={distributionStatusData} />

      {/* Open in Distribution Management Button */}
      {distribution.hasSubmissions && (
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text fw={600} size="sm">
                Need to manage rollout or retry submissions?
              </Text>
              <Text size="xs" c="dimmed">
                Access full distribution management with rollout controls, pause/resume, and more.
              </Text>
            </div>
            <Button
              component={Link}
              to={`/dashboard/${org}/distributions/${releaseId}`}
              variant="light"
              leftSection={<IconExternalLink size={16} />}
            >
              Open in Distribution Management
            </Button>
          </Group>
        </Card>
      )}

      <div>
        <Group justify="space-between" mb="md">
          <Title order={3}>Store Submissions</Title>
          {distribution.canSubmitToStores && distribution.availablePlatforms.length > 0 && (
            <Button leftSection={<IconRocket size={16} />} onClick={distribution.openSubmitDialog}>
              Submit to Stores
            </Button>
          )}
        </Group>

        {distribution.hasSubmissions ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {distribution.submissions.map((submission) => (
                <SubmissionStatusCard
                  key={submission.id}
                  submission={submission}
                  org={org}
                  releaseId={releaseId}
                />
              ))}
            </div>
            
            {/* Release Complete View (if all platforms at 100%) */}
            {distribution.submissions.every(
              (s) => s.submissionStatus === SubmissionStatus.LIVE && s.exposurePercent === 100
            ) && (
              <ReleaseCompleteView
                releaseVersion={distributionStatusData.releaseVersion}
                platforms={distribution.submissions.map((s) => ({
                  platform: s.platform,
                  versionName: s.versionName,
                  exposurePercent: s.exposurePercent,
                  submittedAt: s.submittedAt,
                  releasedAt: s.releasedAt,
                }))}
                completedAt={
                  distribution.submissions.reduce((latest, s) => {
                    const releasedAt = s.releasedAt;
                    if (!releasedAt) return latest;
                    if (!latest) return releasedAt;
                    return new Date(releasedAt) > new Date(latest) ? releasedAt : latest;
                  }, null as string | null) || new Date().toISOString()
                }
              />
            )}
          </>
        ) : (
          <EmptySubmissionsCard
            showButton={distribution.availablePlatforms.length > 0}
            onSubmit={distribution.openSubmitDialog}
          />
        )}
      </div>

      {distribution.hasRejections && <RejectionWarningCard />}
    </Stack>
  );
}

type EmptySubmissionsCardProps = {
  showButton: boolean;
  onSubmit: () => void;
};

function EmptySubmissionsCard({ showButton, onSubmit }: EmptySubmissionsCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack align="center" py="xl">
        <IconRocket size={48} className="text-gray-300" />
        <Text c="dimmed" ta="center">
          No submissions yet. Submit your builds to the app stores to start distribution.
        </Text>
        {showButton && (
          <Button mt="md" leftSection={<IconRocket size={16} />} onClick={onSubmit}>
            Submit to Stores
          </Button>
        )}
      </Stack>
    </Card>
  );
}

function RejectionWarningCard() {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className="border-red-300 bg-red-50">
      <Title order={4} c="red.7" mb="sm">⚠️ Submission Rejected</Title>
      <Text size="sm" c="red.7">
        One or more submissions were rejected by the store. Please review the rejection details 
        and submit a corrected build.
      </Text>
    </Card>
  );
}
