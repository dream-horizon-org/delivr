/**
 * ReleaseHeaderTitle Component
 * Displays release title, status badges, and platform badges
 */

import { Badge, Group, Text, Title, Tooltip, Box, Stack } from '@mantine/core';
import React, { useRef, useState, useEffect } from 'react';
import { IconGitBranch, IconTag, IconClock } from '@tabler/icons-react';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { Phase, ReleaseStatus, PauseType } from '~/types/release-process-enums';
import type { TaskStage } from '~/types/release-process-enums';
import {
  HEADER_LABELS,
  getPhaseColor,
  getPhaseLabel,
  getReleaseStatusColor,
  getReleaseStatusLabel,
  STAGE_LABELS,
} from '~/constants/release-process-ui';
import { formatReleaseDateTime } from '~/utils/release-process-date';

interface PlatformTargetMapping {
  platform: string;
  target: string;
  version?: string | null;
}

interface ReleaseHeaderTitleProps {
  release: BackendReleaseResponse;
}

/**
 * Component that conditionally shows tooltip only when text is truncated
 */
function ConditionalTooltip({ 
  children, 
  label, 
  ...props 
}: { 
  children: React.ReactElement; 
  label: string;
  [key: string]: any;
}) {
  const textRef = useRef<HTMLElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const element = textRef.current;
        setIsTruncated(element.scrollWidth > element.clientWidth);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [label]);

  const childWithRef = React.cloneElement(children, { ref: textRef });

  if (isTruncated) {
    return (
      <Tooltip label={label} withArrow color="gray" {...props}>
        {childWithRef}
      </Tooltip>
    );
  }

  return childWithRef;
}

export function ReleaseHeaderTitle({ release }: ReleaseHeaderTitleProps) {
  const releaseStatus: ReleaseStatus = release.status;
  const releasePhase: Phase | undefined = release.releasePhase;
  const platformMappings: PlatformTargetMapping[] = (release.platformTargetMappings || []) as PlatformTargetMapping[];
  
  // Helper to get release type color (consistent with ReleaseCard)
  const getReleaseTypeColor = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'MAJOR':
        return 'purple';
      case 'MINOR':
        return 'blue';
      case 'HOTFIX':
        return 'red';
      default:
        return 'brand';
    }
  };
  
  // Check if paused - use pauseType from cronJob (primary check)
  // Backend keeps cronStatus=RUNNING and uses pauseType to control pause state
  const pauseType = release.cronJob?.pauseType;
  const isPaused = !!(pauseType && pauseType !== PauseType.NONE);

  return (
    <Stack gap="sm">
      {/* First Line: Branch Name - Full Width */}
      {release.branch ? (
        <ConditionalTooltip label={release.branch}>
          <Title 
            order={2} 
            className="font-mono"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}
          >
            {release.branch}
          </Title>
        </ConditionalTooltip>
      ) : (
        <Title order={2}>
          {HEADER_LABELS.NO_BRANCH}
        </Title>
      )}

      {/* Second Line: Status Badges and Platform Badges */}
      <Group justify="space-between" align="center" wrap="wrap">
        {/* Status Badges */}
        <Group gap="sm">
          <Badge
            color={getReleaseTypeColor(release.type)}
            variant="light"
            size="md"
            style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
          >
            {release.type.toLowerCase()}
          </Badge>
          
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
          
          {releaseStatus && !isPaused && (
            <Badge
              color={getReleaseStatusColor(releaseStatus)}
              variant="light"
              size="md"
              style={{ fontSize: '0.7rem' }}
            >
              {getReleaseStatusLabel(releaseStatus)}
            </Badge>
          )}
          
          {isPaused && (
            <Badge
              color="orange"
              variant="light"
              size="md"
              style={{ fontSize: '0.7rem' }}
            >
              Paused
            </Badge>
          )}
        </Group>
      </Group>

      {/* Platform Badges - Right Side */}
      {platformMappings.length > 0 && (
        <Group gap="xs">
          {platformMappings.map((mapping, idx) => (
            <Badge key={idx} size="md" variant="light" color="brand">
              {mapping.platform} {HEADER_LABELS.PLATFORM_SEPARATOR} {mapping.target}
              {mapping.version && <span style={{ fontWeight: 700 }}> ({mapping.version})</span>}
            </Badge>
          ))}
        </Group>
      )}
    </Stack>
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
    <Group gap="xl" wrap="nowrap" style={{ minWidth: 0 }}>
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
        <Group gap="xs" style={{ flex: '0 1 auto', minWidth: 0 }}>
          <IconGitBranch size={18} className="text-slate-600" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <Text size="xs" c="dimmed">
              {HEADER_LABELS.RELEASE_BRANCH}
            </Text>
            <ConditionalTooltip label={release.branch}>
              <Text 
                fw={600} 
                size="sm" 
                className="font-mono"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  maxWidth: '200px',
                }}
              >
                {release.branch}
              </Text>
            </ConditionalTooltip>
          </div>
        </Group>
      )}

      {release.kickOffDate && (
        <Group gap="xs">
          <IconClock size={18} className="text-slate-600" />
          <div>
            <Text size="xs" c="dimmed">
              {HEADER_LABELS.RELEASE_STARTED_AT}
            </Text>
            <Text fw={600} size="sm">
              {formatReleaseDateTime(release.kickOffDate)}
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
