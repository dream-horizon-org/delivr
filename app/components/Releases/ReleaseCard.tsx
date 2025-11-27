/**
 * Release Card Component
 * Displays a single release in a modern card format with gradient header
 */

import { memo } from 'react';
import { Link } from '@remix-run/react';
import { Badge, Group, Stack, Button, Modal, Card, Box, useMantineTheme, ActionIcon, Menu, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconClock, IconTarget, IconFlag, IconSettings, IconDots, IconTrash, IconRocket, IconCheck } from '@tabler/icons-react';
import { useReleaseConfigs } from '~/hooks/useReleaseConfigs';
import { apiDelete, getApiErrorMessage } from '~/utils/api-client';
import { showSuccessToast, showErrorToast } from '~/utils/toast';
import { RELEASE_MESSAGES } from '~/constants/toast-messages';
import { formatReleaseDate, getReleaseTypeGradient } from '~/utils/release-utils';
import { PlatformIcon } from '~/components/Releases/PlatformIcon';
import type { ReleaseCardProps } from '~/types/release';

/**
 * Release Card Component - Modern Full Width Design
 */
export const ReleaseCard = memo(function ReleaseCard({ 
  release, 
  org, 
  onDelete 
}: ReleaseCardProps) {
  const theme = useMantineTheme();
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  
  // Get release config info
  const { configs } = useReleaseConfigs(org);
  const releaseConfig = release.releaseConfigId 
    ? configs.find((c) => c.id === release.releaseConfigId)
    : null;

  const handleDelete = async () => {
    try {
      const result = await apiDelete(`/api/v1/tenants/${org}/releases/${release.id}`);

      if (result.success) {
        showSuccessToast(RELEASE_MESSAGES.DELETE_SUCCESS);
        closeDelete();
        // Notify parent to invalidate cache and refresh the list
        onDelete(release.id);
      } else {
        showErrorToast({
          title: RELEASE_MESSAGES.DELETE_ERROR.title,
          message: result.error || RELEASE_MESSAGES.DELETE_ERROR.message,
        });
      }
    } catch (error) {
      showErrorToast({
        title: RELEASE_MESSAGES.DELETE_ERROR.title,
        message: getApiErrorMessage(error, RELEASE_MESSAGES.DELETE_ERROR.message),
      });
    }
  };

  return (
    <>
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
              <div className="flex-1 min-w-0">
                <Group gap="md" align="center" wrap="nowrap">
                  <Text fw={600} size="lg" c="white" className="truncate">
                    {release.releaseId}
                  </Text>
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
                </Group>
              </div>

              {/* Three Dots Menu */}
              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                    }}
                  >
                    <IconDots size={20} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDelete();
                    }}
                  >
                    Delete Release
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
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
                      borderRadius: theme.other.borderRadius.md,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconFlag size={16} color={theme.other.text.green} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Kickoff
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.primary}>
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
                      borderRadius: theme.other.borderRadius.md,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconTarget size={16} color={theme.other.brand.primary} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Target Date
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.primary}>
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
                      borderRadius: theme.other.borderRadius.md,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconRocket size={16} color={theme.other.text.green} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Released
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.primary}>
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
                      borderRadius: theme.other.borderRadius.md,
                    }}
                  >
                    <Group gap="xs" className="mb-1">
                      <IconCheck size={16} color={theme.other.brand.primary} />
                      <Text size="xs" fw={600} c="dimmed" className="uppercase">
                        Tasks
                      </Text>
                    </Group>
                    <Text size="sm" fw={600} c={theme.other.text.primary}>
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

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={closeDelete}
        title="Delete Release"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <strong>{release.releaseId}</strong>? This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={closeDelete}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
});

