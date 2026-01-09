/**
 * Basic Information Form Component
 * First step of the Configuration Wizard with improved UX
 */

import { useEffect, useState, useRef } from 'react';
import {
  TextInput,
  Textarea,
  Select,
  Switch,
  Stack,
  Text,
  Paper,
  Group,
  ThemeIcon,
  Box,
  useMantineTheme,
  Loader,
} from '@mantine/core';
import {
  IconSettings,
  IconFileDescription,
  IconTag,
  IconGitBranch,
  IconStar,
} from '@tabler/icons-react';
import { apiGet } from '~/utils/api-client';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { BasicInfoFormProps } from '~/types/release-config-props';
import { RELEASE_TYPES } from '~/types/release-config-constants';

export function BasicInfoForm({ config, onChange, tenantId, showValidation = false }: BasicInfoFormProps) {
  const theme = useMantineTheme();
  const [branches, setBranches] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  // Validation helper for baseBranch
  const getBaseBranchError = (): string | undefined => {
    if (!showValidation) return undefined;
    if (!config.baseBranch || !config.baseBranch.trim()) {
      return 'Default base branch is required';
    }
    return undefined;
  };
  
  // Track if we've already auto-filled the default branch (prevent re-setting)
  const hasAutoFilledBranchRef = useRef(false);
  
  // Keep a ref to the current config to avoid stale closures
  const configRef = useRef(config);
  
  // Update ref whenever config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Fetch branches from SCM integration
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const result = await apiGet<{ branches: any[]; defaultBranch?: string }>(
          `/api/v1/tenants/${tenantId}/integrations/scm/branches`
        );
        
        if (result.success && result.data?.branches) {
          const branchOptions = result.data.branches.map((branch: any) => ({
            value: branch.name,
            label: branch.default ? `${branch.name} (default)` : branch.name,
          }));
          setBranches(branchOptions);
          
          // Find the actual default branch from the branches array (not the stored defaultBranch)
          const actualDefaultBranch = result.data.branches.find((branch: any) => branch.default)?.name;
          
          // Auto-set default branch ONLY if:
          // 1. We found an actual default branch from the repository
          // 2. We haven't auto-filled before (prevents overwriting user input)
          // 3. Config doesn't already have a baseBranch set (check current ref value)
          if (actualDefaultBranch && !hasAutoFilledBranchRef.current) {
            // Use the ref to get the most current config value
            const currentConfig = configRef.current;
            if (!currentConfig.baseBranch) {
              hasAutoFilledBranchRef.current = true;
              // Use the current config from ref to avoid stale closure
              onChange({ ...currentConfig, baseBranch: actualDefaultBranch });
            }
          }
        }
      } catch (error) {
        // Silently fail - SCM may not be configured
      } finally {
        setLoadingBranches(false);
      }
    };

    if (tenantId) {
      fetchBranches();
    }
    // Only run once when tenantId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return (
    <Stack gap="lg">
      {/* Info Header */}
      <Paper
        p="md"
        radius="md"
        style={{
          backgroundColor: theme.colors.brand[0],
          border: `1px solid ${theme.colors.brand[2]}`,
        }}
      >
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" variant="light" color="brand">
            <IconSettings size={20} />
          </ThemeIcon>
          <Box>
            <Text size="sm" fw={600} c={theme.colors.brand[8]}>
              Basic Information
            </Text>
            <Text size="xs" c={theme.colors.brand[6]}>
              Provide a name and description for this release configuration
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Form Fields */}
      <Stack gap="md">
        {/* Configuration Name */}
        <TextInput
          label="Configuration Name"
          placeholder="e.g., Standard Release Configuration"
          value={config.name}
          onChange={(e) => onChange({ ...config, name: e.target.value })}
          required
          withAsterisk
          description="A descriptive name to identify this configuration"
          size="sm"
          leftSection={<IconFileDescription size={14} />}
        />
        
        {/* Description */}
        <Textarea
          label="Description (Optional)"
          placeholder="Describe when to use this configuration and any special notes..."
          value={config.description || ''}
          onChange={(e) => onChange({ ...config, description: e.target.value })}
          minRows={3}
          autosize
          maxRows={5}
          description="Provide context about when this configuration should be used"
          size="sm"
        />
        
        {/* Release Type */}
        <Select
          label="Release Type"
          data={[
            { value: RELEASE_TYPES.MINOR, label: 'Minor Release' },
            { value: RELEASE_TYPES.HOTFIX, label: 'Hotfix Release' },
            { value: RELEASE_TYPES.MAJOR, label: 'Major Release' },
          ]}
          value={config.releaseType || RELEASE_TYPES.MINOR}
          onChange={(val) => {
            // Explicitly handle the change and preserve other config values
            onChange({ ...config, releaseType: (val || RELEASE_TYPES.MINOR) as any });
          }}
          required
          withAsterisk
          clearable={false}
          description="Type of releases this configuration is designed for"
          size="sm"
          leftSection={<IconTag size={14} />}
          allowDeselect={false}
        />

        {/* Base Branch */}
        <Select
          label="Default Base Branch"
          placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
          data={branches}
          value={config.baseBranch || ''}
          onChange={(val) => {
            // Explicitly preserve all other config values
            onChange({ ...config, baseBranch: val || '' });
          }}
          searchable
          clearable={false}
          required
          withAsterisk
          error={getBaseBranchError()}
          disabled={loadingBranches}
          rightSection={loadingBranches ? <Loader size="xs" /> : null}
          description="Default branch to fork from for releases (from SCM integration)"
          size="sm"
          leftSection={<IconGitBranch size={14} />}
          allowDeselect={false}
          nothingFoundMessage={
            branches.length === 0 && !loadingBranches 
              ? "No branches found. Make sure your SCM integration is configured." 
              : "No matching branches"
          }
        />
        
        {/* Set as Default */}
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.slate[0],
            border: `1px solid ${theme.colors.slate[2]}`,
          }}
        >
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <ThemeIcon size={32} radius="md" variant="light" color="yellow">
                <IconStar size={18} />
              </ThemeIcon>
              <Box>
                <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                  Set as Default Configuration
                </Text>
                <Text size="xs" c={theme.colors.slate[5]}>
                  Use this configuration for new releases by default
                </Text>
              </Box>
            </Group>
            <Switch
              checked={config.isDefault}
              onChange={(e) => onChange({ ...config, isDefault: e.currentTarget.checked })}
              color="brand"
              size="md"
            />
          </Group>
        </Paper>
      </Stack>
    </Stack>
  );
}
