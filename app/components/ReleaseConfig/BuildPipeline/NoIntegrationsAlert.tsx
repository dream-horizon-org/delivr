/**
 * No Integrations Alert Component
 * Displays error message when no CI/CD integrations are available
 */

import { Alert, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

export function NoIntegrationsAlert() {
  return (
    <Alert
      icon={<IconInfoCircle size={18} />}
      color="red"
      variant="light"
      title="No CI/CD Integrations Connected"
    >
      <Text size="sm" className="mb-2">
        To configure CI/CD workflows, you need to connect at least one provider:
      </Text>
      <ul className="list-disc list-inside text-sm mb-2">
        <li>Jenkins</li>
        <li>GitHub Actions</li>
      </ul>
      <Text size="sm">
        Go to <strong>Settings → Integrations</strong> to connect a provider.
      </Text>
    </Alert>
  );
}

