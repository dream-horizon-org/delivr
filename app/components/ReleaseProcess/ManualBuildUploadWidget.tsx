/**
 * ManualBuildUploadWidget Component
 * Unified widget for uploading manual builds (file upload or TestFlight verification)
 * Handles multiple platforms - shows uploaded builds/upload widgets per platform
 * Receives ALL expected platforms - determines internally which have builds and which need uploads
 */

import { Badge, Card, Stack, Text } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useRelease } from '~/hooks/useRelease';
import { BuildUploadStage, Platform, TaskType } from '~/types/release-process-enums';
import type { BuildInfo } from '~/types/release-process.types';
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
  
  const { release } = useRelease(tenantId, releaseId);

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

        {/* For each platform: show uploaded build OR upload widget */}
        {platforms.map((platform) => {
          const uploadedBuild = uploadedBuildsByPlatform[platform];
          const isChanging = changingPlatforms[platform] || false;
          const hasUploadedBuild = !!uploadedBuild;
          // Show upload widget if: forcing, changing, or no build exists
          const shouldShowUpload = forceShowUpload || isChanging || !hasUploadedBuild;
          return (
            <Stack key={platform} gap="sm">
              {/* Platform Badge */}
              <Badge size="sm" variant="light" style={{ alignSelf: 'flex-start' }}>
                {platform}
              </Badge>

              {/* Show uploaded build if exists and not changing */}
              {hasUploadedBuild && !isChanging && (
                <UploadedBuildDisplay
                  build={uploadedBuild}
                  onChangeBuild={() => handleChangeBuild(platform)}
                />
              )}

              {/* Show upload widget if needed */}
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

