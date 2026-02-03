import { useState } from 'react';
import { 
  Modal, 
  Badge, 
  Button, 
  Group, 
  Loader, 
  Box, 
  Text, 
  Stack,
  ThemeIcon,
  Divider,
  useMantineTheme,
  Alert,
} from '@mantine/core';
import { 
  IconCheck, 
  IconAlertTriangle, 
  IconTrash, 
  IconPencil,
  IconExternalLink,
  IconCalendar,
  IconUser,
  IconRefresh,
} from '@tabler/icons-react';
import type { IntegrationDetails } from '~/types/integrations';
import { IntegrationIcon } from './IntegrationIcon';
import { DISCONNECT_CONFIG, INTEGRATION_STATUS_VALUES } from '~/constants/integrations';
import { ConfirmationModal } from '../Common/ConfirmationModal';
import { apiDelete, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast, showWarningToast, showInfoToast } from '~/utils/toast';
import { INTEGRATION_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import { DEBUG_LABELS, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';

interface IntegrationDetailModalProps {
  integration: IntegrationDetails | null;
  opened: boolean;
  onClose: () => void;
  onDisconnectComplete: () => void;
  onEdit?: (integrationId: string) => void;
  appId: string;
}

export function IntegrationDetailModal({
  integration,
  opened,
  onClose,
  onDisconnectComplete,
  onEdit,
  appId
}: IntegrationDetailModalProps) {
  const theme = useMantineTheme();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  
  if (!integration) return null;

  const isConnected = integration.status === INTEGRATION_STATUS_VALUES.CONNECTED;

  const handleDisconnectClick = () => {
    const integrationId = integration?.id;
    if (!integrationId) return;

    const normalizedId = integrationId.toLowerCase();
    const config = DISCONNECT_CONFIG[normalizedId];
    
    if (!config) {
      showWarningToast(INTEGRATION_MESSAGES.DISCONNECT_NOT_IMPLEMENTED(integration.name));
      return;
    }

    setShowConfirmDisconnect(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!integration) return;

    const integrationId = integration.id;
    const integrationName = integration.name;
    const normalizedId = integrationId.toLowerCase();
    const config = DISCONNECT_CONFIG[normalizedId];

    if (!config) return;

    setIsDisconnecting(true);

    try {
      const endpoint = config.endpoint(appId, integration.config);
      
      const needsIntegrationIdInBody = ['jenkins', 'github_actions'].includes(normalizedId);
      const requestBody = needsIntegrationIdInBody && integration.config?.id
        ? { integrationId: integration.config.id }
        : undefined;
      
      await apiDelete(endpoint, requestBody);

      showSuccessToast(INTEGRATION_MESSAGES.DISCONNECT_SUCCESS(integrationName));
      setShowConfirmDisconnect(false);
      onClose();
      onDisconnectComplete();
    } catch (error) {
      // Show backend error message if available, otherwise show generic message
      const message = getApiErrorMessage(error, `Integration disconnect failed, please refresh and try again.`);
      showErrorToast(getErrorMessage(message, INTEGRATION_MESSAGES.DISCONNECT_ERROR(integrationName).title));
      
      // Still refresh the cache to sync UI with backend
      setShowConfirmDisconnect(false);
      onClose();
      onDisconnectComplete();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build config items to display
  const getConfigItems = () => {
    const items: { label: string; value: string | React.ReactNode }[] = [];
    const config = integration.config;

    if (!config) return items;

    // GitHub/SCM
    if (config.owner && config.repo) {
      items.push({
        label: 'Repository',
        value: (
          <Group gap={4}>
            <Text size="sm" fw={500} ff="monospace">
              {config.owner}/{config.repo}
            </Text>
            {config.repositoryUrl && (
              <a 
                href={config.repositoryUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <IconExternalLink size={14} color={theme.colors.brand[5]} />
              </a>
            )}
          </Group>
        ),
      });
    }

    if (config.defaultBranch) {
      items.push({ label: 'Default Branch', value: config.defaultBranch });
    }

    // Slack
    if (config.workspaceName) {
      items.push({ label: 'Workspace', value: config.workspaceName });
    }

    if (config.channels?.length > 0) {
      items.push({
        label: 'Channels',
        value: (
          <Group gap={4}>
            {config.channels.slice(0, 3).map((channel: any) => (
              <Badge key={channel.id} size="xs" variant="light" color="brand">
                #{channel.name}
              </Badge>
            ))}
            {config.channels.length > 3 && (
              <Badge size="xs" variant="outline" color="gray">
                +{config.channels.length - 3} more
              </Badge>
            )}
          </Group>
        ),
      });
    }

    // Jenkins/CI
    if (config.displayName) {
      items.push({ label: 'Display Name', value: config.displayName });
    }

    if (config.hostUrl) {
      items.push({
        label: 'Host URL',
        value: (
          <a 
            href={config.hostUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: theme.colors.brand[6], textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {config.hostUrl}
          </a>
        ),
      });
    }

    if (config.username) {
      items.push({ label: 'Username', value: config.username });
    }

    // Jira
    if (config.baseUrl) {
      items.push({
        label: 'Base URL',
        value: (
          <a 
            href={config.baseUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: theme.colors.brand[6], textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {config.baseUrl}
          </a>
        ),
      });
    }

    if (config.email) {
      items.push({ label: 'Email', value: config.email });
    }

    if (config.jiraType) {
      items.push({
        label: 'Jira Type',
        value: <Badge size="xs" variant="light">{config.jiraType}</Badge>,
      });
    }

    // App Distribution
    if (config.appIdentifier) {
      items.push({ 
        label: 'App Identifier', 
        value: <Text size="sm" ff="monospace">{config.appIdentifier}</Text>,
      });
    }

    if (config.storeType) {
      items.push({
        label: 'Store',
        value: (
          <Badge size="sm" variant="light">
            {config.storeType === 'play_store' ? 'Play Store' : 'App Store'}
          </Badge>
        ),
      });
    }

    if (config.platforms?.length > 0) {
      items.push({
        label: 'Platforms',
        value: (
          <Group gap={4}>
            {config.platforms.map((platform: string) => (
              <Badge key={platform} size="xs" variant="filled" color="brand">
                {platform}
              </Badge>
            ))}
          </Group>
        ),
      });
    }

    if (config.teamName) {
      items.push({ label: 'Team Name', value: config.teamName });
    }

    // Verification status
    if (config.verificationStatus) {
      items.push({
        label: 'Verification',
        value: (
          <Badge
            size="sm"
            color={config.verificationStatus === 'VALID' ? 'green' : 'yellow'}
            leftSection={config.verificationStatus === 'VALID' ? <IconCheck size={10} /> : null}
          >
            {config.verificationStatus}
          </Badge>
        ),
      });
    }

    return items;
  };

  const configItems = getConfigItems();

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        centered
        size="lg"
        radius="md"
        title={
          <Group gap="md">
            <ThemeIcon 
              size={44} 
              radius="md" 
              variant="light" 
              color={isConnected ? 'brand' : 'red'}
            >
              <IntegrationIcon name={integration.icon} size={24} />
            </ThemeIcon>
            <Box>
              <Text size="lg" fw={600} c={theme.colors.slate[9]}>
                {integration.name}
              </Text>
              <Badge
                size="sm"
                variant={isConnected ? 'light' : 'filled'}
                color={isConnected ? 'green' : 'red'}
                leftSection={isConnected ? <IconCheck size={10} /> : <IconAlertTriangle size={10} />}
              >
                {isConnected ? 'Connected' : 'Error'}
              </Badge>
            </Box>
          </Group>
        }
      >
        <Stack gap="lg">
          {/* Description */}
          {integration.description && (
            <Text size="sm" c={theme.colors.slate[6]} lh={1.6}>
              {integration.description}
            </Text>
          )}

          {/* Configuration Details */}
          {configItems.length > 0 && (
            <Box
              p="md"
              style={{
                backgroundColor: theme.colors.slate[0],
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.slate[2]}`,
              }}
            >
              <Text size="xs" fw={600} c={theme.colors.slate[5]} mb="sm" tt="uppercase">
                Configuration
              </Text>
              <Stack gap="sm">
                {configItems.map((item, index) => (
                  <Group key={index} justify="space-between" align="flex-start">
                    <Text size="sm" c={theme.colors.slate[5]}>
                      {item.label}
                    </Text>
                    <Box style={{ textAlign: 'right' }}>
                      {typeof item.value === 'string' ? (
                        <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                          {item.value}
                        </Text>
                      ) : (
                        item.value
                      )}
                    </Box>
                  </Group>
                ))}
              </Stack>
            </Box>
          )}

          {/* Connection Info */}
          <Box
            p="md"
            style={{
              backgroundColor: theme.colors.slate[0],
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.slate[2]}`,
            }}
          >
            <Text size="xs" fw={600} c={theme.colors.slate[5]} mb="sm" tt="uppercase">
              Connection Info
            </Text>
            <Stack gap="xs">
              {integration.connectedAt && (
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconCalendar size={14} color={theme.colors.slate[5]} />
                    <Text size="sm" c={theme.colors.slate[5]}>Connected</Text>
                  </Group>
                  <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                    {formatDate(integration.connectedAt)}
                  </Text>
                </Group>
              )}
              {integration.connectedBy && (
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconUser size={14} color={theme.colors.slate[5]} />
                    <Text size="sm" c={theme.colors.slate[5]}>Connected by</Text>
                  </Group>
                  <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                    {integration.connectedBy}
                  </Text>
                </Group>
              )}
              {integration.lastSyncedAt && (
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconRefresh size={14} color={theme.colors.slate[5]} />
                    <Text size="sm" c={theme.colors.slate[5]}>Last synced</Text>
                  </Group>
                  <Text size="sm" fw={500} c={theme.colors.slate[8]}>
                    {formatDate(integration.lastSyncedAt)}
                  </Text>
                </Group>
              )}
            </Stack>
          </Box>

          {/* Permissions */}
          {integration.permissions && integration.permissions.length > 0 && (
            <Box>
              <Text size="xs" fw={600} c={theme.colors.slate[5]} mb="xs" tt="uppercase">
                Permissions Granted
              </Text>
              <Group gap="xs">
                {integration.permissions.map((permission, index) => (
                  <Badge key={index} variant="light" color="gray" size="sm">
                    {permission}
                  </Badge>
                ))}
              </Group>
            </Box>
          )}

          <Divider />

          {/* Actions */}
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="red"
              size="sm"
              leftSection={isDisconnecting ? <Loader size={14} /> : <IconTrash size={14} />}
              onClick={handleDisconnectClick}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? 'Disconnecting...' : INTEGRATION_MODAL_LABELS.DISCONNECT}
            </Button>
            
            {onEdit && (
              <Button
                variant="light"
                color="brand"
                size="sm"
                leftSection={<IconPencil size={14} />}
                onClick={() => {
                  onEdit(integration.id);
                  onClose();
                }}
              >
                Edit
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>

      {/* Confirmation Modal */}
      {integration && DISCONNECT_CONFIG[integration.id.toLowerCase()] && (
      <ConfirmationModal
        opened={showConfirmDisconnect}
        onClose={() => setShowConfirmDisconnect(false)}
        onConfirm={handleConfirmDisconnect}
        title="Disconnect Integration"
        message={
          <Alert color="red">
            <Text size="sm" fw={600} mb={4}>
              This action may cause failures!
            </Text>
            <Text size="xs">
              Disconnecting this integration will affect all release configurations and active releases using it.
            </Text>
          </Alert>
        }
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        confirmColor="red"
        isLoading={isDisconnecting}
      />
    )}
    </>
  );
}
