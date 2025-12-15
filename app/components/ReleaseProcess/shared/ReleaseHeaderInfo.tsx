/**
 * ReleaseHeaderTitle Component
 * Displays release title, status badges, and platform badges
 */

import { Badge, Group, Text, Title } from '@mantine/core';
import { IconGitBranch, IconTag } from '@tabler/icons-react';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { Phase, ReleaseStatus } from '~/types/release-process-enums';
import type { TaskStage } from '~/types/release-process-enums';
import {
  HEADER_LABELS,
  getPhaseColor,
  getPhaseLabel,
  getReleaseStatusColor,
  getReleaseStatusLabel,
  STAGE_LABELS,
} from '~/constants/release-process-ui';

interface PlatformTargetMapping {
  platform: string;
  target: string;
  version?: string | null;
}

interface ReleaseHeaderTitleProps {
  release: BackendReleaseResponse;
}

export function ReleaseHeaderTitle({ release }: ReleaseHeaderTitleProps) {
  const releaseStatus: ReleaseStatus = release.status;
  const releasePhase: Phase | undefined = release.releasePhase;
  const platformMappings: PlatformTargetMapping[] = (release.platformTargetMappings || []) as PlatformTargetMapping[];

  return (
    <Group justify="space-between" align="center" wrap="wrap">
      <Group gap="md" align="center">
        {release.branch ? (
          <Title order={2} className="font-mono">
            {release.branch}
          </Title>
        ) : (
          <Title order={2}>
            {HEADER_LABELS.NO_BRANCH}
          </Title>
        )}

        {/* Status Badges - Next to Title */}
        <Group gap="sm">
          {releasePhase && (
            <Badge
              color={getPhaseColor(releasePhase)}
              variant="light"
              size="md"
              style={{ fontSize: '0.7rem' }}
            >
              {getPhaseLabel(releasePhase)}
            </Badge>
          )}
          {releaseStatus && (
            <Badge
              color={getReleaseStatusColor(releaseStatus)}
              variant="light"
              size="md"
              style={{ fontSize: '0.7rem' }}
            >
              {getReleaseStatusLabel(releaseStatus)}
            </Badge>
          )}
        </Group>
      </Group>

      {/* Platform Badges - Right Side */}
      {platformMappings.length > 0 && (
        <Group gap="xs">
          {platformMappings.map((mapping, idx) => (
            <Badge key={idx} size="md" variant="light" color="blue">
              {mapping.platform} {HEADER_LABELS.PLATFORM_SEPARATOR} {mapping.target}
              {mapping.version && <span style={{ fontWeight: 700 }}> ({mapping.version})</span>}
            </Badge>
          ))}
        </Group>
      )}
    </Group>
  );
}

/**
 * ReleaseHeaderInfo Component
 * Displays release version, branch, and current stage information
 */

interface ReleaseHeaderInfoProps {
  release: BackendReleaseResponse;
  releaseVersion: string;
  currentStage: TaskStage | null;
}

export function ReleaseHeaderInfo({
  release,
  releaseVersion,
  currentStage,
}: ReleaseHeaderInfoProps) {
  return (
    <Group gap="xl">
      <Group gap="xs">
        <IconTag size={18} className="text-brand-600" />
        <div>
          <Text size="xs" c="dimmed">
            {HEADER_LABELS.RELEASE_VERSION}
          </Text>
          <Text fw={600} size="sm">
            {releaseVersion}
          </Text>
        </div>
      </Group>

      {release.branch && (
        <Group gap="xs">
          <IconGitBranch size={18} className="text-slate-600" />
          <div>
            <Text size="xs" c="dimmed">
              {HEADER_LABELS.RELEASE_BRANCH}
            </Text>
            <Text fw={600} size="sm" className="font-mono">
              {release.branch}
            </Text>
          </div>
        </Group>
      )}

      {currentStage && (
        <Group gap="xs">
          <div>
            <Text size="xs" c="dimmed">
              {HEADER_LABELS.CURRENT_STAGE}
            </Text>
            <Text fw={600} size="sm">
              {STAGE_LABELS[currentStage]}
            </Text>
          </div>
        </Group>
      )}
    </Group>
  );
}
