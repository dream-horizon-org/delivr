/**
 * JIRA Platform Configuration Card
 * Displays configuration fields for a single platform (Web/iOS/Android)
 */

import { Card, TextInput, Select, Stack, Text, Badge } from '@mantine/core';
import type { JiraPlatformConfig } from '~/types/release-config';
import {
  JIRA_PLATFORM_CONFIG,
  JIRA_ISSUE_TYPES,
  JIRA_COMPLETION_STATUSES,
  JIRA_PRIORITIES,
} from '../release-config-constants';

interface JiraPlatformConfigCardProps {
  platform: 'WEB' | 'IOS' | 'ANDROID';
  config: JiraPlatformConfig;
  onChange: (config: JiraPlatformConfig) => void;
}

export function JiraPlatformConfigCard({
  platform,
  config,
  onChange,
}: JiraPlatformConfigCardProps) {
  const platformConfig = JIRA_PLATFORM_CONFIG[platform];

  const handleChange = (field: keyof JiraPlatformConfig, value: unknown) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <Card withBorder p="md" radius="md">
      {/* Platform Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{platformConfig.icon}</span>
        <Text fw={600} size="lg">
          {platformConfig.label}
        </Text>
        <Badge color={platformConfig.color} variant="light" size="sm">
          {platform}
        </Badge>
      </div>

      <Stack gap="md">
        {/* Project Key - Required */}
        <TextInput
          label="Project Key"
          placeholder="e.g., APP, FE, MOBILE"
          description="JIRA project key (uppercase letters and numbers)"
          value={config.projectKey}
          onChange={(e) => handleChange('projectKey', e.target.value.toUpperCase())}
          required
          error={
            config.projectKey && !/^[A-Z][A-Z0-9]*$/.test(config.projectKey)
              ? 'Must be uppercase letters and numbers'
              : undefined
          }
        />

        {/* Issue Type - Optional */}
        <Select
          label="Issue Type"
          placeholder="Select issue type"
          description="Type of JIRA issue to create for releases"
          data={JIRA_ISSUE_TYPES}
          value={config.issueType || null}
          onChange={(value) => handleChange('issueType', value || undefined)}
          clearable
          searchable
        />

        {/* Completion Status - Required */}
        <Select
          label="Completion Status"
          placeholder="Select completion status"
          description="Status that indicates work is complete"
          data={JIRA_COMPLETION_STATUSES}
          value={config.completedStatus}
          onChange={(value) => handleChange('completedStatus', value || 'Done')}
          required
          searchable
          creatable
          getCreateLabel={(query) => `+ Create "${query}"`}
          onCreate={(query) => {
            const item = { value: query, label: query };
            return item;
          }}
        />

        {/* Priority - Optional */}
        <Select
          label="Priority"
          placeholder="Select default priority"
          description="Default priority for created issues"
          data={JIRA_PRIORITIES}
          value={config.priority || null}
          onChange={(value) => handleChange('priority', value || undefined)}
          clearable
        />
      </Stack>
    </Card>
  );
}

