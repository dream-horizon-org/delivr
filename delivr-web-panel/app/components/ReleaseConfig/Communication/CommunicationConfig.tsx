/**
 * Complete Communication Configuration Component
 * Main container for Slack notification configuration
 */

import { Stack, Text, Paper, Group, Box, ThemeIcon, useMantineTheme } from '@mantine/core';
import { IconBell, IconBrandSlack, IconMail } from '@tabler/icons-react';
import { useParams } from '@remix-run/react';
import type { CommunicationConfig as CommunicationConfigType } from '~/types/release-config';
import type { CommunicationConfigProps } from '~/types/release-config-props';
import { SlackChannelConfigEnhanced } from './SlackChannelConfigEnhanced';
import { IntegrationCategory } from '~/types/integrations';
import { NoIntegrationAlert } from '~/components/Common/NoIntegrationAlert';

export function CommunicationConfig({
  config,
  onChange,
  availableIntegrations,
  appId,
}: CommunicationConfigProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const orgId = params.org || appId || '';

  // Check if any communication integrations are connected
  const hasSlack = availableIntegrations.slack.length > 0;
  const hasAnyIntegration = hasSlack;

  // If no integrations are connected, show setup message
  if (!hasAnyIntegration) {
    return (
      <Stack gap="lg">
        {/* Info Header */}
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.blue[0],
            border: `1px solid ${theme.colors.blue[2]}`,
          }}
        >
          <Group gap="sm">
            <ThemeIcon size={32} radius="md" variant="light" color="blue">
              <IconBell size={18} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={600} c={theme.colors.blue[8]} mb={2}>
                Communication Channels
              </Text>
              <Text size="xs" c={theme.colors.blue[7]}>
                Configure Slack notifications and email alerts for your team
              </Text>
            </Box>
          </Group>
        </Paper>

        {/* No Integration Warning */}
        <NoIntegrationAlert
          category={IntegrationCategory.COMMUNICATION}
          appId={orgId}
          color="yellow"
        />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {/* Info Header */}
      <Paper
        p="md"
        radius="md"
        style={{
          backgroundColor: theme.colors.blue[0],
          border: `1px solid ${theme.colors.blue[2]}`,
        }}
      >
        <Group gap="sm">
          <ThemeIcon size={32} radius="md" variant="light" color="blue">
            <IconBell size={18} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={600} c={theme.colors.blue[8]} mb={2}>
              Communication Channels
            </Text>
            <Text size="xs" c={theme.colors.blue[7]}>
              Configure Slack notifications and email alerts for your team
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Slack Configuration */}
      {hasSlack && (
        <SlackChannelConfigEnhanced
          config={config}
          onChange={onChange}
          availableIntegrations={availableIntegrations.slack}
          appId={appId}
        />
      )}
    </Stack>
  );
}
