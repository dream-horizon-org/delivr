/**
 * Complete Communication Configuration Component
 * Main container for Slack notification configuration
 */

import { Stack, Text, Alert, Button } from '@mantine/core';
import { IconAlertCircle, IconPlugConnected } from '@tabler/icons-react';
import { useNavigate } from '@remix-run/react';
import type { CommunicationConfig as CommunicationConfigType } from '~/types/release-config';
import type { CommunicationConfigProps } from '~/types/release-config-props';
import { COMMUNICATION_LABELS, ICON_SIZES } from '~/constants/release-config-ui';
import { SlackChannelConfigEnhanced } from './SlackChannelConfigEnhanced';

export function CommunicationConfig({
  config,
  onChange,
  availableIntegrations,
  tenantId,
}: CommunicationConfigProps) {
  const navigate = useNavigate();

  console.log('CommunicationConfig', config);
  
  // Check if any communication integrations are connected
  const hasSlack = availableIntegrations.slack.length > 0;
  const hasAnyIntegration = hasSlack;
  
  // If no integrations are connected, show setup message
  if (!hasAnyIntegration) {
    return (
      <Stack gap="lg">
        <div>
          <Text fw={600} size="lg" className="mb-1">
            {COMMUNICATION_LABELS.SECTION_TITLE}
          </Text>
          <Text size="sm" c="dimmed">
            {COMMUNICATION_LABELS.SECTION_DESCRIPTION}
          </Text>
        </div>
        
        <Alert
          icon={<IconAlertCircle size={ICON_SIZES.SMALL} />}
          title={COMMUNICATION_LABELS.NO_INTEGRATIONS_TITLE}
          color="blue"
        >
          <Stack gap="sm">
            <Text size="sm">
              {COMMUNICATION_LABELS.NO_INTEGRATIONS_MESSAGE}
            </Text>
            <Button
              leftSection={<IconPlugConnected size={ICON_SIZES.SMALL} />}
              variant="light"
              size="sm"
              onClick={() => navigate(`/dashboard/${tenantId}/integrations`)}
            >
              {COMMUNICATION_LABELS.GO_TO_INTEGRATIONS}
            </Button>
          </Stack>
        </Alert>
      </Stack>
    );
    }
  
  return (
    <Stack gap="lg">
      <div>
        <Text fw={600} size="lg" className="mb-1">
          {COMMUNICATION_LABELS.SECTION_TITLE}
        </Text>
        <Text size="sm" c="dimmed">
          {COMMUNICATION_LABELS.SECTION_DESCRIPTION}
        </Text>
      </div>
      
      {/* Only show Slack if connected */}
      {hasSlack && (
      <SlackChannelConfigEnhanced
        config={config}
        onChange={onChange}
        availableIntegrations={availableIntegrations.slack}
          tenantId={tenantId}
      />
      )}
    </Stack>
  );
}

