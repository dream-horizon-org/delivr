/**
 * Complete Communication Configuration Component
 * Main container for Slack, Jira, and email notification configuration
 */

import { Stack, Text } from '@mantine/core';
import type { CommunicationConfig as CommunicationConfigType } from '~/types/release-config';
import { SlackChannelMapper } from './SlackChannelMapper';
import { JiraProjectConfig } from './JiraProjectConfig';
import { EmailNotificationConfig } from './EmailNotificationConfig';

interface CommunicationConfigProps {
  config: CommunicationConfigType;
  onChange: (config: CommunicationConfigType) => void;
  availableIntegrations: {
    slack: Array<{ id: string; name: string }>;
    jira: Array<{ id: string; name: string }>;
  };
}

export function CommunicationConfig({
  config,
  onChange,
  availableIntegrations,
}: CommunicationConfigProps) {
  const handleSlackToggle = (enabled: boolean) => {
    onChange({
      ...config,
      slack: enabled
        ? {
            enabled: true,
            integrationId: config.slack?.integrationId || '',
            channels: config.slack?.channels || {
              releases: '#releases',
              builds: '#builds',
              regression: '#regression',
              critical: '#critical-alerts',
            },
          }
        : undefined,
    });
  };
  
  const handleSlackIntegrationChange = (integrationId: string) => {
    if (config.slack) {
      onChange({
        ...config,
        slack: {
          ...config.slack,
          integrationId,
        },
      });
    }
  };
  
  const handleSlackChannelsChange = (channels: any) => {
    if (config.slack) {
      onChange({
        ...config,
        slack: {
          ...config.slack,
          channels,
        },
      });
    }
  };
  
  const handleEmailToggle = (enabled: boolean) => {
    onChange({
      ...config,
      email: enabled
        ? {
            enabled: true,
            notificationEmails: config.email?.notificationEmails || [],
          }
        : undefined,
    });
  };
  
  const handleEmailChange = (emails: string[]) => {
    if (config.email) {
      onChange({
        ...config,
        email: {
          ...config.email,
          notificationEmails: emails,
        },
      });
    }
  };
  
  const handleJiraToggle = (enabled: boolean) => {
    onChange({
      ...config,
      jira: enabled
        ? {
            enabled: true,
            integrationId: config.jira?.integrationId || '',
            projectKey: config.jira?.projectKey || '',
            projectId: config.jira?.projectId,
            issueTypeForRelease: config.jira?.issueTypeForRelease,
            createReleaseTicket: config.jira?.createReleaseTicket || false,
            linkBuildsToIssues: config.jira?.linkBuildsToIssues || false,
          }
        : undefined,
    });
  };
  
  const handleJiraChange = (updates: Partial<NonNullable<typeof config.jira>>) => {
    if (config.jira) {
      onChange({
        ...config,
        jira: {
          ...config.jira,
          ...updates,
        },
      });
    }
  };
  
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          Communication & Project Management
        </Text>
        <Text size="sm" c="dimmed">
          Configure Slack notifications, Jira project tracking, and email alerts
        </Text>
      </div>
      
      <SlackChannelMapper
        enabled={config.slack?.enabled || false}
        integrationId={config.slack?.integrationId || ''}
        channels={
          config.slack?.channels || {
            releases: '',
            builds: '',
            regression: '',
            critical: '',
          }
        }
        onToggle={handleSlackToggle}
        onChange={handleSlackChannelsChange}
        onIntegrationChange={handleSlackIntegrationChange}
        availableIntegrations={availableIntegrations.slack}
      />
      
      <JiraProjectConfig
        enabled={config.jira?.enabled || false}
        integrationId={config.jira?.integrationId || ''}
        projectKey={config.jira?.projectKey || ''}
        projectId={config.jira?.projectId}
        issueTypeForRelease={config.jira?.issueTypeForRelease}
        createReleaseTicket={config.jira?.createReleaseTicket}
        linkBuildsToIssues={config.jira?.linkBuildsToIssues}
        onToggle={handleJiraToggle}
        onIntegrationChange={(id) => handleJiraChange({ integrationId: id })}
        onProjectKeyChange={(key) => handleJiraChange({ projectKey: key })}
        onProjectIdChange={(id) => handleJiraChange({ projectId: id })}
        onIssueTypeChange={(type) => handleJiraChange({ issueTypeForRelease: type })}
        onCreateReleaseTicketChange={(create) => handleJiraChange({ createReleaseTicket: create })}
        onLinkBuildsChange={(link) => handleJiraChange({ linkBuildsToIssues: link })}
        availableIntegrations={availableIntegrations.jira}
      />
      
      <EmailNotificationConfig
        enabled={config.email?.enabled || false}
        emails={config.email?.notificationEmails || []}
        onToggle={handleEmailToggle}
        onChange={handleEmailChange}
      />
    </Stack>
  );
}

