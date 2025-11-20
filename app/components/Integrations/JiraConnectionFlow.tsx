/**
 * Jira Project Management Connection Flow Component
 * Handles verification and connection of Jira integrations
 * 
 * Backend API: /projects/:projectId/integrations/project-management
 * Config: { baseUrl, email, apiToken, jiraType }
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  Button,
  Group,
  Alert,
  PasswordInput,
  Select,
  Stack,
  Text
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { JIRA_TYPES } from '~/types/jira-integration';
import type { JiraType } from '~/types/jira-integration';

interface JiraConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
}

export function JiraConnectionFlow({ onConnect, onCancel }: JiraConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: '',
    hostUrl: '',
    email: '',
    apiToken: '',
    jiraType: 'CLOUD' as JiraType,
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setIsVerified(false);

    try {
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/integrations/jira/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostUrl: formData.hostUrl,
            email: formData.email,
            apiToken: formData.apiToken,
            jiraType: formData.jiraType,
          })
        }
      );

      const data = await response.json();

      if (data.verified || data.success) {
        setIsVerified(true);
      } else {
        setError(data.message || data.error || 'Failed to verify Jira connection');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify Jira connection');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.displayName || `Jira - ${formData.hostUrl}`,
          hostUrl: formData.hostUrl,
          email: formData.email,
          apiToken: formData.apiToken,
          jiraType: formData.jiraType,
        })
      });

      const data = await response.json();

      if (data.success) {
        onConnect(data);
      } else {
        setError(data.error || 'Failed to connect Jira integration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Jira integration');
    } finally {
      setIsConnecting(false);
    }
  };

  const isFormValid = () => {
    return formData.hostUrl && formData.email && formData.apiToken;
  };

  return (
    <Stack gap="lg">
      {/* Header removed as it's in the modal title */}
      
      <TextInput
        label="Display Name (Optional)"
        placeholder="My Jira Workspace"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <Select
        label="Jira Type"
        required
        value={formData.jiraType}
        onChange={(value) => setFormData({ ...formData, jiraType: value as JiraType })}
        data={JIRA_TYPES.map(type => ({
          value: type.value,
          label: type.label,
        }))}
        description="Select your Jira deployment type"
      />

      <TextInput
        label="Jira Base URL"
        placeholder={formData.jiraType === 'CLOUD' ? 'https://yourcompany.atlassian.net' : 'https://jira.yourcompany.com'}
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'Base URL is required'}
        description={formData.jiraType === 'CLOUD' ? 'Your Atlassian Cloud URL' : 'Your self-hosted Jira URL'}
      />

      <TextInput
        label="Email Address"
        placeholder="your-email@company.com"
        type="email"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={!formData.email && 'Email is required'}
        description="Your Jira account email address"
      />

      <PasswordInput
        label="API Token"
        placeholder="Your Jira API token"
        required
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        error={!formData.apiToken && 'API Token is required'}
        description="Generate from Jira → Account Settings → Security → API Tokens"
      />

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      {isVerified && (
        <Alert icon={<IconCheck size={16} />} color="green">
          Credentials verified successfully! Click "Connect" to save.
        </Alert>
      )}

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onCancel} disabled={isVerifying || isConnecting}>
          Cancel
        </Button>
        {!isVerified ? (
          <Button
            onClick={handleVerify}
            loading={isVerifying}
            disabled={!isFormValid()}
          >
            Verify Credentials
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            loading={isConnecting}
            color="green"
          >
            Connect
          </Button>
        )}
      </Group>

      <Text size="xs" c="dimmed">
        <strong>For Jira Cloud:</strong> Create an API token at{' '}
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Atlassian Account Settings
        </a>
      </Text>
    </Stack>
  );
}
