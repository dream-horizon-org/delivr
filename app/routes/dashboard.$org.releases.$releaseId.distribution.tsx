/**
 * Distribution Module - Main Page
 * Handles both Pre-Release (Stage 3) and Distribution (Stage 4) stages
 * 
 * Route: /dashboard/:org/releases/:releaseId/distribution
 */

import { Container, Modal, Tabs } from '@mantine/core';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate, useRevalidator, useSearchParams } from '@remix-run/react';
import { IconCheck, IconRocket } from '@tabler/icons-react';
import type { User } from '~/.server/services/Auth/Auth.interface';
import { DistributionService } from '~/.server/services/Distribution';
import {
  ManualApprovalDialog,
  SubmitToStoresForm,
  UploadAABForm,
  VerifyTestFlightForm
} from '~/components/distribution';
import { ERROR_MESSAGES, LOG_CONTEXT } from '~/constants/distribution-api.constants';
import {
  DIALOG_TITLES,
  ROLLOUT_COMPLETE_PERCENT
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
import { Platform, ReleaseStatus } from '~/types/distribution.types';
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
    data.distributionStatus.data.platforms.android?.exposurePercent < ROLLOUT_COMPLETE_PERCENT;

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
// SUB-COMPONENTS - Imported from _components folder
// ============================================================================

import { DistributionPageHeader as PageHeader } from './_components/DistributionPageHeader';
import { DistributionTab } from './_components/DistributionTab';
import { PreReleaseTab } from './_components/PreReleaseTab';

