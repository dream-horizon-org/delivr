/**
 * Jenkins CI/CD Connection Flow Component
 * Handles verification and connection of Jenkins integrations
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
  Switch,
  Stack,
  Text
} from '@mantine/core';

interface JenkinsConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
}

export function JenkinsConnectionFlow({ onConnect, onCancel }: JenkinsConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: '',
    hostUrl: '',
    username: '',
    apiToken: '',
    useCrumb: true,
    crumbPath: '/crumbIssuer/api/json'
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
        username: formData.username,
        apiToken: formData.apiToken,
        useCrumb: formData.useCrumb.toString(),
        crumbPath: formData.crumbPath
      });

      const response = await fetch(
        `/api/v1/tenants/${tenantId}/integrations/ci-cd/jenkins/verify?${queryParams}`
      );

      const data = await response.json();

      if (data.verified) {
        setVerificationResult({
          success: true,
          message: data.message || 'Jenkins connection verified successfully!'
        });
      } else {
        setVerificationResult({
          success: false,
          message: data.message || 'Failed to verify Jenkins connection'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify Jenkins connection');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/ci-cd/jenkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName || `${formData.hostUrl}`,
          hostUrl: formData.hostUrl,
          username: formData.username,
          apiToken: formData.apiToken,
          providerConfig: {
            useCrumb: formData.useCrumb,
            crumbPath: formData.crumbPath
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        onConnect(data);
      } else {
        setError(data.error || 'Failed to connect Jenkins integration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Jenkins integration');
    } finally {
      setIsConnecting(false);
    }
  };

  const isFormValid = formData.hostUrl && formData.username && formData.apiToken;

  return (
    <Stack gap="md">
      <Alert color="blue" title="Connect Jenkins" icon={<span>🔨</span>}>
        Connect your Jenkins server to trigger builds and track deployment pipelines.
      </Alert>

      <TextInput
        label="Display Name (Optional)"
        placeholder="My Jenkins Server"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <TextInput
        label="Jenkins Host URL"
        placeholder="https://jenkins.example.com"
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'Host URL is required'}
      />

      <TextInput
        label="Username"
        placeholder="jenkins-user"
        required
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        error={!formData.username && 'Username is required'}
      />

      <PasswordInput
        label="API Token"
        placeholder="Your Jenkins API token"
        required
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        error={!formData.apiToken && 'API Token is required'}
      />

      <Stack gap="xs">
        <Switch
          label="Use CSRF Protection (Recommended)"
          checked={formData.useCrumb}
          onChange={(e) => setFormData({ ...formData, useCrumb: e.currentTarget.checked })}
        />
        
        {formData.useCrumb && (
          <TextInput
            label="Crumb Path"
            placeholder="/crumbIssuer/api/json"
            value={formData.crumbPath}
            onChange={(e) => setFormData({ ...formData, crumbPath: e.target.value })}
            size="xs"
          />
        )}
      </Stack>

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
            disabled={!isFormValid || isVerifying || isConnecting}
            leftSection={isVerifying ? <Loader size="xs" /> : null}
          >
            {isVerifying ? 'Verifying...' : 'Verify Connection'}
          </Button>
          
          <Button
            onClick={handleConnect}
            disabled={!isFormValid || !verificationResult?.success || isConnecting}
            leftSection={isConnecting ? <Loader size="xs" /> : null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </Group>
      </Group>

      <Text size="xs" c="dimmed" className="mt-2">
        <strong>How to get your API token:</strong> Go to Jenkins → User → Configure → API Token → Add new Token
      </Text>
    </Stack>
  );
}

