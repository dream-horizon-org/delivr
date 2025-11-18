/**
 * Build Provider Selection Component
 * Allows selection of Jenkins, GitHub Actions, or Manual Upload
 */

import { Select } from '@mantine/core';
import type { BuildProvider } from '~/types/release-config';

interface PipelineProviderSelectProps {
  value: BuildProvider;
  onChange: (value: BuildProvider) => void;
  availableProviders: BuildProvider[];
  disabled?: boolean;
}

const providerLabels: Record<BuildProvider, string> = {
  JENKINS: 'Jenkins',
  GITHUB_ACTIONS: 'GitHub Actions',
  MANUAL_UPLOAD: 'Manual Upload',
};

export function PipelineProviderSelect({
  value,
  onChange,
  availableProviders,
  disabled = false,
}: PipelineProviderSelectProps) {
  const options = availableProviders.map(provider => ({
    value: provider,
    label: providerLabels[provider],
  }));
  
  return (
    <Select
      label="Build Provider"
      placeholder="Select build provider"
      data={options}
      value={value}
      onChange={(val) => onChange(val as BuildProvider)}
      required
      disabled={disabled}
      description="Choose how builds will be triggered for this pipeline"
    />
  );
}

