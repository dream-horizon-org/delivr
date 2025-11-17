/**
 * Jira Project Management Connection Flow Component
 * Handles verification and connection of Jira integrations
 * 
 * Supports multiple authentication methods:
 * - BASIC: Username + API Token (recommended for Jira Cloud)
 * - OAUTH2: OAuth 2.0 flow
 * - PAT: Personal Access Token (for Jira Data Center/Server)
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  Button,
  Group,
  Alert,
  Loader,
  PasswordInput,
  Select,
  Stack,
  Text,
  Tabs
} from '@mantine/core';

interface JiraConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
}

type JiraAuthType = 'BASIC' | 'OAUTH2' | 'PAT';

export function JiraConnectionFlow({ onConnect, onCancel }: JiraConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [authType, setAuthType] = useState<JiraAuthType>('BASIC');
  const [formData, setFormData] = useState({
    displayName: '',
    hostUrl: '',
    username: '',
    apiToken: '',
    personalAccessToken: '',
    cloudId: '',
    defaultProjectKey: ''
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      const queryParams = new URLSearchParams({
        hostUrl: formData.hostUrl,
        authType: authType
      });

      if (authType === 'BASIC') {
        queryParams.append('username', formData.username);
        queryParams.append('apiToken', formData.apiToken);
      } else if (authType === 'PAT') {
        queryParams.append('personalAccessToken', formData.personalAccessToken);
      }

      const response = await fetch(
        `/api/v1/tenants/${tenantId}/integrations/project-management/jira/verify?${queryParams}`
      );

      const data = await response.json();

      if (data.verified) {
        setVerificationResult({
          success: true,
          message: data.message || 'Jira connection verified successfully!'
        });
      } else {
        setVerificationResult({
          success: false,
          message: data.message || 'Failed to verify Jira connection'
        });
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
      const payload: any = {
        displayName: formData.displayName || `Jira - ${formData.hostUrl}`,
        hostUrl: formData.hostUrl,
        authType: authType,
        cloudId: formData.cloudId || undefined,
        defaultProjectKey: formData.defaultProjectKey || undefined,
        providerConfig: {
          autoCreateIssues: false,
          webhookEnabled: false
        }
      };

      if (authType === 'BASIC') {
        payload.username = formData.username;
        payload.apiToken = formData.apiToken;
      } else if (authType === 'PAT') {
        payload.personalAccessToken = formData.personalAccessToken;
      }

      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/project-management/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    if (!formData.hostUrl) return false;
    if (authType === 'BASIC' && (!formData.username || !formData.apiToken)) return false;
    if (authType === 'PAT' && !formData.personalAccessToken) return false;
    return true;
  };

  return (
    <Stack gap="md">
      <Alert color="blue" title="Connect Jira" icon={<span>📋</span>}>
        Connect your Jira workspace to link releases with issues and track project progress.
      </Alert>

      <TextInput
        label="Display Name (Optional)"
        placeholder="My Jira Workspace"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <TextInput
        label="Jira Host URL"
        placeholder="https://yourcompany.atlassian.net"
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'Host URL is required'}
        description="Your Jira Cloud URL or self-hosted instance URL"
      />

      <Select
        label="Authentication Method"
        required
        value={authType}
        onChange={(value) => setAuthType(value as JiraAuthType)}
        data={[
          { value: 'BASIC', label: 'Basic Auth (Username + API Token) - Recommended' },
          { value: 'PAT', label: 'Personal Access Token (PAT)' },
          { value: 'OAUTH2', label: 'OAuth 2.0 (Coming Soon)', disabled: true }
        ]}
      />

      {authType === 'BASIC' && (
        <>
          <TextInput
            label="Email / Username"
            placeholder="your-email@company.com"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            error={!formData.username && 'Email/Username is required'}
            description="Your Jira account email or username"
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
        </>
      )}

      {authType === 'PAT' && (
        <PasswordInput
          label="Personal Access Token"
          placeholder="Your Jira PAT"
          required
          value={formData.personalAccessToken}
          onChange={(e) => setFormData({ ...formData, personalAccessToken: e.target.value })}
          error={!formData.personalAccessToken && 'Personal Access Token is required'}
          description="For Jira Data Center or Server instances"
        />
      )}

      <TextInput
        label="Cloud ID (Optional)"
        placeholder="cloudId-xxxxx"
        value={formData.cloudId}
        onChange={(e) => setFormData({ ...formData, cloudId: e.target.value })}
        description="Jira Cloud ID (auto-detected if not provided)"
      />

      <TextInput
        label="Default Project Key (Optional)"
        placeholder="PROJ"
        value={formData.defaultProjectKey}
        onChange={(e) => setFormData({ ...formData, defaultProjectKey: e.target.value })}
        description="Default Jira project key for creating issues"
      />

      {error && (
        <Alert color="red" title="Error" icon={<span>❌</span>}>
          {error}
        </Alert>
      )}

      {verificationResult && (
        <Alert
          color={verificationResult.success ? 'green' : 'red'}
          title={verificationResult.success ? 'Verification Successful' : 'Verification Failed'}
          icon={<span>{verificationResult.success ? '✅' : '❌'}</span>}
        >
          {verificationResult.message}
        </Alert>
      )}

      <Group justify="space-between" className="mt-4">
        <Button variant="subtle" onClick={onCancel} disabled={isVerifying || isConnecting}>
          Cancel
        </Button>
        
        <Group>
          <Button
            variant="light"
            onClick={handleVerify}
            disabled={!isFormValid() || isVerifying || isConnecting}
            leftSection={isVerifying ? <Loader size="xs" /> : null}
          >
            {isVerifying ? 'Verifying...' : 'Verify Connection'}
          </Button>
          
          <Button
            onClick={handleConnect}
            disabled={!isFormValid() || !verificationResult?.success || isConnecting}
            leftSection={isConnecting ? <Loader size="xs" /> : null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </Group>
      </Group>

      <Text size="xs" c="dimmed" className="mt-2">
        <strong>For Jira Cloud:</strong> Create an API token at{' '}
        <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Atlassian Account Settings
        </a>
      </Text>
    </Stack>
  );
}

