import { 
  Modal, 
  Button, 
  Group, 
  Alert, 
  Box, 
  Text, 
  Stack, 
  ThemeIcon,
  useMantineTheme,
  List,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconPlug, IconSparkles } from '@tabler/icons-react';
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
import { PLATFORMS, TARGET_PLATFORMS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { INTEGRATION_IDS, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';

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
  const theme = useMantineTheme();
  const params = useParams();
  const tenantId = params.org!;

  if (!integration) return null;

  // Determine which connection flow to render
  const renderConnectionFlow = () => {
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
            isEditMode={isEditMode}
            existingData={existingData}
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
            isEditMode={isEditMode}
            existingData={existingData}
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
      case INTEGRATION_IDS.PLAY_STORE:
        return (
          <AppDistributionConnectionFlow
            storeType={TARGET_PLATFORMS.PLAY_STORE}
            tenantId={tenantId}
            allowedPlatforms={[PLATFORMS.ANDROID]}
            onConnect={(data) => {
              onConnect(INTEGRATION_IDS.PLAY_STORE, data);
              onClose();
            }}
            onCancel={onClose}
            isEditMode={isEditMode}
            existingData={existingData}
          />
        );
      
      case TARGET_PLATFORMS.APP_STORE:
      case 'app_store':
      case 'appstore':
      case INTEGRATION_IDS.APP_STORE:
        return (
          <AppDistributionConnectionFlow
            storeType={TARGET_PLATFORMS.APP_STORE}
            tenantId={tenantId}
            allowedPlatforms={[PLATFORMS.IOS]}
            onConnect={(data) => {
              onConnect(INTEGRATION_IDS.APP_STORE, data);
              onClose();
            }}
            onCancel={onClose}
            isEditMode={isEditMode}
            existingData={existingData}
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
              onConnect(INTEGRATION_IDS.APP_STORE, data);
              onClose();
            }}
            onCancel={onClose}
            isEditMode={isEditMode}
            existingData={existingData}
          />
        );
      
      default:
        // Coming soon / demo mode
        return (
          <Stack gap="lg">
            <Alert 
              color="yellow" 
              variant="light"
              icon={<IconAlertCircle size={18} />}
              title={INTEGRATION_MODAL_LABELS.DEMO_MODE_TITLE}
              radius="md"
            >
              <Text size="sm">
                {INTEGRATION_MODAL_LABELS.DEMO_MODE_MESSAGE(integration.name)}
              </Text>
            </Alert>

            <Box
              p="md"
              style={{
                backgroundColor: theme.colors.slate[0],
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.colors.slate[2]}`,
              }}
            >
              <Group gap="sm" mb="sm">
                <ThemeIcon size={24} radius="sm" variant="light" color="brand">
                  <IconSparkles size={14} />
                </ThemeIcon>
                <Text size="sm" fw={600} c={theme.colors.slate[8]}>
                  {INTEGRATION_MODAL_LABELS.PLANNED_FEATURES_TITLE}
                </Text>
              </Group>
              <List
                size="sm"
                spacing="xs"
                icon={
                  <ThemeIcon size={16} radius="xl" variant="light" color="brand">
                    <IconCheck size={10} />
                  </ThemeIcon>
                }
              >
                {INTEGRATION_MODAL_LABELS.PLANNED_FEATURES.map((feature, idx) => (
                  <List.Item key={idx}>
                    <Text size="sm" c={theme.colors.slate[6]}>
                      {feature}
                    </Text>
                  </List.Item>
                ))}
              </List>
            </Box>

            <Group justify="flex-end" mt="md">
              <Button 
                variant="default" 
                size="sm"
                onClick={onClose}
              >
                {INTEGRATION_MODAL_LABELS.CANCEL}
              </Button>
              <Button
                color="brand"
                size="sm"
                leftSection={<IconPlug size={14} />}
                onClick={() => {
                  onConnect(integration.id);
                  onClose();
                }}
                disabled={!integration.isAvailable}
              >
                {INTEGRATION_MODAL_LABELS.CONNECT_DEMO}
              </Button>
            </Group>
          </Stack>
        );
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      radius="md"
      size="lg" // Consistent size for all dialogs
      title={
        <Group gap="md">
          <ThemeIcon size={44} radius="md" variant="light" color="brand">
            <IntegrationIcon name={integration.icon} size={24} />
          </ThemeIcon>
          <Box>
            <Text size="lg" fw={600} c={theme.colors.slate[9]}>
              {isEditMode 
                ? `${INTEGRATION_MODAL_LABELS.EDIT} ${integration.name}` 
                : `${INTEGRATION_MODAL_LABELS.CONNECT} ${integration.name}`}
            </Text>
            <Text size="xs" c={theme.colors.slate[5]}>
              {isEditMode 
                ? 'Update your integration settings'
                : 'Configure and connect this integration'}
            </Text>
          </Box>
        </Group>
      }
    >
      {renderConnectionFlow()}
    </Modal>
  );
}
