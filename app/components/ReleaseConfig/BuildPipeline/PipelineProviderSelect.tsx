/**
 * Build Provider Selection Component
 * Allows selection of Jenkins, GitHub Actions, or Manual Upload
 */

import { Select } from '@mantine/core';
import type { BuildProvider } from '~/types/release-config';
import type { PipelineProviderSelectProps } from '~/types/release-config-props';
import { getBuildProviderLabel, FIELD_LABELS, PLACEHOLDERS } from '~/constants/release-config-ui';

export function PipelineProviderSelect({
  value,
  onChange,
  availableProviders,
  disabled = false,
}: PipelineProviderSelectProps) {
  const options = availableProviders.map(provider => ({
    value: provider,
    label: getBuildProviderLabel(provider),
  }));
  
  // Dynamic description based on available providers
  const getDescription = () => {
    return `Choose from your connected CI/CD providers (${availableProviders.length} available)`;
  };
  
  return (
    <Select
      label={FIELD_LABELS.BUILD_PROVIDER}
      placeholder={PLACEHOLDERS.SELECT_PROVIDER}
      data={options}
      value={value}
      onChange={(val) => onChange(val as BuildProvider)}
      required
      disabled={disabled}
      description={getDescription()}
    />
  );
}
