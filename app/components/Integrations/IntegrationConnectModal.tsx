import { Modal, Button, Group, Alert } from '@mantine/core';
import type { Integration } from '~/types/integrations';
import { GitHubConnectionFlow } from './GitHubConnectionFlow';
import { SlackConnectionFlow } from './SlackConnectionFlow';
import { JenkinsConnectionFlow } from './JenkinsConnectionFlow';
import { GitHubActionsConnectionFlow } from './GitHubActionsConnectionFlow';
import { CheckmateConnectionFlow } from './CheckmateConnectionFlow';
import { JiraConnectionFlow } from './JiraConnectionFlow';

interface IntegrationConnectModalProps {
  integration: Integration | null;
  opened: boolean;
  onClose: () => void;
  onConnect: (integrationId: string, data?: any) => void;
  isEditMode?: boolean;
  existingData?: any;
}

export function IntegrationConnectModal({
  integration,
  opened,
  onClose,
  onConnect,
  isEditMode = false,
  existingData
}: IntegrationConnectModalProps) {
  if (!integration) return null;

  // Debug: Log integration details
  console.log('[IntegrationConnectModal] Integration:', {
    id: integration.id,
    name: integration.name,
    category: integration.category,
    isAvailable: integration.isAvailable
  });

  // Determine which connection flow to render
  const renderConnectionFlow = () => {
    console.log('[IntegrationConnectModal] Matching against integration.id:', integration.id);
    
    // Normalize integration ID to lowercase for consistent matching
    const integrationId = integration.id.toLowerCase();
    
    switch (integrationId) {
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
            isEditMode={isEditMode}
            existingData={existingData}
          />
        );
      
      case 'github-actions':
        return (
          <GitHubActionsConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
            isEditMode={isEditMode}
            existingData={existingData}
          />
        );
      
      case 'checkmate':
        console.log('[IntegrationConnectModal] Rendering CheckmateConnectionFlow');
        return (
          <CheckmateConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
            isEditMode={isEditMode}
            existingData={existingData}
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
        return (
          <GitHubConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
            isEditMode={isEditMode}
            existingData={existingData}
          />
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
        console.log('[IntegrationConnectModal] FALLBACK: Rendering demo mode for:', integration.id, '(normalized:', integrationId, ')');
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
          <h2 className="text-xl font-semibold">
            {isEditMode ? `Edit ${integration.name}` : `Connect ${integration.name}`}
          </h2>
        </div>
      }
      size={['slack', 'github'].includes(integration.id) ? 'lg' : 'md'}
    >
      {renderConnectionFlow()}
    </Modal>
  );
}

