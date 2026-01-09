/**
 * ManualBuildUploadWidget Component
 * Unified widget for uploading manual builds (file upload or TestFlight verification)
 * Handles multiple platforms - shows uploaded builds/upload widgets per platform
 * Receives ALL expected platforms - determines internally which have builds and which need uploads
 */

import { Badge, Card, Stack, Text, Group, Loader, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useMemo, useState, useEffect } from 'react';
import { useRouteLoaderData } from '@remix-run/react';
import { useRelease } from '~/hooks/useRelease';
import { useBuildArtifacts } from '~/hooks/useReleaseProcess';
import { usePermissions } from '~/hooks/usePermissions';
import { BuildUploadStage, Platform, TaskType } from '~/types/release-process-enums';
import type { BuildInfo } from '~/types/release-process.types';
import type { OrgLayoutLoaderData } from '~/routes/dashboard.$org';
import { ChangeBuildHeader } from './builds/ChangeBuildHeader';
import { FileUploadSection } from './builds/FileUploadSection';
import { TestFlightVerificationSection } from './builds/TestFlightVerificationSection';
import { UploadedBuildDisplay } from './builds/UploadedBuildDisplay';

interface ManualBuildUploadWidgetProps {
  tenantId: string;
  releaseId: string;
  stage: BuildUploadStage;
  taskType: TaskType;
  platforms: Platform[]; // Required: ALL expected platforms (widget determines which need uploads)
  isTestFlightVerification?: boolean; // Optional: Can derive from taskType
  onUploadComplete?: () => void;
  className?: string;
  forceShowUpload?: boolean; // Force show upload section even if artifacts exist (for "Change Build" mode)
  uploadedBuilds?: BuildInfo[]; // Stage-level uploaded builds (not yet consumed)
}

export function ManualBuildUploadWidget({
  tenantId,
  releaseId,
  stage,
  taskType,
  platforms,
  isTestFlightVerification = taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD,
  onUploadComplete,
  className,
  forceShowUpload = false,
  uploadedBuilds = [],
}: ManualBuildUploadWidgetProps) {
  // Track which platform is being changed (key = platform, value = true if changing)
  const [changingPlatforms, setChangingPlatforms] = useState<Record<string, boolean>>({});
  
  // Track recently uploaded platforms (showing loading state)
  const [loadingPlatforms, setLoadingPlatforms] = useState<Set<Platform>>(new Set());
  
  const { release } = useRelease(tenantId, releaseId);

  // Get user data and check permissions
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';
  const { canPerformReleaseAction } = usePermissions(tenantId, userId);
  const canUpload = canPerformReleaseAction(release?.releasePilotAccountId || null);

  // Fetch artifacts to detect when fetch completes
  // Map stage to buildStage for the query
  const buildStage = useMemo(() => {
    switch (stage) {
      case BuildUploadStage.PRE_REGRESSION:
        return 'KICKOFF';
      case BuildUploadStage.REGRESSION:
        return 'REGRESSION';
      case BuildUploadStage.PRE_RELEASE:
        return 'PRE_RELEASE';
      default:
        return undefined;
    }
  }, [stage]);

  const artifactsQuery = useBuildArtifacts(tenantId, releaseId, { buildStage });

  // Clear loading state when artifacts fetch completes
  useEffect(() => {
    // If we're not fetching and we have loading platforms, check if they're now in uploadedBuilds
    if (!artifactsQuery.isFetching && loadingPlatforms.size > 0) {
      const platformsToClear: Platform[] = [];
      
      loadingPlatforms.forEach((platform) => {
        // Check if this platform now has a build in uploadedBuilds
        const hasBuild = uploadedBuilds.some(
          (build) => build.platform === platform && 
                     (build.isUsed === false || build.usedByTaskId === null) &&
                     !build.regressionId && 
                     !build.taskId
        );
        
        if (hasBuild) {
          platformsToClear.push(platform);
        }
      });
      
      // Clear platforms that now have builds
      if (platformsToClear.length > 0) {
        setLoadingPlatforms((prev) => {
          const next = new Set(prev);
          platformsToClear.forEach((p) => next.delete(p));
          return next;
        });
      }
    }
  }, [artifactsQuery.isFetching, uploadedBuilds, loadingPlatforms]);

  // Group uploaded builds by platform (non-consumed builds only)
  const uploadedBuildsByPlatform = useMemo(() => {
    const grouped: Record<string, BuildInfo> = {};
    uploadedBuilds.forEach((build) => {
      // Only include non-consumed builds
      // For uploaded builds: isUsed === false or usedByTaskId === null
      // For consumed builds: regressionId or taskId would be present
      const isNotConsumed = 
        (build.isUsed === false || build.usedByTaskId === null) &&
        !build.regressionId && 
        !build.taskId;
      
      if (isNotConsumed) {
        grouped[build.platform] = build;
      }
    });
    return grouped;
  }, [uploadedBuilds]);

  // Handle change build for a specific platform
  const handleChangeBuild = (platform: Platform) => {
    setChangingPlatforms(prev => ({ ...prev, [platform]: true }));
  };

  const handleCancelChange = (platform: Platform) => {
    setChangingPlatforms(prev => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
  };

  const handleUploadComplete = (platform?: Platform) => {
    if (platform) {
      // Add platform to loading set
      setLoadingPlatforms(prev => new Set(prev).add(platform));
      
      setChangingPlatforms(prev => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
    }
    onUploadComplete?.();
  };

  // If no platforms, don't render
  if (platforms.length === 0) {
    return null;
  }

  // If user doesn't have permission, show message
  if (!canUpload) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder className={className}>
        <Stack gap="md">
          <Text fw={600} size="sm">
            {isTestFlightVerification ? 'Verify TestFlight Build' : 'Upload Builds'}
          </Text>
          <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light">
            <Text size="sm">
              Only release pilots can upload builds. Please contact your release pilot to upload builds.
            </Text>
          </Alert>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={className}>
      <Stack gap="md">
        {/* Header - Show task type and stage info */}
        <Stack gap="xs">
          <Text fw={600} size="sm">
            {isTestFlightVerification ? 'Verify TestFlight Build' : 'Upload Builds'}
          </Text>
          {platforms.length > 1 && (
            <Text size="xs" c="dimmed">
              Platforms: {platforms.join(', ')}
            </Text>
          )}
        </Stack>

        {/* For each platform: show loading, uploaded build, or upload widget */}
        {platforms.map((platform) => {
          const uploadedBuild = uploadedBuildsByPlatform[platform];
          const isChanging = changingPlatforms[platform] || false;
          const isLoading = loadingPlatforms.has(platform);
          const hasUploadedBuild = !!uploadedBuild;
          // Show upload widget if: forcing, changing, or no build exists (and not loading)
          const shouldShowUpload = (forceShowUpload || isChanging || !hasUploadedBuild) && !isLoading;
          return (
            <Stack key={platform} gap="sm">
              {/* Platform Badge */}
              <Badge size="sm" variant="light" style={{ alignSelf: 'flex-start' }}>
                {platform}
              </Badge>

              {/* Show loading state if recently uploaded */}
              {isLoading && (
                <Group gap="xs" p="sm" style={{ 
                  border: '1px solid var(--mantine-color-gray-3)', 
                  borderRadius: '4px',
                  backgroundColor: 'var(--mantine-color-gray-0)',
                }}>
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">
                    Loading artifact info...
                  </Text>
                </Group>
              )}

              {/* Show uploaded build if exists and not changing and not loading */}
              {hasUploadedBuild && !isChanging && !isLoading && (
                <UploadedBuildDisplay
                  build={uploadedBuild}
                  onChangeBuild={() => handleChangeBuild(platform)}
                  canChangeBuild={canUpload}
                />
              )}

              {/* Show upload widget if needed and not loading */}
              {shouldShowUpload && (
                <Stack gap="xs">
                  {isChanging && (
                    <ChangeBuildHeader
                      platform={platform}
                      onCancel={() => handleCancelChange(platform)}
                    />
                  )}
                  {isTestFlightVerification && platform === Platform.IOS ? (
                    <TestFlightVerificationSection
                      tenantId={tenantId}
                      releaseId={releaseId}
                      stage={stage}
                      release={release}
                      onUploadComplete={() => handleUploadComplete(platform)}
                      onRefetchArtifacts={async () => {
                        // Query invalidation is handled by upload mutation
                        // This is kept for compatibility with component interface
                      }}
                    />
                  ) : (
                    <FileUploadSection
                      tenantId={tenantId}
                      releaseId={releaseId}
                      stage={stage}
                      availablePlatforms={[platform]} // Single platform for this widget instance
                      fixedPlatform={platform} // Pass platform explicitly
                      onUploadComplete={() => handleUploadComplete(platform)}
                      onRefetchArtifacts={async () => {
                        // Query invalidation is handled by upload mutation
                        // This is kept for compatibility with component interface
                      }}
                    />
                  )}
                </Stack>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );
}

