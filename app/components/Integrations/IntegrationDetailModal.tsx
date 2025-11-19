import { useState } from 'react';
import { Modal, Badge, Button, Group, Divider, Loader } from '@mantine/core';
import type { IntegrationDetails } from '~/types/integrations';
import { IntegrationStatus } from '~/types/integrations';

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
  
  if (!integration) return null;

  const handleDisconnect = async () => {
    const integrationId = integration.id;
    
    // Confirm before disconnect
    const integrationName = integration.name;
    const confirmMessage = (() => {
      switch (integrationId) {
        case 'slack':
          return 'Are you sure you want to disconnect Slack? This will stop all release notifications.';
        case 'jenkins':
          return 'Are you sure you want to disconnect Jenkins? This will stop all CI/CD pipeline integrations.';
        case 'github-actions':
          return 'Are you sure you want to disconnect GitHub Actions? This will stop all workflow integrations.';
        default:
          return `Are you sure you want to disconnect ${integrationName}?`;
      }
    })();

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDisconnecting(true);

    try {
      let response;
      
      // Handle disconnect based on integration type
      switch (integrationId) {
        case 'slack':
          response = await fetch(`/api/v1/tenants/${tenantId}/integrations/slack`, {
            method: 'DELETE'
          });
          break;
        
        case 'jenkins':
          response = await fetch(`/api/v1/tenants/${tenantId}/integrations/ci-cd/jenkins`, {
            method: 'DELETE'
          });
          break;
        
        case 'github-actions':
          response = await fetch(`/api/v1/tenants/${tenantId}/integrations/ci-cd/github-actions`, {
            method: 'DELETE'
          });
          break;
        
        default:
          alert(`Disconnect not implemented for ${integrationName}`);
          setIsDisconnecting(false);
          return;
      }

      if (response.ok) {
        alert(`${integrationName} disconnected successfully!`);
        onClose();
        onDisconnectComplete(); // Notify parent that disconnect is complete
      } else {
        const error = await response.json();
        alert(`Failed to disconnect: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to disconnect ${integration.name}:`, error);
      alert(`Failed to disconnect ${integration.name}. Please try again.`);
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
      title={
        <div className="flex items-center gap-3">
          <span className="text-3xl">{integration.icon}</span>
          <div>
            <h2 className="text-xl font-semibold">{integration.name}</h2>
            <Badge
              size="sm"
              color={integration.status === IntegrationStatus.CONNECTED ? 'green' : 'red'}
            >
              {integration.status === IntegrationStatus.CONNECTED ? 'Connected' : 'Error'}
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
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            leftSection={isDisconnecting ? <Loader size="xs" /> : null}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
          
          <Group>
            {onEdit && (integration.id === 'jenkins' || integration.id === 'github-actions') && (
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
    </Modal>
  );
}

