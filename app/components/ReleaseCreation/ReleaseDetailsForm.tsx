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

  // Pre-fill platformTargets from config
  useEffect(() => {
    if (config && (!state.platformTargets || state.platformTargets.length === 0)) {
      const defaultVersion = latestVersion ? incrementVersion(latestVersion) : 'v1.0.0';
      const versions: Record<Platform, string> = {
        ANDROID: defaultVersion,
        IOS: defaultVersion,
      };
      const platformTargets = convertConfigTargetsToPlatformTargets(config.targets, versions);
      onChange({
        ...state,
        platformTargets,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, latestVersion]);

  // Pre-fill release type from config
  useEffect(() => {
    if (config && !state.type) {
      // Map config release type to backend release type
      let releaseType: ReleaseType = RELEASE_TYPE_CONSTANTS.PLANNED;
      if (config.releaseType === RELEASE_TYPE_CONSTANTS.HOTFIX) {
        releaseType = RELEASE_TYPE_CONSTANTS.HOTFIX;
      } else if (config.releaseType === RELEASE_TYPE_CONSTANTS.PLANNED) {
        releaseType = RELEASE_TYPE_CONSTANTS.PLANNED;
      }
      // UNPLANNED is not in config, so it stays as default

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
        <Text fw={600} size="lg" className="mb-2">
          Release Details
        </Text>
        <Text size="sm" c="dimmed">
          Configure release type, base branch, platform targets, and description
        </Text>
      </div>

      {/* Release Type & Base Branch */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group grow>
          <Select
            label="Release Type"
            data={[
              { value: RELEASE_TYPE_CONSTANTS.PLANNED, label: 'Planned Release' },
              { value: RELEASE_TYPE_CONSTANTS.HOTFIX, label: 'Hotfix' },
              { value: 'UNPLANNED', label: 'Unplanned' },
            ]}
            value={state.type || RELEASE_TYPE_CONSTANTS.PLANNED}
            onChange={(val) => {
              if (val) {
                onChange({ ...state, type: val as ReleaseType });
              }
            }}
            required
            disabled={isReleaseTypeDisabled}
            error={errors.type}
            description={
              isReleaseTypeDisabled ? 'Prefilled from configuration' : 'Select release type'
            }
            rightSection={
              isReleaseTypeDisabled && (
                <Badge size="xs" variant="light" color="gray">
                  From Config
                </Badge>
              )
            }
          />

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
            description={
              config?.baseBranch
                ? `Prefilled from config: ${config.baseBranch}`
                : 'Select base branch to fork from'
            }
          />
        </Group>
      </Card>

      {/* Platform Targets with Versions */}
      <PlatformTargetsSelector
        platformTargets={state.platformTargets || []}
        onChange={(platformTargets) => onChange({ ...state, platformTargets })}
        config={config}
        defaultVersion={getDefaultVersion()}
        errors={errors}
      />

      {/* Description */}
      <Textarea
        label="Release Description"
        placeholder="What's new in this release..."
        value={state.description || ''}
        onChange={(e) => onChange({ ...state, description: e.target.value })}
        rows={4}
        description="Optional: Release highlights and notes"
      />
    </Stack>
  );
}
