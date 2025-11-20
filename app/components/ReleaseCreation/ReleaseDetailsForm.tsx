/**
 * Release Details Form Component
 * Basic release information (version, type, branch, targets, description)
 */

import { useEffect, useState } from 'react';
import {
  TextInput,
  Textarea,
  Select,
  Stack,
  Text,
  Group,
  Checkbox,
  Card,
  Badge,
  Alert,
  Loader as MantineLoader,
} from '@mantine/core';
import { IconTarget } from '@tabler/icons-react';
import type { ReleaseBasicDetails } from '~/types/release-creation';
import type { ReleaseConfiguration, TargetPlatform } from '~/types/release-config';

interface ReleaseDetailsFormProps {
  details: Partial<ReleaseBasicDetails>;
  onChange: (details: Partial<ReleaseBasicDetails>) => void;
  config?: ReleaseConfiguration; // Configuration template (if WITH_CONFIG mode)
  latestVersion?: string; // For auto-generating version
  tenantId: string; // For fetching branches
  errors?: Record<string, string>;
}

const releaseTypes = [
  { value: 'PLANNED', label: 'Planned Release' },
  { value: 'HOTFIX', label: 'Hotfix' },
  { value: 'PATCH', label: 'Patch' },
];

export function ReleaseDetailsForm({
  details,
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
        const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/scm/branches`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.branches) {
            const branchOptions = data.branches.map((branch: any) => ({
              value: branch.name,
              label: branch.default ? `${branch.name} (default)` : branch.name,
            }));
            setBranches(branchOptions);
            if (data.defaultBranch) {
              setDefaultBranch(data.defaultBranch);
            }
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

  // Auto-generate version on mount if not set (for PLANNED releases)
  useEffect(() => {
    if (!details.version && latestVersion && details.releaseType === 'PLANNED') {
      const nextVersion = incrementVersion(latestVersion);
      onChange({ ...details, version: nextVersion });
    }
  }, [latestVersion]);

  // Prefill from config if available
  useEffect(() => {
    if (config && !details.releaseType) {
      onChange({
        ...details,
        releaseType: config.releaseType as any,
        baseBranch: defaultBranch, // Use default branch from SCM
        releaseTargets: {
          web: config.defaultTargets.includes('WEB' as TargetPlatform),
          playStore: config.defaultTargets.includes('PLAY_STORE' as TargetPlatform),
          appStore: config.defaultTargets.includes('APP_STORE' as TargetPlatform),
        },
      });
    }
  }, [config, defaultBranch]);

  const incrementVersion = (version: string): string => {
    const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return 'v1.0.0';
    const [, major, minor, patch] = match;
    return `v${major}.${parseInt(minor) + 1}.0`;
  };

  // Available target platforms based on config (or all if manual)
  const availableTargets = config
    ? {
        web: config.defaultTargets.includes('WEB' as TargetPlatform),
        playStore: config.defaultTargets.includes('PLAY_STORE' as TargetPlatform),
        appStore: config.defaultTargets.includes('APP_STORE' as TargetPlatform),
      }
    : { web: true, playStore: true, appStore: true };

  const isReleaseTypeDisabled = !!config; // Disabled if from config

  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-2">
          Release Details
        </Text>
        <Text size="sm" c="dimmed">
          Configure release version, type, targets, and timeline
        </Text>
      </div>

      {/* Version & Release Type */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group grow>
          <TextInput
            label="Release Version"
            placeholder="e.g., v1.2.0"
            value={details.version || ''}
            onChange={(e) => onChange({ ...details, version: e.target.value })}
            required
            error={errors.version}
            description={
              latestVersion ? `Latest: ${latestVersion} (auto-generated)` : 'Editable'
            }
            rightSection={
              <Badge size="xs" variant="light">
                Editable
              </Badge>
            }
          />

          <Select
            label="Release Type"
            data={releaseTypes}
            value={details.releaseType || 'PLANNED'}
            onChange={(val) => onChange({ ...details, releaseType: val as any })}
            required
            disabled={isReleaseTypeDisabled}
            error={errors.releaseType}
            description={
              isReleaseTypeDisabled ? 'Prefilled from configuration' : 'Select type'
            }
            rightSection={
              isReleaseTypeDisabled && (
                <Badge size="xs" variant="light" color="gray">
                  From Config
                </Badge>
              )
            }
          />
        </Group>

        <Select
          label="Base Branch"
          placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'}
          data={branches}
          value={details.baseBranch || ''}
          onChange={(val) => onChange({ ...details, baseBranch: val || '' })}
          required
          error={errors.baseBranch}
          searchable
          clearable
          disabled={loadingBranches}
          rightSection={loadingBranches ? <MantineLoader size="xs" /> : null}
          className="mt-3"
        />
      </Card>

      {/* Release Targets */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group gap="sm" className="mb-3">
          <IconTarget size={20} className="text-blue-600" />
          <Text fw={600} size="sm">
            Release Targets
          </Text>
          {config && (
            <Badge size="xs" variant="light">
              From Config
            </Badge>
          )}
        </Group>

        <Stack gap="sm">
          {availableTargets.web && (
            <Checkbox
              label="Web Platform"
              description="Deploy to web platform"
              checked={details.releaseTargets?.web || false}
              onChange={(e) =>
                onChange({
                  ...details,
                  releaseTargets: {
                    ...details.releaseTargets,
                    web: e.currentTarget.checked,
                    playStore: details.releaseTargets?.playStore || false,
                    appStore: details.releaseTargets?.appStore || false,
                  },
                })
              }
              disabled={!config && !availableTargets.web}
            />
          )}

          {availableTargets.playStore && (
            <Checkbox
              label="Play Store (Android)"
              description="Release to Google Play Store"
              checked={details.releaseTargets?.playStore || false}
              onChange={(e) =>
                onChange({
                  ...details,
                  releaseTargets: {
                    ...details.releaseTargets,
                    playStore: e.currentTarget.checked,
                    web: details.releaseTargets?.web || false,
                    appStore: details.releaseTargets?.appStore || false,
                  },
                })
              }
              disabled={!config && !availableTargets.playStore}
            />
          )}

          {availableTargets.appStore && (
            <Checkbox
              label="App Store (iOS)"
              description="Release to Apple App Store"
              checked={details.releaseTargets?.appStore || false}
              onChange={(e) =>
                onChange({
                  ...details,
                  releaseTargets: {
                    ...details.releaseTargets,
                    appStore: e.currentTarget.checked,
                    web: details.releaseTargets?.web || false,
                    playStore: details.releaseTargets?.playStore || false,
                  },
                })
              }
              disabled={!config && !availableTargets.appStore}
            />
          )}

          {errors.releaseTargets && (
            <Alert color="red" variant="light">
              <Text size="xs">{errors.releaseTargets}</Text>
            </Alert>
          )}
        </Stack>
      </Card>

      {/* Description */}
      <Textarea
        label="Release Description"
        placeholder="What's new in this release..."
        value={details.description || ''}
        onChange={(e) => onChange({ ...details, description: e.target.value })}
        rows={4}
        description="Optional: Release highlights and notes"
      />
    </Stack>
  );
}

