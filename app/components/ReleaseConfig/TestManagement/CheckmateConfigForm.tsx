/**
 * Checkmate Configuration Form
 * Configure Checkmate test management integration
 */

import { Stack, TextInput, Select, Switch, Text, Divider } from '@mantine/core';
import type { CheckmateSettings, CheckmateRules } from '~/types/release-config';
import { CheckmateRulesConfig } from './CheckmateRulesConfig';

interface CheckmateConfigFormProps {
  config: Partial<CheckmateSettings>;
  onChange: (config: Partial<CheckmateSettings>) => void;
  availableIntegrations: Array<{ 
    id: string; 
    name: string; 
    workspaceId?: string;
    baseUrl?: string;
    orgId?: string;
  }>;
}

export function CheckmateConfigForm({
  config,
  onChange,
  availableIntegrations,
}: CheckmateConfigFormProps) {
  // Find selected integration by ID (most reliable)
  const selectedIntegration = availableIntegrations.find(
    i => i.id === config.workspaceId || i.workspaceId === config.workspaceId || i.orgId === config.workspaceId
  );
  
  return (
    <Stack gap="md">
      <Select
        label="Checkmate Integration"
        placeholder="Select Checkmate integration"
        data={availableIntegrations.map(i => ({
          value: i.id,  // Use ID as the value (most stable identifier)
          label: i.name,
        }))}
        value={config.workspaceId}
        onChange={(val) => {
          // When selecting an integration, populate with its data
          const selected = availableIntegrations.find(int => int.id === val);
          onChange({ 
            ...config, 
            workspaceId: val || '',
            // Auto-populate orgId if available
            ...(selected?.orgId && { orgId: selected.orgId }),
          });
        }}
        required
        description="Choose the connected Checkmate workspace"
      />
      
      <TextInput
        label="Workspace ID"
        placeholder="workspace-123"
        value={config.workspaceId || ''}
        onChange={(e) => onChange({ ...config, workspaceId: e.target.value })}
        required
        description="Checkmate workspace identifier"
        disabled={!!selectedIntegration}
      />
      
      <TextInput
        label="Project ID"
        placeholder="project-456"
        value={config.projectId || ''}
        onChange={(e) => onChange({ ...config, projectId: e.target.value })}
        required
        description="Project ID within the Checkmate workspace"
      />
      
      <TextInput
        label="Test Run Name Template"
        placeholder="v{{version}} - {{platform}} - {{date}}"
        value={config.runNameTemplate || ''}
        onChange={(e) => onChange({ ...config, runNameTemplate: e.target.value })}
        description="Template for naming test runs. Available variables: {{version}}, {{platform}}, {{date}}"
      />
      
      <div>
        <Switch
          label="Auto-create Test Runs"
          description="Automatically create test runs in Checkmate when builds are ready"
          checked={config.autoCreateRuns ?? true}
          onChange={(e) =>
            onChange({ ...config, autoCreateRuns: e.currentTarget.checked })
          }
        />
      </div>

      <Divider label="Validation Rules" labelPosition="center" className="mt-4" />
      
      <CheckmateRulesConfig
        rules={config.rules || {
          maxFailedTests: 0,
          maxUntestedCases: 0,
          requireAllPlatforms: true,
          allowOverride: false,
        }}
        onChange={(rules) => onChange({ ...config, rules })}
      />
    </Stack>
  );
}

