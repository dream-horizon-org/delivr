/**
 * BuildUploadSection Component
 * Pure presentation component for build upload widgets
 * Receives filtered platforms array (only platforms that need uploads)
 */

import { Grid, Stack, Text } from '@mantine/core';
import { BuildUploadStage, Platform, TaskType } from '~/types/release-process-enums';
import { ManualBuildUploadWidget } from './ManualBuildUploadWidget';

interface BuildUploadSectionProps {
  tenantId: string;
  releaseId: string;
  buildStage: BuildUploadStage;
  taskType: TaskType;
  platforms: Platform[]; // Filtered list: only platforms that need uploads
  onUploadComplete?: () => void;
}

export function BuildUploadSection({
  tenantId,
  releaseId,
  buildStage,
  taskType,
  platforms,
  onUploadComplete,
}: BuildUploadSectionProps) {
  // If no platforms need upload, don't render
  if (platforms.length === 0) {
    return null;
  }

  // Pre-Regression: Show one widget per platform that needs upload
  if (taskType === TaskType.TRIGGER_PRE_REGRESSION_BUILDS) {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Upload Builds
        </Text>
        <Grid gutter="md">
          {platforms.map((platform) => (
            <Grid.Col key={platform} span={{ base: 12, sm: 6, md: platforms.length === 2 ? 6 : platforms.length === 3 ? 4 : 6 }}>
              <ManualBuildUploadWidget
                tenantId={tenantId}
                releaseId={releaseId}
                stage={buildStage}
                taskType={taskType}
                platform={platform}
                onUploadComplete={onUploadComplete}
              />
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    );
  }

  // Post-Regression TestFlight: Only iOS (if iOS needs upload)
  if (taskType === TaskType.TRIGGER_TEST_FLIGHT_BUILD && platforms.includes(Platform.IOS)) {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Upload Builds
        </Text>
        <ManualBuildUploadWidget
          tenantId={tenantId}
          releaseId={releaseId}
          stage={buildStage}
          taskType={taskType}
          platform={Platform.IOS}
          onUploadComplete={onUploadComplete}
        />
      </Stack>
    );
  }

  // Post-Regression AAB: Only Android (if Android needs upload)
  if (taskType === TaskType.CREATE_AAB_BUILD && platforms.includes(Platform.ANDROID)) {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Upload Builds
        </Text>
        <ManualBuildUploadWidget
          tenantId={tenantId}
          releaseId={releaseId}
          stage={buildStage}
          taskType={taskType}
          platform={Platform.ANDROID}
          onUploadComplete={onUploadComplete}
        />
      </Stack>
    );
  }

  // Regression builds: Show widgets for platforms that need uploads
  if (taskType === TaskType.TRIGGER_REGRESSION_BUILDS) {
    return (
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Upload Builds
        </Text>
        <Grid gutter="md">
          {platforms.map((platform) => (
            <Grid.Col key={platform} span={{ base: 12, sm: 6 }}>
              <ManualBuildUploadWidget
                tenantId={tenantId}
                releaseId={releaseId}
                stage={buildStage}
                taskType={taskType}
                platform={platform}
                onUploadComplete={onUploadComplete}
              />
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    );
  }

  return null;
}

