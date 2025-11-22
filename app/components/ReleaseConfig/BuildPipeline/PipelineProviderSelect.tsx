/**
 * Build Provider Selection Component
 * Allows selection of Jenkins, GitHub Actions, or Manual Upload
 */

import { Select } from '@mantine/core';
import type { BuildProvider } from '~/types/release-config';
import { BUILD_PROVIDER_LABELS } from '../release-config-constants';

interface PipelineProviderSelectProps {
  value: BuildProvider;
  onChange: (value: BuildProvider) => void;
  availableProviders: BuildProvider[];
  disabled?: boolean;
}

export function PipelineProviderSelect({
  value,
  onChange,
  availableProviders,
  disabled = false,
}: PipelineProviderSelectProps) {
  const options = availableProviders.map(provider => ({
    value: provider,
    label: BUILD_PROVIDER_LABELS[provider],
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

