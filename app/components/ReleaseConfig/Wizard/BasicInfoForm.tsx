/**
 * Basic Information Form Component
 * First step of the Configuration Wizard with improved UX
 */

import { useEffect, useState } from 'react';
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

export function BasicInfoForm({ config, onChange, tenantId }: BasicInfoFormProps) {
  const theme = useMantineTheme();
  const [branches, setBranches] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');

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
          if (result.data.defaultBranch) {
            setDefaultBranch(result.data.defaultBranch);
            if (!config.baseBranch) {
              onChange({ ...config, baseBranch: result.data.defaultBranch });
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
  }, [tenantId]);
  // Separate useEffect for auto-selecting default branch
  useEffect(() => {
    if(!config.baseBranch && defaultBranch && defaultBranch !== 'main') {
      onChange({...config, baseBranch: defaultBranch});
    }
  }, [defaultBranch]);

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
            { value: 'PLANNED', label: 'Planned Release' },
            { value: 'HOTFIX', label: 'Hotfix Release' },
            { value: 'MAJOR', label: 'Major Release' },
          ]}
          value={config.releaseType || 'PLANNED'}
          onChange={(val) => onChange({ ...config, releaseType: (val || 'PLANNED') as any })}
          required
          withAsterisk
          clearable={false}
          description="Type of releases this configuration is designed for"
          size="sm"
          leftSection={<IconTag size={14} />}
        />

        {/* Base Branch */}
        <Select
          label="Default Base Branch"
          placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
          data={branches}
          value={config.baseBranch || ''}
          onChange={(val) => onChange({ ...config, baseBranch: val || '' })}
          searchable
          clearable={false}
          required
          withAsterisk
          disabled={loadingBranches}
          rightSection={loadingBranches ? <Loader size="xs" /> : null}
          description="Default branch to fork from for releases (from SCM integration)"
          size="sm"
          leftSection={<IconGitBranch size={14} />}
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
