import { useState } from 'react';
import { Modal, Badge, Button, Group, Divider, Loader } from '@mantine/core';
import type { IntegrationDetails } from '~/types/integrations';
import { IntegrationStatus } from '~/types/integrations';
import { IntegrationIcon } from './IntegrationIcon';
import { DISCONNECT_CONFIG, INTEGRATION_STATUS_VALUES } from '~/constants/integrations';
import { ConfirmationModal } from '../Common/ConfirmationModal';
import { apiDelete, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast, showWarningToast } from '~/utils/toast';
import { INTEGRATION_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import { DEBUG_LABELS, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';

interface IntegrationDetailModalProps {
  integration: IntegrationDetails | null;
  opened: boolean;
  onClose: () => void;
  onDisconnectComplete: () => void; // Callback after successful disconnect
  onEdit?: (integrationId: string) => void;
  tenantId: string;
}

export function IntegrationDetailModal({
  integration,
  opened,
  onClose,
  onDisconnectComplete,
  onEdit,
  tenantId
}: IntegrationDetailModalProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  
  if (!integration) return null;

  const handleDisconnectClick = () => {
    const integrationId = integration?.id;
    if (!integrationId) return;

    // Normalize integration ID to lowercase for matching with DISCONNECT_CONFIG
    const normalizedId = integrationId.toLowerCase();
    
    console.log(`${DEBUG_LABELS.CONNECTION_PREFIX} Integration ID:`, integrationId);
    console.log(`${DEBUG_LABELS.CONNECTION_PREFIX} Normalized ID:`, normalizedId);
    console.log(`${DEBUG_LABELS.CONNECTION_PREFIX} Available configs:`, Object.keys(DISCONNECT_CONFIG));

    // Check if integration has disconnect config
    const config = DISCONNECT_CONFIG[normalizedId];
    if (!config) {
      console.error(`${DEBUG_LABELS.CONNECTION_PREFIX} No config found for integration ID:`, normalizedId);
      showWarningToast(INTEGRATION_MESSAGES.DISCONNECT_NOT_IMPLEMENTED(integration.name));
      return;
    }

    // Show confirmation modal
    setShowConfirmDisconnect(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!integration) return;

    const integrationId = integration.id;
    const integrationName = integration.name;
    // Normalize integration ID to lowercase for matching with DISCONNECT_CONFIG
    const normalizedId = integrationId.toLowerCase();
    const config = DISCONNECT_CONFIG[normalizedId];

    if (!config) return;

    setIsDisconnecting(true);

    try {
      // Get the endpoint URL
      const endpoint = config.endpoint(tenantId, integration.config);
      
      // Make DELETE request using API client
      await apiDelete(endpoint);

      showSuccessToast(INTEGRATION_MESSAGES.DISCONNECT_SUCCESS(integrationName));
      setShowConfirmDisconnect(false);
      onClose();
      onDisconnectComplete(); // Notify parent that disconnect is complete
    } catch (error) {
      const message = getApiErrorMessage(error, `Failed to disconnect ${integrationName}`);
      showErrorToast(getErrorMessage(message, INTEGRATION_MESSAGES.DISCONNECT_ERROR(integrationName).title));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      title={
        <div className="flex items-center gap-3">
          <IntegrationIcon name={integration.icon} size={32} className="text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-xl font-semibold">{integration.name}</h2>
            <Badge
              size="sm"
              color={integration.status === INTEGRATION_STATUS_VALUES.CONNECTED ? 'green' : 'red'}
            >
              {integration.status === INTEGRATION_STATUS_VALUES.CONNECTED ? 'Connected' : 'Error'}
            </Badge>
          </div>
        </div>
      }
      size="lg"
    >
      <div className="space-y-4">
        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
          <p className="text-sm text-gray-600">{integration.description}</p>
        </div>

        <Divider />

        {/* Connection Details */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Connection Details</h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            {integration.config?.owner && integration.config?.repo && (
              <div className="flex justify-between">
                <span className="text-gray-600">Repository:</span>
                <span className="font-medium">
                  {integration.config.owner}/{integration.config.repo}
                </span>
              </div>
            )}
            
            {integration.config?.repositoryUrl && (
              <div className="flex justify-between">
                <span className="text-gray-600">URL:</span>
                <a
                  href={integration.config.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  View on GitHub
                </a>
              </div>
            )}

            {integration.config?.defaultBranch && (
              <div className="flex justify-between">
                <span className="text-gray-600">Default Branch:</span>
                <span className="font-medium">{integration.config.defaultBranch}</span>
              </div>
            )}

            {/* Slack-specific configuration */}
            {integration.config?.workspaceName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Workspace:</span>
                <span className="font-medium">{integration.config.workspaceName}</span>
              </div>
            )}

            {integration.config?.workspaceId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Workspace ID:</span>
                <span className="font-mono text-xs">{integration.config.workspaceId}</span>
              </div>
            )}

            {integration.config?.botUserId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Bot User ID:</span>
                <span className="font-mono text-xs">{integration.config.botUserId}</span>
              </div>
            )}

            {integration.config?.channels && integration.config.channels.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-600">Channels ({integration.config.channelsCount || integration.config.channels.length}):</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {integration.config.channels.map((channel: any) => (
                    <Badge key={channel.id} size="sm" variant="light" color="blue">
                      #{channel.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Jenkins-specific configuration */}
            {integration.config?.displayName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Display Name:</span>
                <span className="font-medium">{integration.config.displayName}</span>
              </div>
            )}

            {integration.config?.hostUrl && (
              <div className="flex justify-between">
                <span className="text-gray-600">Host URL:</span>
                <a
                  href={integration.config.hostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {integration.config.hostUrl}
                </a>
              </div>
            )}

            {integration.config?.username && (
              <div className="flex justify-between">
                <span className="text-gray-600">Username:</span>
                <span className="font-medium">{integration.config.username}</span>
              </div>
            )}

            {/* Jira-specific configuration */}
            {integration.config?.baseUrl && (
              <div className="flex justify-between">
                <span className="text-gray-600">Base URL:</span>
                <a
                  href={integration.config.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {integration.config.baseUrl}
                </a>
              </div>
            )}

            {integration.config?.email && (
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{integration.config.email}</span>
              </div>
            )}

            {integration.config?.jiraType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Jira Type:</span>
                <Badge size="sm" variant="light" color="blue">
                  {integration.config.jiraType}
                </Badge>
              </div>
            )}

            {integration.config?.verificationStatus && (
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge
                  size="sm"
                  color={integration.config.verificationStatus === 'VALID' ? 'green' : 'yellow'}
                >
                  {integration.config.verificationStatus}
                </Badge>
              </div>
            )}

            {integration.config?.accountName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Account:</span>
                <span className="font-medium">{integration.config.accountName}</span>
              </div>
            )}

            {/* App Distribution specific configuration */}
            {integration.config?.appIdentifier && (
              <div className="flex justify-between">
                <span className="text-gray-600">App Identifier:</span>
                <span className="font-mono text-xs">{integration.config.appIdentifier}</span>
              </div>
            )}

            {integration.config?.storeType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Store Type:</span>
                <Badge size="sm" variant="light">
                  {integration.config.storeType === 'play_store' ? 'Play Store' : 'App Store'}
                </Badge>
              </div>
            )}

            {integration.config?.platforms && Array.isArray(integration.config.platforms) && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-600">Platforms:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {integration.config.platforms.map((platform: string) => (
                    <Badge key={platform} size="sm" variant="filled" color="blue">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {integration.config?.defaultTrack && (
              <div className="flex justify-between">
                <span className="text-gray-600">Default Track:</span>
                <Badge size="sm" variant="light" color="cyan">
                  {integration.config.defaultTrack}
                </Badge>
              </div>
            )}

            {integration.config?.defaultLocale && (
              <div className="flex justify-between">
                <span className="text-gray-600">Default Locale:</span>
                <span className="font-medium">{integration.config.defaultLocale}</span>
              </div>
            )}

            {integration.config?.teamName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Team Name:</span>
                <span className="font-medium">{integration.config.teamName}</span>
              </div>
            )}

            {integration.config?.targetAppId && (
              <div className="flex justify-between">
                <span className="text-gray-600">Target App ID:</span>
                <span className="font-mono text-xs">{integration.config.targetAppId}</span>
              </div>
            )}

            {integration.connectedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Connected At:</span>
                <span className="font-medium">{formatDate(integration.connectedAt)}</span>
              </div>
            )}

            {integration.connectedBy && (
              <div className="flex justify-between">
                <span className="text-gray-600">Connected By:</span>
                <span className="font-medium">{integration.connectedBy}</span>
              </div>
            )}

            {integration.lastSyncedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Last Synced:</span>
                <span className="font-medium">{formatDate(integration.lastSyncedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        {integration.features && integration.features.length > 0 && (
          <>
            <Divider />
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Enabled Features</h3>
              <div className="flex flex-wrap gap-2">
                {integration.features.map((feature, index) => (
                  <Badge key={index} variant="light" color="blue">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Permissions */}
        {integration.permissions && integration.permissions.length > 0 && (
          <>
            <Divider />
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Permissions Granted</h3>
              <div className="flex flex-wrap gap-2">
                {integration.permissions.map((permission, index) => (
                  <Badge key={index} variant="light" color="gray">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Webhook Status */}
        {integration.webhookUrl && (
          <>
            <Divider />
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Webhook</h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <Badge
                    size="sm"
                    color={integration.webhookStatus === 'active' ? 'green' : 'red'}
                  >
                    {integration.webhookStatus === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">URL:</span>
                  <span className="font-mono text-xs">{integration.webhookUrl}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <Divider />
        <Group justify="space-between">
          <Button
            variant="subtle"
            color="red"
            onClick={handleDisconnectClick}
            disabled={isDisconnecting}
            leftSection={isDisconnecting ? <Loader size="xs" /> : null}
          >
            {isDisconnecting ? 'Disconnecting...' : INTEGRATION_MODAL_LABELS.DISCONNECT}
          </Button>
          
          <Group>
            {onEdit && (integration.id === 'jenkins' || integration.id === 'github_actions' || integration.id === 'checkmate') && (
              <Button
                variant="filled"
                color="blue"
                onClick={() => {
                  onEdit(integration.id);
                  onClose();
                }}
              >
                Edit Connection
              </Button>
            )}
            <Button variant="light" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Group>
      </div>

      {/* Confirmation Modal */}
      {integration && DISCONNECT_CONFIG[integration.id.toLowerCase()] && (
        <ConfirmationModal
          opened={showConfirmDisconnect}
          onClose={() => setShowConfirmDisconnect(false)}
          onConfirm={handleConfirmDisconnect}
          title="Disconnect Integration"
          message={DISCONNECT_CONFIG[integration.id.toLowerCase()].message}
          confirmLabel="Disconnect"
          cancelLabel="Cancel"
          confirmColor="red"
          isLoading={isDisconnecting}
        />
      )}
    </Modal>
  );
}

