import { Modal, Badge, Button, Group, Divider } from '@mantine/core';
import type { IntegrationDetails } from '~/types/integrations';
import { IntegrationStatus } from '~/types/integrations';

interface IntegrationDetailModalProps {
  integration: IntegrationDetails | null;
  opened: boolean;
  onClose: () => void;
  onDisconnect: (integrationId: string) => void;
}

export function IntegrationDetailModal({
  integration,
  opened,
  onClose,
  onDisconnect
}: IntegrationDetailModalProps) {
  if (!integration) return null;

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

            {integration.config?.workspace && (
              <div className="flex justify-between">
                <span className="text-gray-600">Workspace:</span>
                <span className="font-medium">{integration.config.workspace}</span>
              </div>
            )}

            {integration.config?.channelName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Channel:</span>
                <span className="font-medium">#{integration.config.channelName}</span>
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
        <Group justify="flex-end">
          <Button
            variant="subtle"
            color="red"
            onClick={() => {
              if (confirm(`Are you sure you want to disconnect ${integration.name}?`)) {
                onDisconnect(integration.id);
                onClose();
              }
            }}
          >
            Disconnect
          </Button>
          <Button variant="light" onClick={onClose}>
            Close
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

