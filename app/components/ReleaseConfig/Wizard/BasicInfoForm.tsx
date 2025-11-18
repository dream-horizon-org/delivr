/**
 * Basic Information Form Component
 * First step of the Configuration Wizard
 */

import { TextInput, Textarea, Select, Switch } from '@mantine/core';
import type { ReleaseConfiguration } from '~/types/release-config';

interface BasicInfoFormProps {
  config: Partial<ReleaseConfiguration>;
  onChange: (config: Partial<ReleaseConfiguration>) => void;
}

export function BasicInfoForm({ config, onChange }: BasicInfoFormProps) {
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
          { value: 'EMERGENCY', label: 'Emergency Release' },
        ]}
        value={config.releaseType}
        onChange={(val) => onChange({ ...config, releaseType: val as any })}
        required
        description="Type of releases this configuration is for"
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

