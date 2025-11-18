/**
 * Jira Project Configuration Component
 * Configure Jira project for release tracking and ticket management
 */

import { Card, Switch, Text, Select, Group, Stack, TextInput, Checkbox, Alert } from '@mantine/core';
import { IconBrandJira, IconInfoCircle } from '@tabler/icons-react';

interface JiraProjectConfigProps {
  enabled: boolean;
  integrationId: string;
  projectKey: string;
  projectId?: string;
  issueTypeForRelease?: string;
  createReleaseTicket?: boolean;
  linkBuildsToIssues?: boolean;
  onToggle: (enabled: boolean) => void;
  onIntegrationChange: (integrationId: string) => void;
  onProjectKeyChange: (projectKey: string) => void;
  onProjectIdChange: (projectId: string) => void;
  onIssueTypeChange: (issueType: string) => void;
  onCreateReleaseTicketChange: (create: boolean) => void;
  onLinkBuildsChange: (link: boolean) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
}

export function JiraProjectConfig({
  enabled,
  integrationId,
  projectKey,
  projectId,
  issueTypeForRelease,
  createReleaseTicket,
  linkBuildsToIssues,
  onToggle,
  onIntegrationChange,
  onProjectKeyChange,
  onProjectIdChange,
  onIssueTypeChange,
  onCreateReleaseTicketChange,
  onLinkBuildsChange,
  availableIntegrations,
}: JiraProjectConfigProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="apart">
          <Group gap="sm">
            <IconBrandJira size={24} className="text-blue-600" />
            <div>
              <Text fw={600} size="md">
                Jira Project Management
              </Text>
              <Text size="xs" c="dimmed">
                Track releases and link builds to Jira issues
              </Text>
            </div>
          </Group>
          <Switch
            checked={enabled}
            onChange={(e) => onToggle(e.currentTarget.checked)}
            label={enabled ? 'Enabled' : 'Disabled'}
            color="blue"
          />
        </Group>
        
        {enabled && (
          <>
            <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
              <Text size="sm">
                Connect your Jira project to automatically create release tickets and link build information to issues.
              </Text>
            </Alert>
            
            <Select
              label="Jira Integration"
              placeholder="Select Jira workspace"
              data={availableIntegrations.map((integration) => ({
                value: integration.id,
                label: integration.name,
              }))}
              value={integrationId}
              onChange={(val) => val && onIntegrationChange(val)}
              required
              description="The Jira workspace to use for this release configuration"
            />
            
            <Group grow>
              <TextInput
                label="Project Key"
                placeholder="e.g., PROJ, APP, REL"
                value={projectKey}
                onChange={(e) => onProjectKeyChange(e.target.value)}
                required
                description="The Jira project key (visible in issue IDs like PROJ-123)"
              />
              
              <TextInput
                label="Project ID (Optional)"
                placeholder="e.g., 10001"
                value={projectId || ''}
                onChange={(e) => onProjectIdChange(e.target.value)}
                description="Numeric project ID from Jira"
              />
            </Group>
            
            <TextInput
              label="Release Issue Type (Optional)"
              placeholder="e.g., Release, Deployment"
              value={issueTypeForRelease || ''}
              onChange={(e) => onIssueTypeChange(e.target.value)}
              description="Issue type to use when creating release tickets"
            />
            
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Automation Options
              </Text>
              
              <Checkbox
                label="Auto-create release tickets"
                description="Automatically create a Jira ticket for each release"
                checked={createReleaseTicket || false}
                onChange={(e) => onCreateReleaseTicketChange(e.currentTarget.checked)}
              />
              
              <Checkbox
                label="Link build info to Jira issues"
                description="Associate build and deployment information with Jira issues"
                checked={linkBuildsToIssues || false}
                onChange={(e) => onLinkBuildsChange(e.currentTarget.checked)}
              />
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}

