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
  Box,
  Badge,
  Loader as MantineLoader,
} from '@mantine/core';
import { apiGet } from '~/utils/api-client';
import type { ReleaseCreationState, ReleaseType, PlatformTargetWithVersion } from '~/types/release-creation-backend';
import type { ReleaseConfiguration, Platform, TargetPlatform } from '~/types/release-config';
import { RELEASE_TYPES as RELEASE_TYPE_CONSTANTS, TARGET_PLATFORMS, PLATFORMS } from '~/types/release-config-constants';
import { PlatformTargetsSelector } from './PlatformTargetsSelector';
import { convertConfigTargetsToPlatformTargets } from '~/utils/release-creation-converter';
import { RELEASE_DETAILS_FORM } from '~/constants/release-creation-ui';

interface ReleaseDetailsFormProps {
  state: Partial<ReleaseCreationState>;
  onChange: (state: Partial<ReleaseCreationState>) => void;
  config?: ReleaseConfiguration; // Configuration template (if WITH_CONFIG mode)
  latestVersion?: string; // For auto-generating version
  tenantId: string; // For fetching branches
  errors?: Record<string, string>;
  disablePlatformTargets?: boolean; // Disable platform target editing (for edit mode pre-kickoff)
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
  disablePlatformTargets = false,
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
          label: branch.default ? `${branch.name}${RELEASE_DETAILS_FORM.BRANCH_DEFAULT_SUFFIX}` : branch.name,
        }));
          setBranches(branchOptions);
          
          // Find the actual default branch from the branches array (not the stored defaultBranch)
          const actualDefaultBranch = result.data.branches.find((branch: { name: string; default?: boolean }) => branch.default)?.name;
          if (actualDefaultBranch) {
            setDefaultBranch(actualDefaultBranch);
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

  // Pre-fill baseBranch from config (prioritize config.baseBranch over repository default)
  useEffect(() => {
    // Only pre-fill if state doesn't already have a baseBranch
    if (!state.baseBranch) {
      // Prioritize config.baseBranch (the branch selected in release configuration)
      // This is the branch the user selected when creating the release configuration
      // Only fall back to repository default branch if config doesn't have one
      const baseBranch = config?.baseBranch || defaultBranch;
      if (baseBranch) {
        onChange({
          ...state,
          baseBranch,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.baseBranch, defaultBranch]); // Only depend on config.baseBranch and defaultBranch to avoid loops

  // Platform-target mapping (matches PlatformTargetsSelector)
  const PLATFORM_TARGET_MAPPING: Record<TargetPlatform, Platform | 'WEB'> = {
    [TARGET_PLATFORMS.WEB]: 'WEB',
    [TARGET_PLATFORMS.PLAY_STORE]: PLATFORMS.ANDROID,
    [TARGET_PLATFORMS.APP_STORE]: PLATFORMS.IOS,
  } as const;

  // Auto-populate platformTargets from config when creating release for the first time
  useEffect(() => {
    if (config && (!state.platformTargets || state.platformTargets.length === 0)) {
      // Use platformTargets from config if available
      if (config.platformTargets && config.platformTargets.length > 0) {
        const preFilledTargets: PlatformTargetWithVersion[] = config.platformTargets.map((pt) => ({
          platform: pt.platform as PlatformTargetWithVersion['platform'],
          target: pt.target as TargetPlatform,
          version: getDefaultVersion(), // Use default version for pre-filled targets
        }));
        
        onChange({
          ...state,
          platformTargets: preFilledTargets,
        });
        return; // Exit early to avoid filtering logic below
      }
    }
    
    // Filter platformTargets to only include targets that exist in config
    // This handles cases where a draft had targets that are no longer in the current config
    if (config?.platformTargets && config.platformTargets.length > 0 && state.platformTargets && state.platformTargets.length > 0) {
      const configTargets = config.platformTargets.map((pt) => pt.target);
      
      // Filter out any platformTargets that are not in config
      const validTargets = state.platformTargets.filter((pt) => 
        configTargets.includes(pt.target)
      );
      
      // Only update if some targets were filtered out
      if (validTargets.length !== state.platformTargets.length) {
        onChange({
          ...state,
          platformTargets: validTargets,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.platformTargets]);

  // Pre-fill release type from config or default to MINOR
  // Update release type whenever config changes (not just on initial load)
  useEffect(() => {
    // Default to MINOR (regular release)
    let releaseType: ReleaseType = RELEASE_TYPE_CONSTANTS.MINOR;
    
    if (config) {
      // Backend now uses same types as config (MAJOR/MINOR/HOTFIX)
      // No mapping needed - pass through directly
      if (config.releaseType === RELEASE_TYPE_CONSTANTS.MAJOR) {
        releaseType = RELEASE_TYPE_CONSTANTS.MAJOR;
      } else if (config.releaseType === RELEASE_TYPE_CONSTANTS.HOTFIX) {
        releaseType = RELEASE_TYPE_CONSTANTS.HOTFIX;
      } else {
        // MINOR or any other type defaults to MINOR
        releaseType = RELEASE_TYPE_CONSTANTS.MINOR;
      }
    }

    // Always update release type when config changes (even if type was already set)
    // This ensures switching configs updates the release type
    if (state.type !== releaseType) {
      onChange({
        ...state,
        type: releaseType,
      });
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.id, config?.releaseType]); // Depend on config.id and releaseType to detect config changes

  // Get default version for platformTargetsSelector
  const getDefaultVersion = (): string => {
    // Return empty string - let version suggestions utility handle it
    // This ensures versions are populated from actual releases, not hardcoded values
    return '';
  };

  const isReleaseTypeDisabled = !!config; // Disabled if from config

  return (
    <Stack gap="lg">
      <Box>
        <Group gap="md" align="center" mb={4}>
          <Text fw={600} size="lg">
            {RELEASE_DETAILS_FORM.TITLE}
          </Text>
          {state.type && (
            <Badge size="lg" variant="light" color="blue">
              {state.type === RELEASE_TYPE_CONSTANTS.MAJOR && RELEASE_DETAILS_FORM.MAJOR_RELEASE}
              {state.type === RELEASE_TYPE_CONSTANTS.MINOR && RELEASE_DETAILS_FORM.MINOR_RELEASE}
              {state.type === RELEASE_TYPE_CONSTANTS.HOTFIX && RELEASE_DETAILS_FORM.HOTFIX}
            </Badge>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          {RELEASE_DETAILS_FORM.DESCRIPTION}
        </Text>
      </Box>

      {/* Base Branch */}
      <Stack gap="md">
        <Group gap="md" grow align="flex-start">
          <Select
            label={RELEASE_DETAILS_FORM.BASE_BRANCH_LABEL}
            placeholder={loadingBranches ? RELEASE_DETAILS_FORM.BASE_BRANCH_PLACEHOLDER_LOADING : RELEASE_DETAILS_FORM.BASE_BRANCH_PLACEHOLDER}
            data={branches}
            value={state.baseBranch || ''}
            onChange={(val) => onChange({ ...state, baseBranch: val || '' })}
            required
            withAsterisk
            error={errors.baseBranch}
            searchable
            disabled={loadingBranches}
            rightSection={loadingBranches ? <MantineLoader size="xs" /> : null}
            description={RELEASE_DETAILS_FORM.BASE_BRANCH_DESCRIPTION}
          />
          <TextInput
            label={RELEASE_DETAILS_FORM.RELEASE_BRANCH_LABEL}
            placeholder={RELEASE_DETAILS_FORM.RELEASE_BRANCH_PLACEHOLDER}
            value={state.branch || ''}
            onChange={(e) => onChange({ ...state, branch: e.target.value || undefined })}
            error={errors.branch}
            required
            withAsterisk
            description={RELEASE_DETAILS_FORM.RELEASE_BRANCH_DESCRIPTION}
          />
        </Group>
        <Textarea
          label={RELEASE_DETAILS_FORM.DESCRIPTION_LABEL}
          placeholder={RELEASE_DETAILS_FORM.DESCRIPTION_PLACEHOLDER}
          value={state.description || ''}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          rows={3}
          description={RELEASE_DETAILS_FORM.DESCRIPTION_DESCRIPTION}
        />
      </Stack>

      {/* Hide platform targets selector completely in edit mode before kickoff */}
      {!disablePlatformTargets && (
        <PlatformTargetsSelector
          platformTargets={state.platformTargets || []}
          onChange={(platformTargets) => onChange({ ...state, platformTargets })}
          config={config}
          defaultVersion={getDefaultVersion()}
          errors={errors}
          disabled={disablePlatformTargets}
        />
      )}
    </Stack>
  );
}
