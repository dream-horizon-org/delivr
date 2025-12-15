/**
 * Configuration List Item Component
 * Display a single configuration in the list
 */

import { useState } from 'react';
import {
  Card,
  Text,
  Badge,
  Group,
  ActionIcon,
  Tooltip,
  Menu,
  Button,
  Box,
  Stack,
  Paper,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import {
  IconDots,
  IconEdit,
  IconCopy,
  IconArchive,
  IconDownload,
  IconStar,
  IconStarFilled,
  IconDeviceMobile,
  IconBrandAndroid,
  IconBrandApple,
  IconCalendar,
  IconTarget,
  IconEye,
  IconGitBranch,
} from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { ConfigurationListItemProps } from '~/types/release-config-props';
import { PLATFORMS } from '~/types/release-config-constants';
import { ConfigurationPreviewModal } from './ConfigurationPreviewModal';

// Helper to get status display from isActive field or draft status
const getStatusDisplay = (config: any) => {
  if (config.status === 'DRAFT') {
    return { label: 'DRAFT', color: 'yellow' };
  }
  return config.isActive
    ? { label: 'ACTIVE', color: 'green' }
    : { label: 'ARCHIVED', color: 'gray' };
};

const releaseTypeColors: Record<string, string> = {
  MINOR: 'blue',
  HOTFIX: 'orange',
  MAJOR: 'red',
};

export function ConfigurationListItem({
  config,
  onEdit,
  onDuplicate,
  onArchive,
  onExport,
  onSetDefault,
}: ConfigurationListItemProps) {
  const theme = useMantineTheme();
  const [previewOpened, setPreviewOpened] = useState(false);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusDisplay = getStatusDisplay(config);
  const isDraft = config.status === 'DRAFT';
  const releaseTypeColor = releaseTypeColors[config.releaseType] || 'blue';

  // Platform icons mapping
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case PLATFORMS.ANDROID:
        return <IconBrandAndroid size={16} />;
      case PLATFORMS.IOS:
        return <IconBrandApple size={16} />;
      default:
        return <IconDeviceMobile size={16} />;
    }
  };

  return (
    <Card shadow="sm" padding={0} radius="md" withBorder>
      {/* Header */}
      <Paper
        p="md"
        radius="md"
        style={{
          backgroundColor: theme.colors.brand[0],
          borderBottom: `1px solid ${theme.colors.slate[2]}`,
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" mb="xs">
              <Text fw={600} size="md" c={theme.colors.slate[9]}>
                {config.name}
              </Text>
              {config.isDefault && (
                <Tooltip label="Default Configuration">
                  <ThemeIcon size={20} radius="xl" variant="light" color="yellow">
                    <IconStarFilled size={12} />
                  </ThemeIcon>
                </Tooltip>
              )}
            </Group>

            <Group gap="xs">
              <Badge size="sm" variant="light" color={statusDisplay.color}>
                {statusDisplay.label}
              </Badge>
              <Badge size="sm" variant="light" color={releaseTypeColor}>
                {config.releaseType}
              </Badge>
            </Group>
          </Box>

          <Group gap="xs">
            <Tooltip label="Preview Configuration">
              <ActionIcon
                variant="subtle"
                color="brand"
                size="md"
                onClick={() => setPreviewOpened(true)}
              >
                <IconEye size={18} />
              </ActionIcon>
            </Tooltip>

            <Menu
              shadow="md"
              width={220}
              radius="md"
              position="bottom-end"
              styles={{
                dropdown: {
                  padding: theme.spacing.xs,
                  border: `1px solid ${theme.colors.slate[2]}`,
                },
                item: {
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.sm,
                  fontSize: theme.fontSizes.sm,
                  fontWeight: 500,
                },
                itemLabel: {
                  fontSize: theme.fontSizes.sm,
                },
                divider: {
                  margin: `${theme.spacing.xs} 0`,
                  borderColor: theme.colors.slate[2],
                },
              }}
            >
              <Menu.Target>
                <ActionIcon variant="subtle" color="brand" size="md">
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEdit size={16} stroke={1.5} />}
                  onClick={onEdit}
                >
                  {isDraft ? 'Continue Editing' : 'Edit Configuration'}
                </Menu.Item>

                {!isDraft && !config.isDefault && (
                  <Menu.Item
                    leftSection={<IconStar size={16} stroke={1.5} />}
                    onClick={onSetDefault}
                  >
                    Set as Default
                  </Menu.Item>
                )}

                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconArchive size={16} stroke={1.5} />}
                  onClick={onArchive}
                  disabled={!isDraft && config.isActive === false}
                  color="red"
                >
                  {isDraft ? 'Delete Draft' : 'Archive'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Paper>

      {/* Content */}
      <Stack gap="md" p="md">
        {config.description && (
          <Text size="sm" c={theme.colors.slate[6]} lineClamp={2}>
            {config.description}
          </Text>
        )}

        {/* Platforms & Targets */}
        <Box>
          <Text size="xs" fw={600} c={theme.colors.slate[5]} mb="xs" tt="uppercase">
            Platforms & Targets
          </Text>
          <Group gap="xs">
            {config.platforms?.map((platform) => (
              <Badge
                key={platform}
                variant="light"
                color="brand"
                leftSection={getPlatformIcon(platform)}
                size="sm"
              >
                {platform}
              </Badge>
            ))}

            {config.targets?.map((target) => (
              <Badge key={target} variant="outline" color="gray" size="sm">
                {target.replace(/_/g, ' ')}
              </Badge>
            ))}
          </Group>
        </Box>

        {/* Branch & Stats */}
        <Group gap="md">
          {config.baseBranch && (
            <Paper
              p="xs"
              radius="sm"
              style={{
                backgroundColor: theme.colors.blue[0],
                border: `1px solid ${theme.colors.blue[2]}`,
              }}
            >
              <Group gap="xs">
                <IconGitBranch size={14} color={theme.colors.blue[7]} />
                <Text size="xs" fw={500} c={theme.colors.blue[7]}>
                  {config.baseBranch}
                </Text>
              </Group>
            </Paper>
          )}

          {config.releaseSchedule && (
            <>
              <Paper
                p="xs"
                radius="sm"
                style={{
                  backgroundColor: theme.colors.indigo[0],
                  border: `1px solid ${theme.other.borders.brand}`,
                }}
              >
                <Group gap="xs">
                  <IconCalendar size={14} color={theme.other.borders.brand} />
                  <Text size="xs" fw={500} c={theme.other.borders.brand}>
                    {config.releaseSchedule.releaseFrequency}
                  </Text>
                </Group>
              </Paper>

              {config.releaseSchedule.regressionSlots && config.releaseSchedule.regressionSlots.length > 0 && (
                <Paper
                  p="xs"
                  radius="sm"
                  style={{
                    backgroundColor: theme.colors.green[0],
                    border: `1px solid ${theme.colors.green[2]}`,
                  }}
                >
                  <Group gap="xs">
                    <IconTarget size={14} color={theme.colors.green[7]} />
                    <Text size="xs" fw={500} c={theme.colors.green[7]}>
                      {config.releaseSchedule.regressionSlots.length} slots
                    </Text>
                  </Group>
                </Paper>
              )}
            </>
          )}
        </Group>

        {/* Footer */}
        <Group justify="space-between" pt="sm" style={{ borderTop: `1px solid ${theme.colors.slate[2]}` }}>
          {config.updatedAt && (
            <Text size="xs" c={theme.colors.slate[5]}>
              Updated {formatRelativeTime(config.updatedAt)}
            </Text>
          )}

          <Button
            size="xs"
            variant="light"
            color="brand"
            leftSection={<IconEdit size={14} />}
            onClick={onEdit}
          >
            Edit
          </Button>
        </Group>
      </Stack>

      <ConfigurationPreviewModal
        opened={previewOpened}
        onClose={() => setPreviewOpened(false)}
        config={config}
      />
    </Card>
  );
}
