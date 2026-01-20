/**
 * BuildUploadSection Component
 * Pure presentation component for build upload widgets
 * Receives ALL expected platforms - widget determines which need uploads
 */

import { Grid, Stack, Text } from '@mantine/core';
import { BuildUploadStage, Platform, TaskType } from '~/types/release-process-enums';
import { ManualBuildUploadWidget } from './ManualBuildUploadWidget';

import type { BuildInfo } from '~/types/release-process.types';

interface BuildUploadSectionProps {
  tenantId: string;
  releaseId: string;
  buildStage: BuildUploadStage;
  taskType: TaskType;
  platforms: Platform[]; // ALL expected platforms (widget determines which need uploads)
  onUploadComplete?: () => void;
  uploadedBuilds?: BuildInfo[]; // Stage-level uploaded builds (not yet consumed)
}

export function BuildUploadSection({
  tenantId,
  releaseId,
  buildStage,
  taskType,
  platforms,
  onUploadComplete,
  uploadedBuilds = [],
}: BuildUploadSectionProps) {
  // If no platforms, don't render
  if (platforms.length === 0) {
    return null;
  }

  // All task types: Single widget instance handles all platforms
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
        platforms={platforms}
        onUploadComplete={onUploadComplete}
        uploadedBuilds={uploadedBuilds}
      />
    </Stack>
  );
}

