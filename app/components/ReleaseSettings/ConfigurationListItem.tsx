/**
 * Configuration List Item Component
 * Display a single configuration in the list
 */

import { useState } from 'react';
import {
  Card,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Menu,
  Box,
  Stack,
  Paper,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import {
  IconDots,
  IconEdit,
  IconArchive,
  IconStar,
  IconStarFilled,
  IconCalendar,
  IconTarget,
  IconEye,
  IconGitBranch,
  IconTrain,
  IconTrash,
  IconRefresh,
} from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { ConfigurationListItemProps } from '~/types/release-config-props';
import { getPlatformsFromPlatformTargets, getTargetsFromPlatformTargets, formatTargetPlatformName } from '~/utils/platform-utils';
import { 
  getPlatformIcon, 
  getReleaseConfigStatusDisplay, 
  getReleaseConfigTypeColor 
} from '~/utils/release-config-ui.utils';
import { formatRelativeTimeCompact } from '~/utils/time-utils';
import { ConfigurationPreviewModal } from './ConfigurationPreviewModal';
import { AppBadge, PlatformBadge, TargetBadge } from '~/components/Common/AppBadge';

// ============================================================================
// Sub-Components
// ============================================================================

interface ConfigurationCardActionsProps {
  config: ReleaseConfiguration;
  isDraft: boolean;
  theme: ReturnType<typeof useMantineTheme>;
  onEdit: () => void;
  onSetDefault: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

function ConfigurationCardActions({
  config,
  isDraft,
  theme,
  onEdit,
  onSetDefault,
  onArchive,
  onUnarchive,
  onDelete,
}: ConfigurationCardActionsProps) {
  return (
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
          disabled={!isDraft && config.isActive === false}
        >
          {isDraft ? 'Continue Editing' : 'Edit Configuration'}
        </Menu.Item>

        {!isDraft && !config.isDefault && config.isActive && (
          <Menu.Item
            leftSection={<IconStar size={16} stroke={1.5} />}
            onClick={onSetDefault}
          >
            Set as Default
          </Menu.Item>
        )}

        <Menu.Divider />

        {!isDraft && config.isActive && (
          <Menu.Item
            leftSection={<IconArchive size={16} stroke={1.5} />}
            onClick={onArchive}
            color="red"
          >
            Archive
          </Menu.Item>
        )}

        {!isDraft && config.isActive === false && (
          <>
            <Menu.Item
              leftSection={<IconRefresh size={16} stroke={1.5} />}
              onClick={onUnarchive}
            >
              Unarchive
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconTrash size={16} stroke={1.5} />}
              onClick={onDelete}
              color="red"
            >
              Delete
            </Menu.Item>
          </>
        )}

        {isDraft && (
          <Menu.Item
            leftSection={<IconArchive size={16} stroke={1.5} />}
            onClick={onArchive}
            color="red"
          >
            Delete Draft
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

interface ConfigurationCardHeaderProps {
  config: ReleaseConfiguration;
  statusDisplay: { label: string; color: string };
  releaseTypeColor: string;
  theme: ReturnType<typeof useMantineTheme>;
  onPreview: () => void;
  onEdit: () => void;
  onSetDefault: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  isDraft: boolean;
}

function ConfigurationCardHeader({
  config,
  statusDisplay,
  releaseTypeColor,
  theme,
  onPreview,
  onEdit,
  onSetDefault,
  onArchive,
  onUnarchive,
  onDelete,
  isDraft,
}: ConfigurationCardHeaderProps) {
  return (
    <Paper
      p="md"
      radius="md"
      style={{
        backgroundColor: theme.colors.brand[0],
        borderBottom: `1px solid ${theme.colors.slate[2]}`,
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb="xs" wrap="nowrap">
          {config.isDefault && (
              <Tooltip label="Default Configuration">
                <ThemeIcon size={20} radius="xl" variant="light" color="yellow">
                  <IconStarFilled size={12} />
                </ThemeIcon>
              </Tooltip>
            )}
            <Text 
              fw={600} 
              size="md" 
              c={theme.colors.slate[9]}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.5,
                
              }}
            >
              {config.name}
            </Text>
            
          </Group>

          <Group gap="xs">
            <AppBadge
              type="status"
              value={statusDisplay.color === 'green' ? 'success' : statusDisplay.color === 'red' ? 'error' : statusDisplay.color === 'yellow' ? 'warning' : 'info'}
              title={statusDisplay.label}
              size="sm"
              color={statusDisplay.color}
            />
            <AppBadge
              type="release-type"
              value={config.releaseType}
              title={config.releaseType}
              size="sm"
              color={releaseTypeColor}
            />
            {config.releaseSchedule && (
              <AppBadge
                type="status"
                value="info"
                title="Release Train"
                size="sm"
                color="indigo"
                leftSection={<IconTrain size={12} />}
              />
            )}
          </Group>
        </Box>

        <Group gap="xs">
          <Tooltip label="Preview Configuration">
            <ActionIcon
              variant="subtle"
              color="brand"
              size="md"
              onClick={onPreview}
            >
              <IconEye size={18} />
            </ActionIcon>
          </Tooltip>

          <ConfigurationCardActions
            config={config}
            isDraft={isDraft}
            theme={theme}
            onEdit={onEdit}
            onSetDefault={onSetDefault}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
          />
        </Group>
      </Group>
    </Paper>
  );
}

interface PlatformsAndTargetsSectionProps {
  platformTargets: ReleaseConfiguration['platformTargets'];
  theme: ReturnType<typeof useMantineTheme>;
}

function PlatformsAndTargetsSection({
  platformTargets,
  theme,
}: PlatformsAndTargetsSectionProps) {
  if (!platformTargets || platformTargets.length === 0) {
    return (
      <Text size="xs" c={theme.colors.slate[4]}>
        No platforms configured
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      <Box>
        <Text size="xs" c={theme.colors.slate[4]} mb={4}>
          Platforms:
        </Text>
        <Group gap="xs">
          {getPlatformsFromPlatformTargets(platformTargets).map((platform) => (
            <PlatformBadge
              key={platform}
              platform={platform}
              size="sm"
            />
          ))}
        </Group>
      </Box>
      
      <Box>
        <Text size="xs" c={theme.colors.slate[4]} mb={4}>
          Targets:
        </Text>
        <Group gap="xs">
          {getTargetsFromPlatformTargets(platformTargets).map((target) => (
            <TargetBadge
              key={target}
              target={target}
              size="sm"
            />
          ))}
        </Group>
      </Box>
    </Stack>
  );
}

interface BranchAndStatsSectionProps {
  baseBranch?: string;
  releaseSchedule?: ReleaseConfiguration['releaseSchedule'];
  theme: ReturnType<typeof useMantineTheme>;
}

function BranchAndStatsSection({
  baseBranch,
  releaseSchedule,
  theme,
}: BranchAndStatsSectionProps) {
  return (
    <Group gap="md" style={{ minHeight: '28px' }}>
      {baseBranch && (
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
              {baseBranch}
            </Text>
          </Group>
        </Paper>
      )}

      {releaseSchedule && (
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
                {releaseSchedule.releaseFrequency}
              </Text>
            </Group>
          </Paper>

          {releaseSchedule.regressionSlots && releaseSchedule.regressionSlots.length > 0 && (
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
                  {releaseSchedule.regressionSlots.length} slots
                </Text>
              </Group>
            </Paper>
          )}
        </>
      )}
    </Group>
  );
}

interface ConfigurationCardFooterProps {
  updatedAt: string;
  theme: ReturnType<typeof useMantineTheme>;
}

function ConfigurationCardFooter({
  updatedAt,
  theme,
}: ConfigurationCardFooterProps) {
  if (!updatedAt) return null;

  return (
    <Box 
      pt="sm" 
      style={{ 
        borderTop: `1px solid ${theme.colors.slate[2]}`,
        marginTop: 'auto',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Text size="xs" c={theme.colors.slate[5]}>
        Updated {formatRelativeTimeCompact(updatedAt)}
      </Text>
    </Box>
  );
}

interface ConfigurationCardContentProps {
  config: ReleaseConfiguration;
  theme: ReturnType<typeof useMantineTheme>;
}

function ConfigurationCardContent({
  config,
  theme,
}: ConfigurationCardContentProps) {
  return (
    <Box
      p="md"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '220px',
      }}
    >
      <Stack gap="md" style={{ flex: 1 }}>
        

        <Box>
          <PlatformsAndTargetsSection
            platformTargets={config.platformTargets}
            theme={theme}
          />
        </Box>

        <Box>
          <BranchAndStatsSection
            baseBranch={config.baseBranch}
            releaseSchedule={config.releaseSchedule}
            theme={theme}
          />
        </Box>
      </Stack>

      <ConfigurationCardFooter
        updatedAt={config.updatedAt}
        theme={theme}
      />
    </Box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConfigurationListItem({
  config,
  onEdit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onExport,
  onSetDefault,
}: ConfigurationListItemProps) {
  const theme = useMantineTheme();
  const [previewOpened, setPreviewOpened] = useState(false);

  const statusDisplay = getReleaseConfigStatusDisplay(config);
  const isDraft = config.status === 'DRAFT';
  const releaseTypeColor = getReleaseConfigTypeColor(config.releaseType);

  return (
    <Card 
      shadow="sm" 
      padding={0} 
      radius="md" 
      withBorder
      style={{
        cursor: 'pointer',
        transition: 'all 200ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.md;
        e.currentTarget.style.borderColor = theme.colors.brand[4];
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = theme.shadows.sm;
        e.currentTarget.style.borderColor = theme.colors.slate[2];
      }}
    >
      <ConfigurationCardHeader
        config={config}
        statusDisplay={statusDisplay}
        releaseTypeColor={releaseTypeColor}
        theme={theme}
        onPreview={() => setPreviewOpened(true)}
        onEdit={onEdit}
        onSetDefault={onSetDefault}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
        isDraft={isDraft}
      />

      <ConfigurationCardContent
        config={config}
        theme={theme}
      />

      <ConfigurationPreviewModal
        opened={previewOpened}
        onClose={() => setPreviewOpened(false)}
        config={config}
      />
    </Card>
  );
}
