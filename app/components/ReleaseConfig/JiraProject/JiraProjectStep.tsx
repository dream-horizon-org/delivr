/**
 * Jira Project Configuration Step
 * Step in the Release Configuration wizard for Jira project management setup
 */

import { Stack, Text } from '@mantine/core';
import type { JiraProjectConfig } from '~/types/release-config';
import { JiraProjectConfigCard } from '../Communication/JiraProjectConfigCard';

interface JiraProjectStepProps {
  config: JiraProjectConfig;
  onChange: (config: JiraProjectConfig) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
}

export function JiraProjectStep({
  config,
  onChange,
  availableIntegrations,
}: JiraProjectStepProps) {
  const handleToggle = (enabled: boolean) => {
    onChange({
      ...config,
      enabled,
      integrationId: enabled ? (config.integrationId || '') : '',
      projectKey: enabled ? (config.projectKey || '') : '',
    });
  };

  const handleChange = (updates: Partial<JiraProjectConfig>) => {
    onChange({
      ...config,
      ...updates,
    });
  };

  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Jira Project Management
        </Text>
        <Text size="sm" c="dimmed">
          Connect your Jira project to track releases and link builds to issues (Optional)
        </Text>
      </div>

      <JiraProjectConfigCard
        enabled={config.enabled}
        integrationId={config.integrationId}
        projectKey={config.projectKey}
        projectId={config.projectId}
        issueTypeForRelease={config.issueTypeForRelease}
        createReleaseTicket={config.createReleaseTicket}
        linkBuildsToIssues={config.linkBuildsToIssues}
        onToggle={handleToggle}
        onIntegrationChange={(id) => handleChange({ integrationId: id })}
        onProjectKeyChange={(key) => handleChange({ projectKey: key })}
        onProjectIdChange={(id) => handleChange({ projectId: id })}
        onIssueTypeChange={(type) => handleChange({ issueTypeForRelease: type })}
        onCreateReleaseTicketChange={(create) => handleChange({ createReleaseTicket: create })}
        onLinkBuildsChange={(link) => handleChange({ linkBuildsToIssues: link })}
        availableIntegrations={availableIntegrations}
      />
    </Stack>
  );
}
