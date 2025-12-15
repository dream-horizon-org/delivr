/**
 * ManualBuildUploadWidget Component
 * Unified widget for uploading manual builds (file upload or TestFlight verification)
 * Orchestrates FileUploadSection and TestFlightVerificationSection components
 */

import { Anchor, Badge, Card, Group, Stack, Text } from '@mantine/core';
import { IconBrandApple, IconFile } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { BUILD_UPLOAD_LABELS } from '~/constants/release-process-ui';
import { useBuildArtifacts } from '~/hooks/useReleaseProcess';
import { useRelease } from '~/hooks/useRelease';
import type { BuildUploadStage, Platform } from '~/types/release-process-enums';
import { TaskType } from '~/types/release-process-enums';
import { mapBuildUploadStageToTaskStage } from '~/utils/build-upload-mapper';
import { FileUploadSection } from './builds/FileUploadSection';
import { TestFlightVerificationSection } from './builds/TestFlightVerificationSection';

interface ManualBuildUploadWidgetProps {
  tenantId: string;
  releaseId: string;
  stage: BuildUploadStage;
  taskType: TaskType;
  platform?: Platform; // Optional: if provided, widget is locked to this platform
  onUploadComplete?: () => void;
  className?: string;
  forceShowUpload?: boolean; // Force show upload section even if artifacts exist (for "Change Build" mode)
}

export function ManualBuildUploadWidget({
  tenantId,
  releaseId,
  stage,
  taskType,
  platform: fixedPlatform,
  onUploadComplete,
  className,
  forceShowUpload = false,
}: ManualBuildUploadWidgetProps) {
  // Get release to extract platforms from platformTargetMappings
  const { release } = useRelease(tenantId, releaseId);

  // Determine upload mode based on taskType
  const isTestFlightVerification = taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD;

  // Extract available platforms from release
  const availablePlatforms = useMemo(() => {
    // If platform is fixed (single-platform widget), return only that platform
    if (fixedPlatform) {
      return [fixedPlatform];
    }
    
    if (!release?.platformTargetMappings) return [];
    
    const platforms = release.platformTargetMappings
      .map(m => m.platform)
      .filter((p, i, arr) => arr.indexOf(p) === i); // Get unique platforms
    
    // For TestFlight, only show iOS
    if (isTestFlightVerification) {
      return platforms.filter(p => p === 'IOS');
    }
    
    return platforms;
  }, [release?.platformTargetMappings, isTestFlightVerification, fixedPlatform]);

  // Map BuildUploadStage to backend stage format for filtering
  const backendStage = useMemo(() => {
    const taskStage = mapBuildUploadStageToTaskStage(stage);
    // Backend uses KICK_OFF, REGRESSION, PRE_RELEASE
    return taskStage === 'KICKOFF' ? 'KICK_OFF' : taskStage === 'PRE_RELEASE' ? 'PRE_RELEASE' : taskStage;
  }, [stage]);

  // Fetch artifacts for this stage
  const { data: artifactsData, isLoading: isLoadingArtifacts, refetch: refetchArtifacts } = useBuildArtifacts(
    tenantId,
    releaseId,
    { buildStage: backendStage }
  );

  // Get artifacts for current platform(s)
  const platformArtifacts = useMemo(() => {
    if (!artifactsData?.data) return [];
    
    // Ensure data is an array
    if (!Array.isArray(artifactsData.data)) {
      // Log error in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('[ManualBuildUploadWidget] artifactsData.data is not an array:', artifactsData.data);
      }
      return [];
    }
    
    // If platform is fixed, filter by that platform
    if (fixedPlatform) {
      return artifactsData.data.filter(a => a.platform === fixedPlatform);
    }
    
    // Otherwise return all artifacts for available platforms
    return artifactsData.data.filter(a => availablePlatforms.includes(a.platform as Platform));
  }, [artifactsData, fixedPlatform, availablePlatforms]);

  // Check if we should show upload widget (no artifact for platform, or forceShowUpload is true)
  const shouldShowUploadWidget = useMemo(() => {
    // Force show upload section (for "Change Build" mode)
    if (forceShowUpload) {
      return true;
    }
    
    if (fixedPlatform) {
      // Single platform widget: show upload if no artifact for this platform
      return !platformArtifacts.some(a => a.platform === fixedPlatform);
    }
    
    // Multi-platform widget: show upload if any platform is missing artifact
    return availablePlatforms.some(platform => 
      !platformArtifacts.some(a => a.platform === platform)
    );
  }, [platformArtifacts, fixedPlatform, availablePlatforms, forceShowUpload]);

  // Get file extension and platform name
  const getFileExtension = () => {
    if (isTestFlightVerification) return null;
    if (fixedPlatform === 'ANDROID') {
      // AAB build task uses .aab, others use .apk
      return taskType === TaskType.CREATE_AAB_BUILD ? '.aab' : '.apk';
    }
    if (fixedPlatform === 'IOS') return '.ipa';
    return null;
  };

  const getPlatformName = () => {
    if (isTestFlightVerification) return 'TestFlight';
    if (fixedPlatform === 'ANDROID') return 'Android';
    if (fixedPlatform === 'IOS') return 'iOS';
    if (fixedPlatform === 'WEB') return 'Web';
    return null;
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={className}>
      <Stack gap="md">
        <Group gap="xs" align="center">
          {isTestFlightVerification ? (
            <>
              <Text fw={600} size="sm">Verify</Text>
              <Badge size="sm" variant="light" color="blue">TestFlight</Badge>
            </>
          ) : (
            <>
              <Text fw={600} size="sm">Upload</Text>
              {getFileExtension() && (
                <Badge size="sm" variant="light" color={fixedPlatform === 'ANDROID' ? 'green' : 'blue'}>
                  {getFileExtension()}
                </Badge>
              )}
              {getPlatformName() && (
                <Text size="sm" c="dimmed">for {getPlatformName()}</Text>
              )}
            </>
          )}
        </Group>

        {/* Show Artifacts if they exist */}
        {!isLoadingArtifacts && platformArtifacts.length > 0 && (
          <Stack gap="sm">
            <Text size="sm" fw={500} c="dimmed">
              Uploaded Artifacts
            </Text>
            {platformArtifacts.map((artifact) => (
              <Group key={artifact.id} justify="space-between" align="center" p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
                <Group gap="xs">
                  <IconFile size={16} />
                  <div>
                    <Text size="sm" fw={500}>
                      {artifact.platform}
                    </Text>
                    {artifact.downloadUrl ? (
                      <Anchor href={artifact.downloadUrl} target="_blank" size="xs" c="blue">
                        Download Artifact
                      </Anchor>
                    ) : (
                      <Text size="xs" c="dimmed">
                        {artifact.platform === 'IOS' && !artifact.downloadUrl && artifact.buildNumber 
                          ? `TestFlight Build #${artifact.buildNumber}` 
                          : 'No download available'}
                      </Text>
                    )}
                  </div>
                </Group>
              </Group>
            ))}
          </Stack>
        )}

        {/* Show Upload Widget if no artifacts or if some platforms are missing */}
        {shouldShowUploadWidget && (
          <>
            {isTestFlightVerification ? (
              <TestFlightVerificationSection
                tenantId={tenantId}
                releaseId={releaseId}
                stage={stage}
                release={release}
                onUploadComplete={onUploadComplete}
                onRefetchArtifacts={refetchArtifacts}
              />
            ) : (
              <FileUploadSection
                tenantId={tenantId}
                releaseId={releaseId}
                stage={stage}
                availablePlatforms={availablePlatforms}
                fixedPlatform={fixedPlatform}
                onUploadComplete={onUploadComplete}
                onRefetchArtifacts={refetchArtifacts}
              />
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

