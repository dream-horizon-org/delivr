import { Modal, Button, Group, Alert } from '@mantine/core';
import type { Integration } from '~/types/integrations';
import { GitHubConnectionFlow } from './GitHubConnectionFlow';
import { SlackConnectionFlow } from './SlackConnectionFlow';
import { JenkinsConnectionFlow } from './JenkinsConnectionFlow';
import { GitHubActionsConnectionFlow } from './GitHubActionsConnectionFlow';
import { CheckmateConnectionFlow } from './CheckmateConnectionFlow';
import { JiraConnectionFlow } from './JiraConnectionFlow';
import { AppDistributionConnectionFlow } from './AppDistributionConnectionFlow';
import { IntegrationIcon } from '~/components/Integrations/IntegrationIcon';
import { useParams } from '@remix-run/react';
import { useSystemMetadata } from '~/hooks/useSystemMetadata';
import { PLATFORMS, TARGET_PLATFORMS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { INTEGRATION_IDS, INTEGRATION_MODAL_LABELS, DEBUG_LABELS } from '~/constants/integration-ui';

export interface IntegrationConnectModalProps {
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
  const params = useParams();
  const tenantId = params.org!;
  // const { data: systemMetadata } = useSystemMetadata();
  const data = null; 
  if (!integration) return null;

  // Debug: Log integration details
  console.log(`${DEBUG_LABELS.MODAL_PREFIX} ${DEBUG_LABELS.MODAL_INTEGRATION_DETAILS}`, {
    id: integration.id,
    name: integration.name,
    category: integration.category,
    isAvailable: integration.isAvailable
  });

  // Determine which connection flow to render
  const renderConnectionFlow = () => {
    console.log(`${DEBUG_LABELS.MODAL_PREFIX} ${DEBUG_LABELS.MODAL_MATCHING_ID}`, integration.id);
    
    // Normalize integration ID to lowercase for consistent matching
    const integrationId = integration.id.toLowerCase();
    
    switch (integrationId) {
      case INTEGRATION_IDS.SLACK:
        return (
          <SlackConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case INTEGRATION_IDS.JENKINS:
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
      
      case INTEGRATION_IDS.GITHUB_ACTIONS:
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
      
      case INTEGRATION_IDS.CHECKMATE:
        console.log(`${DEBUG_LABELS.MODAL_PREFIX} Rendering CheckmateConnectionFlow`);
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
      
      case INTEGRATION_IDS.JIRA:
        return (
          <JiraConnectionFlow
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case INTEGRATION_IDS.GITHUB:
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
      
      case TARGET_PLATFORMS.PLAY_STORE:
      case 'play_store':
      case 'playstore':
        return (
          <AppDistributionConnectionFlow
            storeType={TARGET_PLATFORMS.PLAY_STORE}
            tenantId={tenantId}
            allowedPlatforms={[PLATFORMS.ANDROID]}
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case TARGET_PLATFORMS.APP_STORE:
      case 'app_store':
      case 'appstore':
        return (
          <AppDistributionConnectionFlow
            storeType={TARGET_PLATFORMS.APP_STORE}
            tenantId={tenantId}
            allowedPlatforms={[PLATFORMS.IOS]}
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      case BUILD_ENVIRONMENTS.TESTFLIGHT:
      case 'testflight':
        return (
          <AppDistributionConnectionFlow
            storeType={BUILD_ENVIRONMENTS.TESTFLIGHT}
            tenantId={tenantId}
            allowedPlatforms={[PLATFORMS.IOS]}
            onConnect={(data) => {
              onConnect(integration.id, data);
              onClose();
            }}
            onCancel={onClose}
          />
        );
      
      default:
        // Coming soon / demo mode
        console.log(`${DEBUG_LABELS.MODAL_PREFIX} ${DEBUG_LABELS.MODAL_FALLBACK}`, integration.id, `${DEBUG_LABELS.MODAL_NORMALIZED}`, integrationId, ')');
        return (
          <div className="space-y-4">
            <Alert color="yellow" title={INTEGRATION_MODAL_LABELS.DEMO_MODE_TITLE} icon={<span>🔨</span>}>
              {INTEGRATION_MODAL_LABELS.DEMO_MODE_MESSAGE(integration.name)}
            </Alert>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{INTEGRATION_MODAL_LABELS.PLANNED_FEATURES_TITLE}</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                {INTEGRATION_MODAL_LABELS.PLANNED_FEATURES.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
            <Group justify="flex-end" className="mt-6">
              <Button variant="subtle" onClick={onClose}>
                {INTEGRATION_MODAL_LABELS.CANCEL}
              </Button>
              <Button
                onClick={() => {
                  onConnect(integration.id);
                  onClose();
                }}
                disabled={!integration.isAvailable}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {INTEGRATION_MODAL_LABELS.CONNECT_DEMO}
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
      centered
      title={
        <div className="flex items-center gap-3">
          <IntegrationIcon name={integration.icon} size={32} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold">
            {isEditMode ? `${INTEGRATION_MODAL_LABELS.EDIT} ${integration.name}` : `${INTEGRATION_MODAL_LABELS.CONNECT} ${integration.name}`}
          </h2>
        </div>
      }
      size={[INTEGRATION_IDS.SLACK.toLowerCase(), INTEGRATION_IDS.GITHUB.toLowerCase()].includes(integration.id.toLowerCase()) ? 'lg' : 'md'}
    >
      {renderConnectionFlow()}
    </Modal>
  );
}

