/**
 * NoIntegrationAlert Component
 * Unified component for displaying "no integration found" messages
 * with consistent design and automatic redirection
 */

import { Alert, Stack, Text, Button } from '@mantine/core';
import { IconPlug, IconExternalLink } from '@tabler/icons-react';
import { Link, useParams } from '@remix-run/react';
import { IntegrationCategory } from '~/types/integrations';

export interface NoIntegrationAlertProps {
  /** Integration category */
  category: IntegrationCategory;
  
  /** Custom title (optional, defaults to category-specific message) */
  title?: string;
  
  /** Custom message (optional, defaults to category-specific message) */
  message?: string;
  
  /** Custom button text (optional, defaults to "Go to Integrations") */
  buttonText?: string;
  
  /** Tenant/Org ID (optional, will use params.org if not provided) */
  appId?: string;
  
  /** Alert color variant */
  color?: 'orange' | 'red' | 'yellow' | 'blue';
  
  /** Show external link icon on button */
  showExternalIcon?: boolean;
}

// Default messages based on category
const DEFAULT_MESSAGES: Record<IntegrationCategory, { title: string; message: string }> = {
  [IntegrationCategory.SOURCE_CONTROL]: {
    title: 'SCM Integration Required',
    message: 'Connect a Source Control Management (SCM) integration to configure release settings.',
  },
  [IntegrationCategory.APP_DISTRIBUTION]: {
    title: 'Integration Required',
    message: 'Connect a store integration (App Store or Play Store) to enable this platform.',
  },
  [IntegrationCategory.CI_CD]: {
    title: 'CI/CD Integration Required',
    message: 'Connect at least one CI/CD provider (Jenkins or GitHub Actions) to use this option.',
  },
  [IntegrationCategory.TEST_MANAGEMENT]: {
    title: 'Checkmate Integration Required',
    message: 'Connect a Checkmate integration to configure test management.',
  },
  [IntegrationCategory.COMMUNICATION]: {
    title: 'No Communication Integrations Configured',
    message: 'You need to connect a communication integration (like Slack) before you can configure notifications.',
  },
  [IntegrationCategory.PROJECT_MANAGEMENT]: {
    title: 'No JIRA Integrations Available',
    message: 'Connect a JIRA integration to use project management features.',
  },
};

export function NoIntegrationAlert({
  category,
  title,
  message,
  buttonText = 'Go to Integrations',
  appId,
  color = 'yellow',
  showExternalIcon = true,
}: NoIntegrationAlertProps) {
  const params = useParams<{ org: string }>();
  const orgId = appId || params.org || '';
  
  const defaultMessages = DEFAULT_MESSAGES[category];
  const displayTitle = title || defaultMessages.title;
  const displayMessage = message || defaultMessages.message;
  const integrationUrl = `/dashboard/${orgId}/integrations?tab=${category}`;
  
  return (
    <Alert
      icon={<IconPlug size={16} />}
      color={color}
      variant="light"
      title={displayTitle}
    >
      <Stack gap="xs">
        <Text size="sm">
          {displayMessage}
        </Text>
        <Button
          component={Link}
          to={integrationUrl}
          variant="light"
          size="sm"
          leftSection={<IconPlug size={14} />}
          rightSection={showExternalIcon ? <IconExternalLink size={14} /> : undefined}
        >
          {buttonText}
        </Button>
      </Stack>
    </Alert>
  );
}

