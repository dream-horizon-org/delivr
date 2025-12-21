/**
 * Complete Communication Configuration Component
 * Main container for Slack notification configuration
 */

import { Stack, Text, Paper, Group, Box, ThemeIcon, Anchor, useMantineTheme } from '@mantine/core';
import { IconBell, IconAlertCircle, IconPlug, IconBrandSlack, IconMail } from '@tabler/icons-react';
import { Link, useParams } from '@remix-run/react';
import type { CommunicationConfig as CommunicationConfigType } from '~/types/release-config';
import type { CommunicationConfigProps } from '~/types/release-config-props';
import { SlackChannelConfigEnhanced } from './SlackChannelConfigEnhanced';

export function CommunicationConfig({
  config,
  onChange,
  availableIntegrations,
  tenantId,
}: CommunicationConfigProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const orgId = params.org || tenantId || '';

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
        <Paper
          p="md"
          radius="md"
          style={{
            backgroundColor: theme.colors.red[0],
            border: `1px solid ${theme.colors.red[2]}`,
          }}
        >
          <Group gap="sm" align="flex-start">
            <ThemeIcon size={32} radius="md" variant="light" color="red">
              <IconAlertCircle size={18} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={600} c={theme.colors.red[8]} mb={4}>
                No Communication Integrations Configured
              </Text>
              <Text size="xs" c={theme.colors.red[7]} mb="sm">
                You need to connect a communication integration (like Slack) before
                you can configure notifications.
              </Text>
              <Anchor
                component={Link}
                to={`/dashboard/${orgId}/integrations?tab=COMMUNICATION`}
                size="sm"
                c={theme.colors.red[8]}
                fw={600}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <IconPlug size={14} />
                Go to Integrations
              </Anchor>
            </Box>
          </Group>
        </Paper>
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
          tenantId={tenantId}
        />
      )}
    </Stack>
  );
}
