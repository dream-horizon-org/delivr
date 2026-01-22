/**
 * ConfigurationsList Component
 * Handles rendering of configurations list with loading, empty, and filtered states
 */

import { memo } from 'react';
import {
  Center,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Paper,
  Button,
  Box,
  useMantineTheme,
} from '@mantine/core';
import { IconSettings, IconArchive, IconPlus } from '@tabler/icons-react';
import { ConfigurationListItem } from './ConfigurationListItem';
import type { ReleaseConfiguration } from '~/types/release-config';

export interface ConfigurationsListProps {
  configurations: ReleaseConfiguration[];
  filteredConfigs: ReleaseConfiguration[];
  isLoading: boolean;
  onEdit: (config: ReleaseConfiguration) => void;
  onDuplicate: (config: ReleaseConfiguration) => void;
  onArchive: (configId: string) => void;
  onUnarchive: (configId: string) => void;
  onDelete: (configId: string) => void;
  onExport: (config: ReleaseConfiguration) => void;
  onSetDefault: (configId: string) => void;
  onCreate: () => void;
  onClearFilters: () => void;
}

export const ConfigurationsList = memo(function ConfigurationsList({
  configurations,
  filteredConfigs,
  isLoading,
  onEdit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onExport,
  onSetDefault,
  onCreate,
  onClearFilters,
}: ConfigurationsListProps) {
  const theme = useMantineTheme();

  // Loading state
  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={200} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  // List with results
  if (filteredConfigs.length > 0) {
    return (
      <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
        {filteredConfigs.map((config) => (
          <ConfigurationListItem
            key={config.id}
            config={config}
            onEdit={() => onEdit(config)}
            onDuplicate={() => onDuplicate(config)}
            onArchive={() => onArchive(config.id)}
            onUnarchive={() => onUnarchive(config.id)}
            onDelete={() => onDelete(config.id)}
            onExport={() => onExport(config)}
            onSetDefault={() => onSetDefault(config.id)}
          />
        ))}
      </SimpleGrid>
    );
  }

  // Empty state (no configurations at all)
  if (configurations.length === 0) {
    return (
      <Center py={60}>
        <Stack align="center" gap="lg" maw={400}>
          <ThemeIcon size={80} radius="xl" variant="light" color="brand">
            <IconSettings size={40} />
          </ThemeIcon>
          <Box ta="center">
            <Text size="xl" fw={600} c={theme.colors.slate[8]} mb={8}>
              No configurations yet
            </Text>
            <Text size="sm" c={theme.colors.slate[5]} mb={24}>
              Create your first release configuration to standardize your release process
              with versioning rules, approval workflows, and deployment strategies.
            </Text>
          </Box>
          <Button
            size="md"
            color="brand"
            leftSection={<IconPlus size={18} />}
            onClick={onCreate}
          >
            Create Configuration
          </Button>
        </Stack>
      </Center>
    );
  }

  // Filtered empty state (configurations exist but filters don't match)
  return (
    <Paper
      p="xl"
      radius="md"
      style={{
        backgroundColor: theme.colors.slate[0],
        border: `2px dashed ${theme.colors.slate[3]}`,
      }}
    >
      <Center py={40}>
        <Stack align="center" gap="md">
          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
            <IconArchive size={24} />
          </ThemeIcon>
          <Text size="sm" c={theme.colors.slate[5]} ta="center">
            No configurations match your filters.
            <br />
            Try adjusting your search or filter criteria.
          </Text>
          <Button
            variant="light"
            color="gray"
            size="sm"
            onClick={onClearFilters}
          >
            Clear Filters
          </Button>
        </Stack>
      </Center>
    </Paper>
  );
});

