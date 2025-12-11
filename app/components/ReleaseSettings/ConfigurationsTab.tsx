/**
 * Configurations Tab Component
 * Displays release configurations with proper loading, error, and empty states
 */

import { memo, useMemo, useCallback, useState } from 'react';
import { 
  Box, 
  Text, 
  Button, 
  Group, 
  Select, 
  TextInput, 
  SimpleGrid,
  Stack,
  ThemeIcon,
  Center,
  Paper,
  Badge,
  useMantineTheme,
  Skeleton,
} from '@mantine/core';
import { useNavigate } from '@remix-run/react';
import { 
  IconPlus, 
  IconSearch, 
  IconFilter, 
  IconSettings,
  IconFileDescription,
  IconArchive,
  IconAlertCircle,
} from '@tabler/icons-react';
import { ConfigurationListItem } from '~/components/ReleaseSettings/ConfigurationListItem';
import { apiDelete, apiPut, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast, showInfoToast } from '~/utils/toast';
import { RELEASE_CONFIG_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import type { ReleaseConfiguration } from '~/types/release-config';
import { CONFIG_STATUS, RELEASE_TYPE } from '~/constants/release-config-ui';
import { exportConfig } from '~/utils/release-config-storage';
import { generateStorageKey } from '~/hooks/useDraftStorage';
import { useConfig } from '~/contexts/ConfigContext';

interface ConfigurationsTabProps {
  org: string;
  releaseConfigs: ReleaseConfiguration[];
  invalidateReleaseConfigs: () => void;
  isLoading?: boolean;
}

export const ConfigurationsTab = memo(function ConfigurationsTab({
  org,
  releaseConfigs,
  invalidateReleaseConfigs,
  isLoading = false,
}: ConfigurationsTabProps) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const {updateReleaseConfigInCache} = useConfig()

  // Merge backend configs with localStorage draft
  const configurations = useMemo(() => {
    const backendConfigs = releaseConfigs;
    
    // Load draft config from localStorage
    const draftKey = `delivr_release_config_draft_${org}`;
    const stepKey = `delivr_release_config_wizard_step_${org}`;
    let draftConfig = null;
    
    if (typeof window !== 'undefined') {
      try {
        const draftData = localStorage.getItem(draftKey);
        const savedStep = localStorage.getItem(stepKey);
        const currentStep = savedStep ? parseInt(savedStep, 10) : 0;
        
        // Only show draft if user has clicked "Next" at least once (step > 0)
        if (draftData && currentStep > 0) {
          draftConfig = JSON.parse(draftData);
          draftConfig.status = 'DRAFT';
          draftConfig.isActive = false;
          draftConfig.id = draftConfig.id || 'draft-temp-id';
        }
      } catch (error) {
        console.error('[ConfigurationsTab] Failed to load draft config:', error);
      }
    }
    
    return draftConfig ? [draftConfig, ...backendConfigs] : backendConfigs;
  }, [releaseConfigs, org]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: configurations.filter((c: any) => c.status !== 'DRAFT').length,
    active: configurations.filter((c: any) => c.isActive === true).length,
    archived: configurations.filter((c: any) => c.isActive === false && c.status !== 'DRAFT').length,
  }), [configurations]);

  // Filter configurations
  const filteredConfigs = useMemo(() => {
    return configurations.filter((config) => {
      const matchesSearch =
        !searchQuery ||
        config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || 
        (statusFilter === CONFIG_STATUS.DRAFT && config.status === CONFIG_STATUS.DRAFT) ||
        (statusFilter === CONFIG_STATUS.ACTIVE && config.isActive === true) ||
        (statusFilter === CONFIG_STATUS.ARCHIVED && config.isActive === false && config.status !== CONFIG_STATUS.DRAFT);
      
      const matchesType = !typeFilter || config.releaseType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [configurations, searchQuery, statusFilter, typeFilter]);

  // Handlers
  const handleCreate = useCallback(() => {
    navigate(`/dashboard/${org}/releases/configure`);
  }, [navigate, org]);
  
  const handleEdit = useCallback((config: ReleaseConfiguration) => {
    navigate(`/dashboard/${org}/releases/configure?edit=${config.id}`);
  }, [navigate, org]);
  
  const handleDuplicate = useCallback(async (config: ReleaseConfiguration) => {
    showInfoToast(RELEASE_CONFIG_MESSAGES.DUPLICATE_INFO);
  }, []);
  
  const handleArchive = useCallback(async (configId: string) => {
    const config = configurations.find((c: any) => c.id === configId);
    const isDraft = config?.status === 'DRAFT';
    
    const confirmMessage = isDraft 
      ? 'Are you sure you want to delete this draft configuration?' 
      : 'Are you sure you want to archive this configuration?';
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    if (isDraft) {
      try {
        const draftKey = generateStorageKey('release-config', org);
        localStorage.removeItem(draftKey);
        invalidateReleaseConfigs();
      } catch (error) {
        showErrorToast(RELEASE_CONFIG_MESSAGES.DELETE_DRAFT_ERROR);
      }
      return;
    }
    
    try {
      const result = await apiDelete<{ message?: string }>(
        `/api/v1/tenants/${org}/release-config/${configId}`
      );
      
      if (result.success) {
        invalidateReleaseConfigs();
        showSuccessToast(RELEASE_CONFIG_MESSAGES.ARCHIVE_SUCCESS);
      } else {
        // ❌ Rollback optimistic update on failure
        updateReleaseConfigInCache(configId, (config) => ({
          ...config,
          isActive: true,
        }));
        showErrorToast(getErrorMessage(
          result.error || 'Unknown error',
          RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title
        ));
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to archive configuration');
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title));
    }
  }, [org, configurations, invalidateReleaseConfigs, updateReleaseConfigInCache]);
  
  const handleSetDefault = useCallback(async (configId: string) => {
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        `/api/v1/tenants/${org}/release-config/${configId}`,
        { isDefault: true }
      );
      
      if (result.data?.success) {
        invalidateReleaseConfigs();
        showSuccessToast(RELEASE_CONFIG_MESSAGES.SET_DEFAULT_SUCCESS);
      } else {
        showErrorToast(getErrorMessage(
          result.error || 'Unknown error',
          RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title
        ));
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to set as default');
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title));
    }
  }, [org, invalidateReleaseConfigs]);

  const handleExport = useCallback((config: ReleaseConfiguration) => {
    const jsonString = exportConfig(config);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '-').toLowerCase()}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Stack gap="lg">
        <Group justify="space-between">
          <Skeleton height={32} width={200} />
          <Skeleton height={36} width={160} />
        </Group>
        <Group gap="md">
          <Skeleton height={36} style={{ flex: 1 }} />
          <Skeleton height={36} width={140} />
          <Skeleton height={36} width={140} />
        </Group>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={200} radius="md" />
          ))}
        </SimpleGrid>
      </Stack>
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
            onClick={handleCreate}
          >
            Create Configuration
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Stats Bar */}
      {stats.total > 0 && (
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.slate[0],
            border: `1px solid ${theme.colors.slate[2]}`,
          }}
        >
          <Group justify="space-between">
            <Group gap="xl">
              <Group gap="xs">
                <ThemeIcon size={32} radius="md" variant="light" color="brand">
                  <IconFileDescription size={18} />
                </ThemeIcon>
                <Box>
                  <Text size="xl" fw={700} c={theme.colors.slate[9]}>{stats.total}</Text>
                  <Text size="xs" c={theme.colors.slate[5]}>Total</Text>
                </Box>
              </Group>
              
              <Group gap="xs">
                <Badge size="lg" variant="light" color="green">
                  {stats.active} Active
                </Badge>
                {/* {stats.draft > 0 && (
                  <Badge size="lg" variant="light" color="yellow">
                    {stats.draft} Draft
                  </Badge>
                )} */}
                {stats.archived > 0 && (
                  <Badge size="lg" variant="light" color="gray">
                    {stats.archived} Archived
                  </Badge>
                )}
              </Group>
            </Group>
            
            <Button
              color="brand"
              leftSection={<IconPlus size={16} />}
              onClick={handleCreate}
            >
              New Configuration
            </Button>
          </Group>
        </Paper>
      )}

      {/* Filters */}
      <Group gap="md">
        <TextInput
          placeholder="Search configurations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftSection={<IconSearch size={16} />}
          style={{ flex: 1 }}
          size="sm"
        />
        
        <Select
          placeholder="All Statuses"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: CONFIG_STATUS.ACTIVE, label: 'Active' },
            { value: CONFIG_STATUS.DRAFT, label: 'Draft' },
            { value: CONFIG_STATUS.ARCHIVED, label: 'Archived' },
          ]}
          clearable
          leftSection={<IconFilter size={16} />}
          w={160}
          size="sm"
        />
        
        <Select
          placeholder="All Types"
          value={typeFilter}
          onChange={setTypeFilter}
          data={[
            { value: RELEASE_TYPE.PLANNED, label: 'Planned' },
            { value: RELEASE_TYPE.HOTFIX, label: 'Hotfix' },
            { value: RELEASE_TYPE.MAJOR, label: 'Major' },
          ]}
          clearable
          leftSection={<IconFilter size={16} />}
          w={140}
          size="sm"
        />
      </Group>

      {/* Configuration List */}
      {filteredConfigs.length > 0 ? (
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="lg">
          {filteredConfigs.map((config) => (
            <ConfigurationListItem
              key={config.id}
              config={config}
              onEdit={() => handleEdit(config)}
              onDuplicate={() => handleDuplicate(config)}
              onArchive={() => handleArchive(config.id)}
              onExport={() => handleExport(config)}
              onSetDefault={() => handleSetDefault(config.id)}
            />
          ))}
        </SimpleGrid>
      ) : (
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
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter(null);
                  setTypeFilter(null);
                }}
              >
                Clear Filters
              </Button>
            </Stack>
          </Center>
        </Paper>
      )}
    </Stack>
  );
});
