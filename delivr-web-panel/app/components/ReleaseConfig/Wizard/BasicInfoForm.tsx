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
  Alert,
  Button,
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
import { IntegrationCategory } from '~/types/integrations';
import { SCM_API_ENDPOINTS } from '~/constants/integrations';
import { BASIC_INFO_LABELS } from '~/constants/release-config-ui';
import { NoIntegrationAlert } from '~/components/Common/NoIntegrationAlert';

export function BasicInfoForm({ config, onChange, appId, showValidation = false, hasScmIntegration = false }: BasicInfoFormProps) {
  const theme = useMantineTheme();
  const [branches, setBranches] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  // Validation helper for baseBranch
  const getBaseBranchError = (): string | undefined => {
    if (!showValidation) return undefined;
    if (!config.baseBranch || !config.baseBranch.trim()) {
      return BASIC_INFO_LABELS.DEFAULT_BASE_BRANCH_REQUIRED;
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

  // Fetch branches from SCM integration (only if integration exists)
  useEffect(() => {
    const fetchBranches = async () => {
      if (!appId || !hasScmIntegration) return;
      
      setLoadingBranches(true);
      try {
        const branchesResult = await apiGet<{ branches: any[]; defaultBranch?: string }>(
          SCM_API_ENDPOINTS.BRANCHES(appId)
        );
        
        if (branchesResult.success && branchesResult.data?.branches) {
          const branchOptions = branchesResult.data.branches.map((branch: any) => ({
            value: branch.name,
            label: branch.default ? `${branch.name} (default)` : branch.name,
          }));
          setBranches(branchOptions);
          
          // Find the actual default branch from the branches array
          const actualDefaultBranch = branchesResult.data.branches.find((branch: any) => branch.default)?.name;
          
          // Auto-set default branch ONLY if:
          // 1. We found an actual default branch from the repository
          // 2. We haven't auto-filled before (prevents overwriting user input)
          // 3. Config doesn't already have a baseBranch set (check current ref value)
          if (actualDefaultBranch && !hasAutoFilledBranchRef.current) {
            const currentConfig = configRef.current;
            if (!currentConfig.baseBranch) {
              hasAutoFilledBranchRef.current = true;
              onChange({ ...currentConfig, baseBranch: actualDefaultBranch });
            }
          }
        }
      } catch (error) {
        // Failed to fetch branches
        console.error('Failed to fetch branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, hasScmIntegration]);

  // Show SCM integration alert if no integration exists
  if (!hasScmIntegration) {
    return (
      <Stack gap="lg">
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
                {BASIC_INFO_LABELS.TITLE}
              </Text>
              <Text size="xs" c={theme.colors.brand[6]}>
                {BASIC_INFO_LABELS.DESCRIPTION}
              </Text>
            </Box>
          </Group>
        </Paper>

        <NoIntegrationAlert
          category={IntegrationCategory.SOURCE_CONTROL}
          appId={appId}
          color="yellow"
        />
      </Stack>
    );
  }

  // Show all form fields if SCM integration exists
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
              {BASIC_INFO_LABELS.TITLE}
            </Text>
            <Text size="xs" c={theme.colors.brand[6]}>
              {BASIC_INFO_LABELS.DESCRIPTION}
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Form Fields */}
      <Stack gap="md">
        {/* Configuration Name */}
        <TextInput
          label={BASIC_INFO_LABELS.CONFIGURATION_NAME}
          placeholder={BASIC_INFO_LABELS.CONFIGURATION_NAME_PLACEHOLDER}
          value={config.name}
          onChange={(e) => onChange({ ...config, name: e.target.value })}
          required
          withAsterisk
          description={BASIC_INFO_LABELS.CONFIGURATION_NAME_DESCRIPTION}
          size="sm"
          leftSection={<IconFileDescription size={14} />}
        />
        
        {/* Description */}
        <Textarea
          label={BASIC_INFO_LABELS.DESCRIPTION_LABEL}
          placeholder={BASIC_INFO_LABELS.DESCRIPTION_PLACEHOLDER}
          value={config.description || ''}
          onChange={(e) => onChange({ ...config, description: e.target.value })}
          minRows={3}
          autosize
          maxRows={5}
          description={BASIC_INFO_LABELS.DESCRIPTION_DESCRIPTION}
          size="sm"
        />
        
        {/* Release Type */}
        <Select
          label={BASIC_INFO_LABELS.RELEASE_TYPE}
          data={[
            { value: RELEASE_TYPES.MINOR, label: BASIC_INFO_LABELS.RELEASE_TYPE_MINOR },
            { value: RELEASE_TYPES.HOTFIX, label: BASIC_INFO_LABELS.RELEASE_TYPE_HOTFIX },
            { value: RELEASE_TYPES.MAJOR, label: BASIC_INFO_LABELS.RELEASE_TYPE_MAJOR },
          ]}
          value={config.releaseType || RELEASE_TYPES.MINOR}
          onChange={(val) => {
            // Explicitly handle the change and preserve other config values
            onChange({ ...config, releaseType: (val || RELEASE_TYPES.MINOR) as any });
          }}
          required
          withAsterisk
          clearable={false}
          description={BASIC_INFO_LABELS.RELEASE_TYPE_DESCRIPTION}
          size="sm"
          leftSection={<IconTag size={14} />}
          allowDeselect={false}
        />

        {/* Base Branch */}
        <Select
          label={BASIC_INFO_LABELS.DEFAULT_BASE_BRANCH}
          placeholder={loadingBranches ? BASIC_INFO_LABELS.DEFAULT_BASE_BRANCH_PLACEHOLDER_LOADING : BASIC_INFO_LABELS.DEFAULT_BASE_BRANCH_PLACEHOLDER}
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
          description={BASIC_INFO_LABELS.DEFAULT_BASE_BRANCH_DESCRIPTION}
          size="sm"
          leftSection={<IconGitBranch size={14} />}
          allowDeselect={false}
          nothingFoundMessage={
            branches.length === 0 && !loadingBranches 
              ? BASIC_INFO_LABELS.DEFAULT_BASE_BRANCH_NO_BRANCHES
              : BASIC_INFO_LABELS.DEFAULT_BASE_BRANCH_NO_MATCH
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
                  {BASIC_INFO_LABELS.SET_AS_DEFAULT}
                </Text>
                <Text size="xs" c={theme.colors.slate[5]}>
                  {BASIC_INFO_LABELS.SET_AS_DEFAULT_DESCRIPTION}
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
