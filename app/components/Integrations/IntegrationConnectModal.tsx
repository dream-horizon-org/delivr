import { Modal, Button, Group, Alert } from '@mantine/core';
import type { Integration } from '~/types/integrations';
import { SlackConnectionFlow } from './SlackConnectionFlow';
import { JenkinsConnectionFlow } from './JenkinsConnectionFlow';
import { CheckmateConnectionFlow } from './CheckmateConnectionFlow';
import { JiraConnectionFlow } from './JiraConnectionFlow';

interface IntegrationConnectModalProps {
  integration: Integration | null;
  opened: boolean;
  onClose: () => void;
  onConnect: (integrationId: string, data?: any) => void;
}

export function IntegrationConnectModal({
  integration,
  opened,
  onClose,
  onConnect
}: IntegrationConnectModalProps) {
  if (!integration) return null;

  // Determine which connection flow to render
  const renderConnectionFlow = () => {
    switch (integration.id) {
      case 'slack':
        return (
          <SlackConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case 'jenkins':
        return (
          <JenkinsConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case 'checkmate':
        return (
          <CheckmateConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case 'jira':
        return (
          <JiraConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case 'github':
        // GitHub redirects to setup page, so show simple info
        return (
          <div className="space-y-4">
            <Alert color="green" title="Ready to Connect" icon={<span>✓</span>}>
              Click below to connect your GitHub repository and enable release management features.
            </Alert>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">What you'll get:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Create and manage release branches</li>
                <li>Trigger GitHub Actions workflows</li>
                <li>Auto-generate release notes</li>
                <li>Manage tags and releases</li>
                <li>Real-time webhook updates</li>
              </ul>
            </div>
            <Group justify="flex-end" className="mt-6">
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConnect(integration.id);
                  onClose();
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect GitHub
              </Button>
            </Group>
          </div>
        );
      
      case 'appstore':
      case 'playstore':
        // App distribution integrations - connection flow coming soon
        return (
          <div className="space-y-4">
            <Alert color="blue" title="Connect Integration" icon={<span>🔗</span>}>
              Connect {integration.name} to enable {integration.description}
            </Alert>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Setup Instructions:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Connection flow is available via API routes</li>
                <li>Backend integration is ready</li>
                <li>Full UI implementation coming soon</li>
              </ul>
            </div>
            <Group justify="flex-end" className="mt-6">
              <Button variant="subtle" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={() => {
                  // This will trigger the connection - for now returns 500 as backend isn't ready
                  onConnect(integration.id);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect {integration.name}
              </Button>
            </Group>
          </div>
        );
      
      default:
        // Coming soon / demo mode
        return (
          <div className="space-y-4">
            <Alert color="yellow" title="Demo Mode" icon={<span>🔨</span>}>
              This is a placeholder for the {integration.name} connection flow. The actual implementation will be added soon.
            </Alert>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Planned Features:</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Secure OAuth authentication</li>
                <li>Easy configuration setup</li>
                <li>Real-time synchronization</li>
                <li>Comprehensive integration options</li>
              </ul>
            </div>
            <Group justify="flex-end" className="mt-6">
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onConnect(integration.id);
                  onClose();
                }}
                disabled={!integration.isAvailable}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect (Demo)
              </Button>
            </Group>
          </div>
        );
    }
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
      size={integration.id === 'slack' ? 'lg' : 'md'}
    >
      {renderConnectionFlow()}
    </Modal>
  );
}

