import { Badge, Card, Button, Group, Box, Text, Stack, useMantineTheme } from '@mantine/core';
import { IconCheck, IconClock, IconExternalLink } from '@tabler/icons-react';
import type { Integration } from '~/types/integrations';
import { IntegrationStatus } from '~/types/integrations';
import { IntegrationIcon } from '~/components/Integrations/IntegrationIcon';
import { INTEGRATION_STATUS_VALUES } from '~/constants/integrations';
import { INTEGRATION_CARD_LABELS } from '~/constants/integration-ui';
import { TARGET_PLATFORMS } from '~/types/release-config-constants';

interface IntegrationCardProps {
  integration: Integration;
  onClick: (integration: Integration) => void;
  onConnect?: (integration: Integration) => void;
}

export function IntegrationCard({ integration, onClick, onConnect }: IntegrationCardProps) {
  const theme = useMantineTheme();

  const isConnected = integration.status === INTEGRATION_STATUS_VALUES.CONNECTED;
  const isDisabled = !integration.isAvailable;

  // Get config summary for connected integrations
  const getConfigSummary = () => {
    if (!isConnected || !integration.config) return null;

    const config = integration.config;

    // GitHub/SCM
    if (config.owner && config.repo) {
      return `${config.owner}/${config.repo}`;
    }

    // Slack
    if (config.workspaceName) {
      const channelCount = config.channels?.length || 0;
      return channelCount > 0 
        ? `${config.workspaceName} • ${channelCount} channel${channelCount !== 1 ? 's' : ''}`
        : config.workspaceName;
    }

    // Jenkins/CI
    if (config.hostUrl) {
      try {
        const url = new URL(config.hostUrl);
        return url.hostname;
      } catch {
        return config.hostUrl;
      }
    }

    // Jira
    if (config.baseUrl) {
      try {
        const url = new URL(config.baseUrl);
        return url.hostname;
      } catch {
        return config.baseUrl;
      }
    }

    // App Distribution
    if (config.appIdentifier) {
      return config.appIdentifier;
    }

    // Generic
    if (config.displayName) {
      return config.displayName;
    }

    return null;
  };

  const configSummary = getConfigSummary();

  return (
    <Card
      padding="lg"
      radius="md"
      withBorder
      style={{
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        borderColor: isConnected ? theme.colors.brand[2] : theme.colors.slate[2],
        backgroundColor: isConnected ? `rgba(20, 184, 166, 0.02)` : '#ffffff',
        transition: 'all 200ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => !isDisabled && onClick(integration)}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = theme.shadows.md;
          e.currentTarget.style.borderColor = isConnected 
            ? theme.colors.brand[4] 
            : theme.colors.slate[3];
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = isConnected 
          ? theme.colors.brand[2] 
          : theme.colors.slate[2];
      }}
    >
      {/* Connected indicator bar */}
      {isConnected && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${theme.colors.brand[4]}, ${theme.colors.brand[5]})`,
          }}
        />
      )}

      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: theme.radius.md,
                backgroundColor: isConnected 
                  ? theme.colors.brand[0] 
                  : theme.colors.slate[1],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease',
              }}
            >
              <IntegrationIcon 
                name={integration.icon} 
                size={24}
                className={isConnected ? 'text-brand-600' : 'text-slate-500'}
              />
            </Box>
            <Box>
              <Text 
                size="sm" 
                fw={600} 
                c={isDisabled ? theme.colors.slate[5] : theme.colors.slate[8]}
                lh={1.3}
              >
                {integration.name}
              </Text>
              {integration.isPremium && (
                <Badge size="xs" color="yellow" variant="light" mt={4}>
                  Premium
                </Badge>
              )}
            </Box>
          </Group>

          {/* Status Badge */}
          <Badge
            size="sm"
            variant={isConnected ? 'light' : 'outline'}
            color={isConnected ? 'green' : 'gray'}
            leftSection={isConnected ? <IconCheck size={12} /> : null}
          >
            {isConnected ? 'Connected' : 'Not Connected'}
          </Badge>
        </Group>

        {/* Description */}
        {integration.description && (
          <Text 
            size="xs" 
            c={theme.colors.slate[5]} 
            lh={1.5}
            lineClamp={2}
          >
            {integration.description}
          </Text>
        )}

        {/* Config Summary (when connected) */}
        {isConnected && configSummary && (
          <Box
            p="xs"
            style={{
              backgroundColor: theme.colors.slate[0],
              borderRadius: theme.radius.sm,
              border: `1px solid ${theme.colors.slate[2]}`,
            }}
          >
            <Text 
              size="xs" 
              c={theme.colors.slate[6]} 
              ff="monospace"
              truncate
            >
              {configSummary}
            </Text>
          </Box>
        )}

        {/* Coming Soon */}
        {!integration.isAvailable && (
          <Box
            p="sm"
            style={{
              backgroundColor: theme.colors.slate[0],
              borderRadius: theme.radius.sm,
              border: `1px solid ${theme.colors.slate[2]}`,
            }}
          >
            <Group gap="xs" justify="center">
              <IconClock size={14} color={theme.colors.slate[5]} />
              <Text size="xs" fw={500} c={theme.colors.slate[5]}>
                {INTEGRATION_CARD_LABELS.COMING_SOON}
              </Text>
            </Group>
          </Box>
        )}

        {/* Action Button */}
        {integration.isAvailable && !isConnected && (
          <Button
            fullWidth
            size="sm"
            variant="light"
            color="brand"
            rightSection={<IconExternalLink size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              const handler = onConnect || onClick;
              handler(integration);
            }}
          >
            {INTEGRATION_CARD_LABELS.CONNECT}
          </Button>
        )}

        {/* Connected - View Details hint */}
        {isConnected && (
          <Group gap="xs" justify="center">
            <Text size="xs" c={theme.colors.slate[4]}>
              Click to view details
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
