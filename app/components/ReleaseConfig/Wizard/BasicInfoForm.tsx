/**
 * Basic Information Form Component
 * First step of the Configuration Wizard
 */

import { useEffect, useState } from 'react';
import { TextInput, Textarea, Select, Switch, Loader } from '@mantine/core';
import { apiGet } from '~/utils/api-client';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { BasicInfoFormProps } from '~/types/release-config-props';

export function BasicInfoForm({ config, onChange, tenantId }: BasicInfoFormProps) {
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
            // Auto-select default branch if not already set
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

  return (
    <div className="space-y-4">
      <TextInput
        label="Configuration Name"
        placeholder="e.g., Standard Release Configuration"
        value={config.name}
        onChange={(e) => onChange({ ...config, name: e.target.value })}
        required
        description="A descriptive name for this configuration"
      />
      
      <Textarea
        label="Description (Optional)"
        placeholder="Describe when to use this configuration..."
        value={config.description || ''}
        onChange={(e) => onChange({ ...config, description: e.target.value })}
        rows={3}
        description="Provide context about this configuration"
      />
      
      <Select
        label="Release Type"
        data={[
          { value: 'PLANNED', label: 'Planned Release' },
          { value: 'HOTFIX', label: 'Hotfix Release' },
          { value: 'MAJOR', label: 'Major Release' },
        ]}
        value={config.releaseType || 'PLANNED'}
        onChange={(val) => {
          // Prevent null values - always default to PLANNED if somehow null
          onChange({ ...config, releaseType: (val || 'PLANNED') as any });
        }}
        required
        clearable={false}
        description="Type of releases this configuration is for"
      />

      <Select
        label="Default Base Branch"
        placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
        data={branches}
        value={config.baseBranch || ''}
        onChange={(val) => onChange({ ...config, baseBranch: val || '' })}
        searchable
        clearable={false}
        required
        disabled={loadingBranches}
        rightSection={loadingBranches ? <Loader size="xs" /> : null}
        description="Default branch to fork from for releases (from SCM integration)"
      />
      
      <Switch
        label="Set as Default Configuration"
        description="Use this configuration for new releases by default"
        checked={config.isDefault}
        onChange={(e) => onChange({ ...config, isDefault: e.currentTarget.checked })}
      />
    </div>
  );
}

