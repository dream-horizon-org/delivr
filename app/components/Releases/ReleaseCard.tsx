/**
 * Release Card Component
 * Modern, clean card design with improved information hierarchy
 */

import { Badge, Box, Card, Group, Stack, Text, useMantineTheme, Divider, Menu, Modal, Button } from '@mantine/core';
import { Link, useSearchParams } from '@remix-run/react';
import { 
  IconCalendar, 
  IconClock, 
  IconFlag, 
  IconGitBranch, 
  IconRocket, 
  IconSettings, 
  IconTarget,
  IconCheck,
  IconX,
  IconPlayerPause,
  IconAlertCircle,
  IconDots,
  IconArchive,
} from '@tabler/icons-react';
import { memo, useState } from 'react';
import { PlatformIcon } from '~/components/Releases/PlatformIcon';
import { useReleaseConfigs } from '~/hooks/useReleaseConfigs';
import { useArchiveRelease } from '~/hooks/useReleaseProcess';
import type { ReleaseCardProps } from '~/types/release';
import { formatReleaseDate, getActiveStatusColor, getReleaseActiveStatus, getReleaseTypeGradient, isReleasePaused } from '~/utils/release-utils';
import { Phase, ReleaseStatus, PauseType } from '~/types/release-process-enums';
import { getPhaseColor, getPhaseLabel, getReleaseStatusColor, getReleaseStatusLabel, BUTTON_LABELS } from '~/constants/release-process-ui';
import { RELEASE_TYPES } from '~/types/release-config-constants';
import { ConfigurationPreviewModal } from '~/components/ReleaseSettings/ConfigurationPreviewModal';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { getApiErrorMessage } from '~/utils/api-client';

/**
 * Release Card Component - Modern Clean Design
 */
export const ReleaseCard = memo(function ReleaseCard({ 
  release, 
  org
}: ReleaseCardProps) {
  const theme = useMantineTheme();
  const [searchParams] = useSearchParams();
  const [configModalOpened, setConfigModalOpened] = useState(false);
  const [archiveConfirmModalOpened, setArchiveConfirmModalOpened] = useState(false);
  
  // Archive hook
  const archiveMutation = useArchiveRelease(org, release.id);
  
  // Get release config info
  const { configs } = useReleaseConfigs(org);
  const releaseConfig = release.releaseConfigId 
    ? configs.find((c) => c.id === release.releaseConfigId)
    : null;

  // Get active status (for combining with other badges)
  const activeStatus = getReleaseActiveStatus(release);
  const activeStatusColor = getActiveStatusColor(activeStatus);
  
  // Helper to get release type color
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

  // Preserve search params (filters and tab) when navigating to release detail
  const returnToParams = new URLSearchParams(searchParams);
  const releaseUrl = returnToParams.toString() 
    ? `/dashboard/${org}/releases/${release.id}?returnTo=${encodeURIComponent(returnToParams.toString())}`
    : `/dashboard/${org}/releases/${release.id}`;

  // Status indicators
  // Check if paused - use utility function which handles special cases
  // (e.g., distribution stage with completed cron but active release)
  const isPaused = isReleasePaused(release);
  const phase = release.releasePhase;
  const status = release.status;


  // Handle config name click - prevent navigation and open modal
  const handleConfigClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (releaseConfig) {
      setConfigModalOpened(true);
    }
    return false;
  };

  // Handle archive
  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync();
      
      showSuccessToast({
        message: 'Release archived successfully',
      });

      // Hook handles optimistic update + background refetch
      setArchiveConfirmModalOpened(false);
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to archive release');
      showErrorToast({ message: errorMessage });
    }
  };

  // Only show archive option if release is not already archived
  const canArchive = status !== ReleaseStatus.ARCHIVED;

  return (
    <>
      <Card
        shadow="sm"
        padding={0}
        radius="md"
        withBorder
        className="overflow-hidden hover:shadow-md transition-all duration-200 border-gray-200 bg-white"
        style={{ 
          width: '100%', 
          position: 'relative',
          borderColor: theme.colors.gray[2],
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.colors.brand[3];
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.colors.gray[2];
        }}
      >
        {/* Header Section - Clickable Link Overlay */}
        <Link
          to={releaseUrl}
          className="block no-underline"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Box
            p="md"
            style={{
              backgroundColor: theme.colors.brand[0],
              borderBottom: `1px solid ${theme.colors.brand[2]}`,
              cursor: 'pointer',
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
              {/* Left: Branch and Type */}
              <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                <Group gap="sm" align="center" wrap="nowrap">
                  {release.branch ? (
                    <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0 }}>
                      <IconGitBranch size={16} color={theme.colors.brand[7]} />
                      <Text 
                        fw={600} 
                        size="md" 
                        c="dark" 
                        className="truncate font-mono"
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        {release.branch}
                      </Text>
                    </Group>
                  ) : (
                    <Text fw={600} size="md" c="dimmed">
                      No branch
                    </Text>
                  )}
                </Group>
                
                {/* Release Type and Status Badges - Combined with Active Status */}
                <Group gap="xs" wrap="wrap">
                  <Badge
                    size="sm"
                    variant="light"
                    color={getReleaseTypeColor(release.type)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {release.type.toLowerCase()}
                  </Badge>
                  
                  {phase && (
                    <Badge
                      size="sm"
                      variant="light"
                      color={getPhaseColor(phase)}
                    >
                      {getPhaseLabel(phase)}
                    </Badge>
                  )}
                  
                  {status && !isPaused && (
                    <Badge
                      size="sm"
                      variant="light"
                      color={getReleaseStatusColor(status)}
                    >
                      {getReleaseStatusLabel(status)}
                    </Badge>
                  )}

                  {/* Show active status combined with paused if applicable */}
                  {isPaused ? (
                    <Badge
                      size="sm"
                      variant="light"
                      color="orange"
                      leftSection={<IconPlayerPause size={12} />}
                    >
                      Paused
                    </Badge>
                  ) : activeStatus && activeStatus !== ReleaseStatus.COMPLETED ? (
                    <Badge
                      size="sm"
                      variant="light"
                      color={activeStatusColor}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {activeStatus}
                    </Badge>
                  ) : null}
                </Group>
              </Stack>

              {/* Right: Release Config Name and Menu */}
              <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                {releaseConfig && (
                  <Box
                    onClick={handleConfigClick}
                    style={{
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative',
                    }}
                  >
                    <Text
                      size="sm"
                      fw={500}
                      c="brand"
                      className="hover:underline"
                    >
                      <Group gap={4}>
                        <IconSettings size={14} />
                        <span>{releaseConfig.name}</span>
                      </Group>
                    </Text>
                  </Box>
                )}
                
                {/* Three-dot menu for actions */}
                {canArchive && (
                  <Menu shadow="md" width={200} position="bottom-end">
                    <Menu.Target>
                      <Button
                        variant="subtle"
                        size="xs"
                        p={4}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <IconDots size={16} />
                      </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<IconArchive size={16} />}
                        color="red"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setArchiveConfirmModalOpened(true);
                        }}
                      >
                        {BUTTON_LABELS.ARCHIVE}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
            </Group>
          </Box>
        </Link>

        {/* Content Section - Clickable Link Overlay */}
        <Link
          to={releaseUrl}
          className="block no-underline"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Box p="md" style={{ cursor: 'pointer' }}>
            <Stack gap="md">
              {/* Platform Targets - Compact Display */}
              {release.platformTargetMappings && release.platformTargetMappings.length > 0 && (
                <Box>
                  <Group gap="xs" wrap="wrap">
                    {release.platformTargetMappings.map((mapping: any, idx: number) => (
                      <Badge
                        key={idx}
                        size="md"
                        variant="light"
                        color="brand"
                        leftSection={<PlatformIcon platform={mapping.platform} size={14} />}
                        style={{ textTransform: 'none' }}
                      >
                        {mapping.platform} → {mapping.target}
                        {mapping.version && ` (${mapping.version})`}
                      </Badge>
                    ))}
                  </Group>
                </Box>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Kickoff Date */}
                {release.kickOffDate && (
                  <Box p="xs">
                    <Group gap={4} mb={4}>
                      <IconFlag size={14} color={theme.colors.brand[7]} />
                      <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Kickoff
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c="dark">
                      {formatReleaseDate(release.kickOffDate)}
                    </Text>
                  </Box>
                )}

                {/* Target Date */}
                {release.targetReleaseDate && (
                  <Box p="xs">
                    <Group gap={4} mb={4}>
                      <IconTarget size={14} color={theme.colors.brand[7]} />
                      <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Target
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c="dark">
                      {formatReleaseDate(release.targetReleaseDate)}
                    </Text>
                  </Box>
                )}

                {/* Release Date */}
                {release.releaseDate && (
                  <Box
                    p="xs"
                    style={{
                      backgroundColor: theme.colors.brand[0],
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.colors.brand[2]}`,
                    }}
                  >
                    <Group gap={4} mb={4}>
                      <IconRocket size={14} color={theme.colors.brand[7]} />
                      <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Released
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c="dark">
                      {formatReleaseDate(release.releaseDate)}
                    </Text>
                  </Box>
                )}
              </div>

              {/* Footer - Created Date and Pilot Info */}
              <Divider />
              <Group justify="space-between" align="center">
                <Group gap={6}>
                  <IconClock size={14} color={theme.colors.gray[6]} />
                  <Text size="xs" c="dimmed">
                    Created {formatReleaseDate(release.createdAt)}
                  </Text>
                </Group>
                
                {/* Show pilot info if available, otherwise show created by */}
                {release.releasePilot ? (
                  <Badge
                    size="sm"
                    variant="light"
                    color="brand"
                    style={{ textTransform: 'none' }}
                  >
                    Pilot: {release.releasePilot.name || release.releasePilot.email}
                  </Badge>
                ) : release.releasePilotAccountId ? (
                  <Badge
                    size="sm"
                    variant="light"
                    color="brand"
                    style={{ textTransform: 'none' }}
                  >
                    Pilot: Unknown
                  </Badge>
                ) : release.createdBy ? (
                  <Badge
                    size="sm"
                    variant="light"
                    color="brand"
                    style={{ textTransform: 'none' }}
                  >
                    Created by: Unknown
                  </Badge>
                ) : null}
              </Group>
            </Stack>
          </Box>
        </Link>
      </Card>

      {/* Configuration Preview Modal - Outside Link to prevent navigation */}
      {releaseConfig && (
        <ConfigurationPreviewModal
          opened={configModalOpened}
          onClose={() => setConfigModalOpened(false)}
          config={releaseConfig}
        />
      )}

      {/* Archive Confirmation Modal */}
      <Modal
        opened={archiveConfirmModalOpened}
        onClose={() => setArchiveConfirmModalOpened(false)}
        title="Archive Release"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to archive this release? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setArchiveConfirmModalOpened(false)}>
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={handleArchive}
              loading={archiveMutation.isLoading}
            >
              Archive Release
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
});
