import { Modal, Button, Group, Alert } from '@mantine/core';
import type { Integration } from '~/types/integrations';

interface IntegrationConnectModalProps {
  integration: Integration | null;
  opened: boolean;
  onClose: () => void;
  onConnect: (integrationId: string) => void;
}

export function IntegrationConnectModal({
  integration,
  opened,
  onClose,
  onConnect
}: IntegrationConnectModalProps) {
  if (!integration) return null;

  const handleConnect = () => {
    // For now, just call onConnect with the integration ID
    // In the future, this will navigate to actual connection flows
    onConnect(integration.id);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="text-3xl">{integration.icon}</span>
          <h2 className="text-xl font-semibold">Connect {integration.name}</h2>
        </div>
      }
      size="md"
    >
      <div className="space-y-4">
        {/* Description */}
        <div>
          <p className="text-sm text-gray-600">{integration.description}</p>
        </div>

        {/* Coming Soon Message or Connection Flow */}
        {!integration.isAvailable ? (
          <Alert color="blue" title="Coming Soon" icon={<span>🚧</span>}>
            {integration.name} integration is currently under development. Stay tuned for updates!
          </Alert>
        ) : integration.id === 'github' ? (
          <div>
            <Alert color="green" title="Ready to Connect" icon={<span>✓</span>}>
              Click below to connect your GitHub repository and enable release management features.
            </Alert>
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">What you'll get:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Create and manage release branches</li>
                <li>Trigger GitHub Actions workflows</li>
                <li>Auto-generate release notes</li>
                <li>Manage tags and releases</li>
                <li>Real-time webhook updates</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <Alert color="yellow" title="Demo Mode" icon={<span>🔨</span>}>
              This is a placeholder for the {integration.name} connection flow. The actual implementation will be added soon.
            </Alert>
            <div className="mt-4 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Planned Features:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Secure OAuth authentication</li>
                <li>Easy configuration setup</li>
                <li>Real-time synchronization</li>
                <li>Comprehensive integration options</li>
              </ul>
            </div>
          </div>
        )}

        {/* Actions */}
        <Group justify="flex-end" className="mt-6">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          {integration.isAvailable && (
            <Button
              onClick={handleConnect}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {integration.id === 'github' ? 'Connect GitHub' : 'Connect (Demo)'}
            </Button>
          )}
        </Group>
      </div>
    </Modal>
  );
}

