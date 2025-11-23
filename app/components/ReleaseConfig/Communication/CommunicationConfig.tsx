/**
 * Complete Communication Configuration Component
 * Main container for Slack notification configuration
 */

import { Stack, Text, Alert, Button } from '@mantine/core';
import { IconAlertCircle, IconPlugConnected } from '@tabler/icons-react';
import { useNavigate, useParams } from '@remix-run/react';
import type { CommunicationConfig as CommunicationConfigType } from '~/types/release-config';
import { SlackChannelConfigEnhanced } from './SlackChannelConfigEnhanced';

interface CommunicationConfigProps {
  config: CommunicationConfigType;
  onChange: (config: CommunicationConfigType) => void;
  availableIntegrations: {
    slack: Array<{ id: string; name: string }>;
  };
  tenantId: string;
}

export function CommunicationConfig({
  config,
  onChange,
  availableIntegrations,
  tenantId,
}: CommunicationConfigProps) {
  const navigate = useNavigate();
  const params = useParams();
  
  // Check if any communication integrations are connected
  const hasSlack = availableIntegrations.slack.length > 0;
  const hasAnyIntegration = hasSlack;
  
  // If no integrations are connected, show setup message
  if (!hasAnyIntegration) {
    return (
      <Stack gap="lg">
        <div>
          <Text fw={600} size="lg" className="mb-1">
            Communication Channels
          </Text>
          <Text size="sm" c="dimmed">
            Configure Slack notifications for your team
          </Text>
        </div>
        
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="No Communication Integrations Configured"
          color="blue"
        >
          <Stack gap="sm">
            <Text size="sm">
              You need to connect a communication integration (like Slack) before you can configure notifications.
            </Text>
            <Button
              leftSection={<IconPlugConnected size={16} />}
              variant="light"
              size="sm"
              onClick={() => navigate(`/dashboard/${tenantId}/integrations`)}
            >
              Go to Integrations
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
          Communication Channels
        </Text>
        <Text size="sm" c="dimmed">
          Configure Slack notifications for your team
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

