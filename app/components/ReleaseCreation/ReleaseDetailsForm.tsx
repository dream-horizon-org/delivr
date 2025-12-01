/**
 * Release Details Form Component
 * 
 * Backend-compatible release details form.
 * Uses PlatformTargetsSelector for platform/target selection with per-platform versions.
 * 
 * Follows cursor rules: No 'any' or 'unknown' types, uses constants
 */

import { useEffect, useState } from 'react';
import {
  TextInput,
  Textarea,
  Select,
  Stack,
  Text,
  Group,
  Card,
  Badge,
  Loader as MantineLoader,
} from '@mantine/core';
import { apiGet } from '~/utils/api-client';
import type { ReleaseCreationState, ReleaseType } from '~/types/release-creation-backend';
import type { ReleaseConfiguration, Platform } from '~/types/release-config';
import { RELEASE_TYPES as RELEASE_TYPE_CONSTANTS } from '~/types/release-config-constants';
import { PlatformTargetsSelector } from './PlatformTargetsSelector';
import { convertConfigTargetsToPlatformTargets } from '~/utils/release-creation-converter';

interface ReleaseDetailsFormProps {
  state: Partial<ReleaseCreationState>;
  onChange: (state: Partial<ReleaseCreationState>) => void;
  config?: ReleaseConfiguration; // Configuration template (if WITH_CONFIG mode)
  latestVersion?: string; // For auto-generating version
  tenantId: string; // For fetching branches
  errors?: Record<string, string>;
}

/**
 * Increment version for planned releases
 */
function incrementVersion(version: string): string {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return 'v1.0.0';
  const [, major, minor] = match;
  return `v${major}.${parseInt(minor, 10) + 1}.0`;
}

export function ReleaseDetailsForm({
  state,
  onChange,
  config,
  latestVersion,
  tenantId,
  errors = {},
}: ReleaseDetailsFormProps) {
  const [branches, setBranches] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState<string>('main');

  // Fetch branches from SCM
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const result = await apiGet<{
          branches?: Array<{ name: string; default?: boolean }>;
          defaultBranch?: string;
        }>(`/api/v1/tenants/${tenantId}/integrations/scm/branches`);

        if (result.success && result.data?.branches) {
          const branchOptions = result.data.branches.map((branch: { name: string; default?: boolean }) => ({
            value: branch.name,
            label: branch.default ? `${branch.name} (default)` : branch.name,
          }));
          setBranches(branchOptions);
          if (result.data.defaultBranch) {
            setDefaultBranch(result.data.defaultBranch);
          }
        } else {
          console.warn('[ReleaseDetailsForm] Failed to fetch branches');
        }
      } catch (error) {
        console.error('[ReleaseDetailsForm] Error fetching branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };

    if (tenantId) {
      fetchBranches();
    }
  }, [tenantId]);

  // Pre-fill baseBranch from config
  useEffect(() => {
    if (config && !state.baseBranch) {
      const baseBranch = config.baseBranch || defaultBranch;
      onChange({
        ...state,
        baseBranch,
      });
    }
  }, [config, defaultBranch]);

  // Pre-fill platformTargets from config (only targets that are in config)
  useEffect(() => {
    if (config) {
      const configTargets = config.targets || [];
      
      // If no platformTargets in state, pre-fill from config
      if (!state.platformTargets || state.platformTargets.length === 0) {
        const defaultVersion = latestVersion ? incrementVersion(latestVersion) : 'v1.0.0';
        const versions: Record<Platform, string> = {
          ANDROID: defaultVersion,
          IOS: defaultVersion,
        };
        const platformTargets = convertConfigTargetsToPlatformTargets(configTargets, versions);
        onChange({
          ...state,
          platformTargets,
        });
      } else {
        // Filter out any platformTargets that are not in config
        const validTargets = state.platformTargets.filter((pt) => 
          configTargets.includes(pt.target)
        );
        
        // If all were filtered out or count changed, update state
        if (validTargets.length !== state.platformTargets.length) {
          // If all were filtered, pre-fill from config
          if (validTargets.length === 0 && configTargets.length > 0) {
      const defaultVersion = latestVersion ? incrementVersion(latestVersion) : 'v1.0.0';
      const versions: Record<Platform, string> = {
        ANDROID: defaultVersion,
        IOS: defaultVersion,
      };
            const platformTargets = convertConfigTargetsToPlatformTargets(configTargets, versions);
      onChange({
        ...state,
        platformTargets,
      });
          } else if (validTargets.length > 0) {
            // Keep only valid targets
            onChange({
              ...state,
              platformTargets: validTargets,
            });
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.targets, latestVersion]);

  // Pre-fill release type from config or default to PLANNED
  useEffect(() => {
    if (!state.type) {
      let releaseType: ReleaseType = RELEASE_TYPE_CONSTANTS.PLANNED;
      
      if (config) {
        // Map config release type to backend release type
      if (config.releaseType === RELEASE_TYPE_CONSTANTS.HOTFIX) {
        releaseType = RELEASE_TYPE_CONSTANTS.HOTFIX;
      } else if (config.releaseType === RELEASE_TYPE_CONSTANTS.PLANNED) {
        releaseType = RELEASE_TYPE_CONSTANTS.PLANNED;
      }
        // UNPLANNED is not in config, so it stays as default PLANNED
      }

      onChange({
        ...state,
        type: releaseType,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Get default version for platformTargetsSelector
  const getDefaultVersion = (): string => {
    if (latestVersion) {
      return incrementVersion(latestVersion);
    }
    // Use version from first platformTarget if available
    if (state.platformTargets && state.platformTargets.length > 0) {
      return state.platformTargets[0].version;
    }
    return 'v1.0.0';
  };

  const isReleaseTypeDisabled = !!config; // Disabled if from config

  return (
    <Stack gap="lg">
      <div>
        <Group gap="md" align="center" className="mb-2">
          <Text fw={600} size="lg">
          Release Details
        </Text>
          {state.type && (
            <Badge size="lg" variant="light" color="blue">
              {state.type === RELEASE_TYPE_CONSTANTS.PLANNED && 'Planned Release'}
              {state.type === RELEASE_TYPE_CONSTANTS.HOTFIX && 'Hotfix'}
              {state.type === 'UNPLANNED' && 'Unplanned'}
            </Badge>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          Configure base branch, platform targets, and description
        </Text>
      </div>

      {/* Base Branch */}
      {/* <Card shadow="sm" padding="md" radius="md"  withBorder > */}
        <Stack gap="md">
        <Group gap="md" grow>
          <Select
            label="Base Branch"
            placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
            data={branches}
            value={state.baseBranch || ''}
            onChange={(val) => onChange({ ...state, baseBranch: val || '' })}
            required
            error={errors.baseBranch}
            searchable
            clearable
            disabled={loadingBranches}
            rightSection={loadingBranches ? <MantineLoader size="xs" /> : null}
          description="Select base branch to fork from"
        />
        <TextInput
          label="Release Branch Name"
          placeholder="e.g., release/v1.0.0"
          value={state.branch || ''}
          onChange={(e) => onChange({ ...state, branch: e.target.value || undefined })}
          error={errors.branch}
          description="Keep empty to generate based on version and selected targets"
          />
        </Group>
        <Textarea
        label="Description"
        placeholder="What's new in this release..."
        value={state.description || ''}
        onChange={(e) => onChange({ ...state, description: e.target.value })}
        rows={2}
        description="Add release description or summary"
      />
      </Stack>
      {/* </Card> */}

      <PlatformTargetsSelector
        platformTargets={state.platformTargets || []}
        onChange={(platformTargets) => onChange({ ...state, platformTargets })}
        config={config}
        defaultVersion={getDefaultVersion()}
        errors={errors}
      />

      {/* Description */}

    </Stack>
  );
}
