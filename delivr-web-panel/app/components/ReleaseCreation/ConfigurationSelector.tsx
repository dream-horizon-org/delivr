/**
 * Configuration Selector Component
 * 
 * Dropdown selector with preview card for selected configuration.
 * Replaces the multi-card view with a cleaner dropdown + preview approach.
 */

import { useState } from 'react';
import { Box, Text, Group, Stack, Button, Select, ActionIcon, useMantineTheme } from '@mantine/core';
import { IconAdjustmentsHorizontal, IconPlus, IconEye } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import { ConfigurationPreviewModal } from '~/components/ReleaseSettings/ConfigurationPreviewModal';
import { PLATFORM_LABELS, TARGET_PLATFORM_LABELS } from '~/constants/release-config-ui';
import { PLATFORMS, RELEASE_TYPES } from '~/types/release-config-constants';
import { AppBadge } from '~/components/Common/AppBadge';

interface ConfigurationSelectorProps {
  configurations: ReleaseConfiguration[];
  selectedMode: 'WITH_CONFIG' | 'MANUAL'; // Keep for compatibility
  selectedConfigId?: string;
  onModeChange: (mode: 'WITH_CONFIG' | 'MANUAL') => void; // Keep for compatibility
  onConfigSelect: (configId: string) => void;
  onCreateNew?: () => void;
  onClone?: (configId: string) => void;
  errors?: Record<string, string>;
}

export function ConfigurationSelector({
  configurations,
  selectedConfigId,
  onConfigSelect,
  onCreateNew,
  errors = {},
}: ConfigurationSelectorProps) {
  const theme = useMantineTheme();
  const [previewOpened, setPreviewOpened] = useState(false);
  
  // Filter active configs
  const activeConfigs = configurations.filter((c) => c.isActive === true);

  // Get selected config for preview
  const selectedConfig = activeConfigs.find((c) => c.id === selectedConfigId);

  // Prepare dropdown options
  const configOptions = activeConfigs.map((config) => ({
    value: config.id,
    label: config.name,
  }));

  // Get build type label
  const getBuildTypeLabel = (config: ReleaseConfiguration): string => {
    return config.hasManualBuildUpload ? 'Manual' : 'CI/CD';
  };

  // Get targeted platforms (platform → target)
  const getTargetedPlatforms = (config: ReleaseConfiguration): string => {
    if (!config.platformTargets || config.platformTargets.length === 0) {
      return 'No targets';
    }
    return config.platformTargets
      .map((pt) => {
        // Map platform to label
        const platformLabel = pt.platform === PLATFORMS.ANDROID
          ? PLATFORM_LABELS.ANDROID
          : pt.platform === PLATFORMS.IOS
          ? PLATFORM_LABELS.IOS
          : PLATFORM_LABELS.WEB;
        const targetLabel = TARGET_PLATFORM_LABELS[pt.target as keyof typeof TARGET_PLATFORM_LABELS] || pt.target;
        return `${platformLabel} → ${targetLabel}`;
      })
      .join(', ');
  };

  // Get pipeline count (only show if CI/CD and has workflows)
  const getPipelineCount = (config: ReleaseConfiguration): number | null => {
    if (config.hasManualBuildUpload) {
      return null; // Don't show pipelines for manual builds
    }
    // Workflows are stored in ciConfig.workflows
    const count = config.ciConfig?.workflows?.length || 0;
    return count > 0 ? count : null; // Don't show if 0
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="nowrap">
        <Select
          label="Configuration"
          placeholder="Select a configuration"
          data={configOptions}
          value={selectedConfigId || null}
          onChange={(value) => {
            if (value) {
              onConfigSelect(value);
            }
          }}
          required
          withAsterisk
          searchable
          description="Select a release configuration template to create a new release."
          style={{ flex: 1 }}
          error={errors?.releaseConfigId}
          styles={{
            label: { fontWeight: 500, marginBottom: 6 },
          }}
        />

        {onCreateNew && (
          <Button
            leftSection={<IconPlus size={18} />}
            variant="light"
            onClick={onCreateNew}
          >
            Create New
          </Button>
        )}
      </Group>

      {/* Preview for Selected Configuration */}
      {selectedConfig && (
        <Box
          p="md"
          style={{
            background: theme.colors.blue[0],
            border: `1px solid ${theme.colors.blue[2]}`,
            borderRadius: theme.radius.md,
          }}
        >
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Box style={{ flex: 1 }}>
              <Group gap="xs" mb="xs">
                <IconAdjustmentsHorizontal size={18} color={theme.colors.blue[6]} />
                <Text fw={600} size="md">
                  {selectedConfig.name}
                </Text>

                {selectedConfig.isDefault && (
                  <AppBadge
                    type="status"
                    value="success"
                    title="Default"
                    size="sm"
                  />
                )}

                <AppBadge
                  type="release-type"
                  value={selectedConfig.releaseType || RELEASE_TYPES.MINOR}
                  title={selectedConfig.releaseType || RELEASE_TYPES.MINOR}
                  size="sm"
                  variant="outline"
                />

                <AppBadge
                  type="build-type"
                  value={selectedConfig.hasManualBuildUpload ? 'MANUAL' : 'CI_CD'}
                  title={getBuildTypeLabel(selectedConfig)}
                  size="sm"
                />
              </Group>

              {selectedConfig.description && (
                <Text size="sm" c="dimmed" mb="xs">
                  {selectedConfig.description}
                </Text>
              )}

              <Group gap="lg">
                <Text size="xs" c={theme.colors.slate[6]}>
                  <Text component="span" fw={500}>{getTargetedPlatforms(selectedConfig)}</Text>
                </Text>
                {getPipelineCount(selectedConfig) !== null && (
                  <Text size="xs" c={theme.colors.slate[6]}>
                    <Text component="span" fw={500}>{getPipelineCount(selectedConfig)}</Text> pipelines
                  </Text>
                )}
              </Group>
            </Box>

            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => setPreviewOpened(true)}
              color="blue"
            >
              <IconEye size={20} />
            </ActionIcon>
          </Group>
        </Box>
      )}

      {/* Preview Modal */}
      {selectedConfig && (
        <ConfigurationPreviewModal
          opened={previewOpened}
          onClose={() => setPreviewOpened(false)}
          config={selectedConfig}
        />
      )}

      {activeConfigs.length === 0 && (
        <Box
          p="lg"
          style={{
            border: `1px solid ${theme.colors.slate[2]}`,
            borderRadius: theme.radius.md,
          }}
        >
          <Text c="dimmed" ta="center">
            No configurations found. Click "Create New" to get started.
          </Text>
        </Box>
      )}
    </Stack>
  );
}
