/**
 * Release Card Component
 * Displays a single release in a modern card format with gradient header
 */

import { memo } from 'react';
import { Link } from '@remix-run/react';
import { Badge, Group, Stack, Card, Box, useMantineTheme, Text } from '@mantine/core';
import { IconClock, IconTarget, IconFlag, IconSettings, IconRocket, IconCheck } from '@tabler/icons-react';
import { useReleaseConfigs } from '~/hooks/useReleaseConfigs';
import { formatReleaseDate, getReleaseTypeGradient, getReleaseActiveStatus, getActiveStatusColor } from '~/utils/release-utils';
import { PlatformIcon } from '~/components/Releases/PlatformIcon';
import type { ReleaseCardProps } from '~/types/release';



/**
 * Release Card Component - Modern Full Width Design
 */
export const ReleaseCard = memo(function ReleaseCard({ 
  release, 
  org
}: ReleaseCardProps) {
  const theme = useMantineTheme();
  console.log(theme)
  
  // Get release config info
  const { configs } = useReleaseConfigs(org);
  const releaseConfig = release.releaseConfigId 
    ? configs.find((c) => c.id === release.releaseConfigId)
    : null;

  // Get active status
  const activeStatus = getReleaseActiveStatus(release);
  const activeStatusColor = getActiveStatusColor(activeStatus);

  return (
    <Link
      to={`/dashboard/${org}/releases/${release.id}`}
      className="block no-underline"
    >
        <Card
          shadow="md"
          padding={0}
          radius="lg"
          withBorder
          className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300 cursor-pointer"
          style={{ width: '100%' }}
        >
          {/* Gradient Header - Reduced height and less bold */}
          <Box
            style={{
              background: getReleaseTypeGradient(release.type),
              padding: '12px 20px',
              position: 'relative',
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap="md" align="center" wrap="nowrap">
                {release.branch ? (
                  <Text fw={600} size="lg" c="white" className="truncate font-mono">
                    {release.branch}
                  </Text>
                ) : (
                <Text fw={600} size="lg" c="white" className="truncate">
                    No branch
                </Text>
                )}
                {release.platformTargetMappings && release.platformTargetMappings.length > 0 && (
                  <Group gap="xs">
                    {release.platformTargetMappings.map((mapping: any, idx: number) => (
                      <Badge
                        key={idx}
                        size="sm"
                        variant="light"
                        className="bg-white/20 text-white border-white/30"
                      >
                        {mapping.platform}: {mapping.version || 'N/A'}
                      </Badge>
                    ))}
                  </Group>
                )}
                <Badge
                  size="sm"
                  variant="light"
                  className="bg-white/20 text-white border-white/30"
                >
                  {release.status.replace('_', ' ')}
                </Badge>
                <Badge
                  size="sm"
                  variant="light"
                  className="bg-white/20 text-white border-white/30"
                >
                  {release.type}
                </Badge>
                <Badge
                  size="sm"
                  variant="light"
                  className="bg-white/20 text-white border-white/30"
                >
                  {activeStatus}
                </Badge>
              </Group>
            </Group>
          </Box>

          {/* Content Section */}
          <Box p="lg">
            <Stack gap="md">
              {/* Platform Targets with Icons */}
              {release.platformTargetMappings && release.platformTargetMappings.length > 0 && (
                <div>
                  <Text size="xs" fw={600} c="dimmed" className="mb-2 uppercase tracking-wide">
                    Platforms & Targets
                  </Text>
                  <Group gap="xs">
                    {release.platformTargetMappings.map((mapping: any, idx: number) => (
                      <Badge
                        key={idx}
                        size="lg"
                        variant="light"
                        color="blue"
                        leftSection={<PlatformIcon platform={mapping.platform} />}
                        className="px-3 py-1"
                      >
                        {mapping.platform} → {mapping.target}
                      </Badge>
                    ))}
                  </Group>
                </div>
              )}

              {/* Release Config Info */}
              {releaseConfig && (
                <div>
                  <Text size="xs" fw={600} c="dimmed" className="mb-2 uppercase tracking-wide">
                    Release Configuration
                  </Text>
                  <Group gap="md">
                    <Badge
                      size="lg"
                      variant="light"
                      color="violet"
                      leftSection={<IconSettings size={14} />}
                      className="px-3 py-1"
                    >
                      {releaseConfig.name}
                    </Badge>
                    {releaseConfig.releaseType && (
                      <Badge size="sm" variant="outline" color="violet">
                        {releaseConfig.releaseType}
                      </Badge>
                    )}
                    {releaseConfig.scheduling?.regressionSlots && releaseConfig.scheduling.regressionSlots.length > 0 && (
                      <Badge size="sm" variant="outline" color="green">
                        {releaseConfig.scheduling.regressionSlots.length} Regression Slot{releaseConfig.scheduling.regressionSlots.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </Group>
                </div>
              )}

              {/* Stat Cards Grid - Kickoff first, then Target */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Kickoff Date Card - First */}
                {release.kickOffDate && (
                  <Box
                    style={{
                      backgroundColor: theme.other.backgrounds.green,
                      padding: '12px 16px',
                      borderRadius: theme.defaultRadius,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconFlag size={16} color={theme.other.text.green} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Kickoff
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.brand}>
                      {formatReleaseDate(release.kickOffDate)}
                    </Text>
                  </Box>
                )}

                {/* Target Date Card - Second */}
                {release.targetReleaseDate && (
                  <Box
                    style={{
                      backgroundColor: theme.other.backgrounds.blue,
                      padding: '12px 16px',
                      borderRadius: theme.defaultRadius,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconTarget size={16} color={theme.colors.brand[0]} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Target Date
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.brand}>
                      {formatReleaseDate(release.targetReleaseDate)}
                    </Text>
                  </Box>
                )}

                {/* Release Date Card */}
                {release.releaseDate && (
                  <Box
                    style={{
                      backgroundColor: theme.other.backgrounds.lightGreen,
                      padding: '12px 16px',
                      borderRadius: theme.defaultRadius,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconRocket size={16} color={theme.other.text.green} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Released
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.brand}>
                      {formatReleaseDate(release.releaseDate)}
                    </Text>
                  </Box>
                )}

                {/* Tasks Count Card */}
                {release.tasks && release.tasks.length > 0 && (
                  <Box
                    style={{
                      backgroundColor: theme.other.backgrounds.active,
                      padding: '12px 16px',
                      borderRadius: theme.defaultRadius,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconCheck size={16} color={theme.colors.brand[0]} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Tasks
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.brand}>
                      {release.tasks.length} task{release.tasks.length !== 1 ? 's' : ''}
                    </Text>
                  </Box>
                )}
              </div>

              {/* Footer with Created Date */}
              <Group justify="space-between" className="pt-2 border-t border-gray-200">
                <Group gap="xs">
                  <IconClock size={14} color={theme.other.text.tertiary} />
                  <Text size="xs" c="dimmed">
                    Created {formatReleaseDate(release.createdAt)}
                  </Text>
                </Group>
              </Group>
            </Stack>
          </Box>
        </Card>
    </Link>
  );
});

