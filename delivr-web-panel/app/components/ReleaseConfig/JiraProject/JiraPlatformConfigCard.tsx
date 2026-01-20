/**
 * JIRA Platform Configuration Card
 * Displays configuration fields for a single platform (Web/iOS/Android)
 */

import { Card, TextInput, Select, Stack, Text, Badge } from '@mantine/core';
import type { JiraPlatformConfig } from '~/types/release-config';
import type { JiraPlatformConfigCardProps } from '~/types/release-config-props';
import {
  JIRA_PLATFORM_CONFIG,
  JIRA_ISSUE_TYPES,
  JIRA_COMPLETION_STATUSES,
  JIRA_PRIORITIES,
} from '~/constants/release-config';
import { JIRA_LABELS, JIRA_FIELD_NAMES, VALIDATION_MESSAGES } from '~/constants/release-config-ui';

export function JiraPlatformConfigCard({
  platform,
  config,
  onChange,
  projects = [],
}: JiraPlatformConfigCardProps) {
  const platformConfig = JIRA_PLATFORM_CONFIG[platform];

  const handleChange = (field: keyof JiraPlatformConfig['parameters'], value: unknown) => {
    onChange({
      ...config,
      parameters: {
        ...config.parameters,
        [field]: value,
      },
    });
  };

  // Prepare project options for dropdown
  const projectOptions = projects.map(project => ({
    value: project.key,
    label: `${project.key} - ${project.name}`,
  }));

  return (
    <Card withBorder p="md" radius="md">
      {/* Platform Header */}
      <div className="flex items-center gap-2 mb-4">
        <Badge color={platformConfig.color} variant="light" size="sm">
          {platform}
        </Badge>
      </div>

      <Stack gap="md">
        {/* Project Key - Required - Now a dropdown if projects are available */}
        {projects.length > 0 ? (
          <Select
            label={JIRA_LABELS.PROJECT_KEY}
            placeholder={JIRA_LABELS.PROJECT_KEY_PLACEHOLDER}
            description={JIRA_LABELS.PROJECT_KEY_DESCRIPTION}
            data={projectOptions}
            value={(config.parameters?.projectKey as string) || null}
            onChange={(value) => handleChange(JIRA_FIELD_NAMES.PROJECT_KEY, value || '')}
            required
            searchable
            error={
              config.parameters?.projectKey && typeof config.parameters.projectKey === 'string' && !/^[A-Z][A-Z0-9]*$/.test(config.parameters.projectKey)
                ? VALIDATION_MESSAGES.JIRA_PROJECT_KEY_INVALID
                : undefined
            }
          />
        ) : (
          <TextInput
            label={JIRA_LABELS.PROJECT_KEY}
            placeholder={JIRA_LABELS.PROJECT_KEY_PLACEHOLDER}
            description={JIRA_LABELS.PROJECT_KEY_DESCRIPTION}
            value={(config.parameters?.projectKey as string) || ''}
            onChange={(e) => handleChange(JIRA_FIELD_NAMES.PROJECT_KEY, e.target.value.toUpperCase())}
            required
            error={
              config.parameters?.projectKey && typeof config.parameters.projectKey === 'string' && !/^[A-Z][A-Z0-9]*$/.test(config.parameters.projectKey)
                ? VALIDATION_MESSAGES.JIRA_PROJECT_KEY_INVALID
                : undefined
            }
          />
        )}

        {/* Issue Type - Required */}
        <Select
          label={JIRA_LABELS.ISSUE_TYPE}
          placeholder={JIRA_LABELS.ISSUE_TYPE_PLACEHOLDER}
          description={JIRA_LABELS.ISSUE_TYPE_DESCRIPTION}
          data={JIRA_ISSUE_TYPES}
          value={(config.parameters?.issueType as string) || null}
          onChange={(value) => handleChange(JIRA_FIELD_NAMES.ISSUE_TYPE, value || '')}
          required
          searchable
        />

        {/* Completion Status - Required */}
        <Select
          label={JIRA_LABELS.COMPLETION_STATUS}
          placeholder={JIRA_LABELS.COMPLETION_STATUS_PLACEHOLDER}
          description={JIRA_LABELS.COMPLETION_STATUS_DESCRIPTION}
          data={JIRA_COMPLETION_STATUSES}
          value={(config.parameters?.completedStatus as string) || 'Done'}
          onChange={(value) => handleChange(JIRA_FIELD_NAMES.COMPLETED_STATUS, value || 'Done')}
          required
          searchable
        />

        {/* Priority - Optional */}
        <Select
          label={JIRA_LABELS.PRIORITY}
          placeholder={JIRA_LABELS.PRIORITY_PLACEHOLDER}
          description={JIRA_LABELS.PRIORITY_DESCRIPTION}
          data={JIRA_PRIORITIES}
          value={(config.parameters?.priority as string) || null}
          onChange={(value) => handleChange(JIRA_FIELD_NAMES.PRIORITY, value || undefined)}
          clearable
        />
      </Stack>
    </Card>
  );
}

