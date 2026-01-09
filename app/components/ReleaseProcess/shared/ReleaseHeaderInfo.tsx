/**
 * ReleaseHeaderTitle Component
 * Displays release title, status badges, and platform badges
 */

import { Badge, Group, Text, Title, Tooltip, Box, Stack } from '@mantine/core';
import React, { useRef, useState, useEffect } from 'react';
import { IconGitBranch, IconTag, IconClock, IconFlag } from '@tabler/icons-react';
import type { BackendReleaseResponse } from '~/types/release-management.types';
import { Phase, ReleaseStatus, PauseType } from '~/types/release-process-enums';
import type { TaskStage } from '~/types/release-process-enums';
import { RELEASE_TYPES } from '~/types/release-config-constants';
import {
  HEADER_LABELS,
  getPhaseColor,
  getPhaseLabel,
  getReleaseStatusColor,
  getReleaseStatusLabel,
  STAGE_LABELS,
  BADGE_TOOLTIPS,
} from '~/constants/release-process-ui';
import { formatReleaseDateTime } from '~/utils/release-process-date';
import { PlatformIcon } from '~/components/Releases/PlatformIcon';
import { isReleasePaused } from '~/utils/release-utils';
import { PlatformTargetBadge } from '~/components/Common/AppBadge';

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
      case RELEASE_TYPES.MAJOR:
        return 'purple';
      case RELEASE_TYPES.MINOR:
        return 'blue';
      case RELEASE_TYPES.HOTFIX:
        return 'red';
      default:
        return 'brand';
    }
  };
  
  // Check if paused - use utility function which handles special cases
  // (e.g., distribution stage with completed cron but active release)
  const isPaused = isReleasePaused(release);

  return (
    <Group gap="lg" align="center" wrap="wrap">
      {/* {release.branch ? (
        <Title order={2} className="font-mono" size={"h4"}>
          {release.branch}
        </Title>
      ) : (
        <Title order={2}>
          {HEADER_LABELS.NO_BRANCH}
        </Title>
      )} */}

      {/* All Badges in Same Line - Phase and Platform Only */}
      <Group gap="sm" align="center" wrap="wrap">
        {/* Platform Badges - Cleaner Format with Icons */}
        {platformMappings.map((mapping, idx) => {
          // Format target: "PLAY_STORE" -> "Play Store"
          const formattedTarget = mapping.target
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
          
          // Format version: "v1.0.0" or "1.0.0" -> "v1.0.0"
          const formattedVersion = mapping.version 
            ? (mapping.version.startsWith('v') ? mapping.version : `v${mapping.version}`)
            : null;

          return (
            <PlatformTargetBadge
              key={idx}
              platform={mapping.platform}
              target={mapping.target}
              version={formattedVersion}
              size="md"
            />
          );
        })}
        
        {releasePhase && (
          <Tooltip 
            label={BADGE_TOOLTIPS.PHASE} 
            withArrow
            styles={{
              tooltip: {
                padding: '10px 14px',
              },
            }}
          >
            <Badge
              color={getPhaseColor(releasePhase)}
              variant="light"
              size="md"
              style={{ fontSize: '0.7rem' }}
            >
              {getPhaseLabel(releasePhase)}
            </Badge>
          </Tooltip>
        )}
      </Group>
    </Group>
  );
}

/**
 * ReleaseHeaderInfo Component
 * Displays release type, status, branch, started time, and current stage information
 * Uses data-driven mapping for easy maintenance and UI consistency
 */

import type { ReactNode } from 'react';

interface ReleaseHeaderInfoProps {
  release: BackendReleaseResponse;
  releaseVersion: string;
  currentStage: TaskStage | null;
}

interface InfoItemConfig {
  key: string;
  icon?: ReactNode;
  label: string | ((props: ReleaseHeaderInfoProps & { releaseStatus: ReleaseStatus; isPaused: boolean }) => string);
  getValue: (props: ReleaseHeaderInfoProps & { releaseStatus: ReleaseStatus; isPaused: boolean }) => string | null;
  shouldShow: (props: ReleaseHeaderInfoProps & { releaseStatus: ReleaseStatus; isPaused: boolean }) => boolean;
  valueClassName?: string;
  valueStyle?: React.CSSProperties;
}

export function ReleaseHeaderInfo({
  release,
  releaseVersion,
  currentStage,
}: ReleaseHeaderInfoProps) {
  const releaseStatus: ReleaseStatus = release.status;
  // Check if paused - use utility function which handles special cases
  // (e.g., distribution stage with completed cron but active release)
  const isPaused = isReleasePaused(release);

  const props = {
    release,
    releaseVersion,
    currentStage,
    releaseStatus,
    isPaused,
  };
  const infoItems: InfoItemConfig[] = [

    {
      key: 'branch',
      icon: <IconGitBranch size={18} className="text-slate-600" />,
      label: HEADER_LABELS.RELEASE_BRANCH,
      getValue: () => release.branch || null,
      shouldShow: () => !!release.branch,
      valueClassName: 'font-mono',
    },
    {
      key: 'startedAt',
      icon: <IconClock size={18} className="text-slate-600" />,
      label: ({ release }) => {
        if (!release.kickOffDate) return HEADER_LABELS.RELEASE_STARTED_AT;
        const kickoffDate = new Date(release.kickOffDate);
        const now = new Date();
        return kickoffDate > now ? HEADER_LABELS.RELEASE_STARTS_AT : HEADER_LABELS.RELEASE_STARTED_AT;
      },
      getValue: () => release.kickOffDate ? formatReleaseDateTime(release.kickOffDate) : null,
      shouldShow: () => !!release.kickOffDate,
    },
    {
      key: 'currentStage',
      label: HEADER_LABELS.CURRENT_STAGE,
      getValue: ({ currentStage }) => currentStage ? STAGE_LABELS[currentStage] : null,
      shouldShow: ({ currentStage }) => !!currentStage,
    },
        {
      key: 'type',
      icon: <IconTag size={18} className="text-slate-600" />,
      label: HEADER_LABELS.RELEASE_TYPE,
      getValue: () => release.type.charAt(0).toUpperCase() + release.type.slice(1).toLowerCase(),
      shouldShow: () => true,
      valueStyle: { textTransform: 'capitalize' },
    },
    {
      key: 'status',
      icon: <IconFlag size={18} className="text-slate-600" />,
      label: HEADER_LABELS.STATUS,
      getValue: ({ isPaused, releaseStatus }) => isPaused ? 'Paused' : getReleaseStatusLabel(releaseStatus),
      shouldShow: () => true,
    },
  ];

  // Filter and render items
  const visibleItems = infoItems.filter(item => item.shouldShow(props));

  return (
    <Group gap="xl">
      {visibleItems.map((item) => {
        const value = item.getValue(props);
        if (!value) return null;

        const label = typeof item.label === 'function' ? item.label(props) : item.label;

        return (
          <Group key={item.key} gap="xs">
            {item.icon && item.icon}
            <div>
              <Text size="xs" c="dimmed">
                {label}
              </Text>
              <Text 
                fw={600} 
                size="sm" 
                className={item.valueClassName}
                style={item.valueStyle}
              >
                {value}
              </Text>
            </div>
          </Group>
        );
      })}
    </Group>
  );
}
