/**
 * GitHub Actions CI/CD Connection Flow Component
 * Handles verification and connection of GitHub Actions integrations
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
  Stack,
  Text
} from '@mantine/core';

interface GitHubActionsConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

export function GitHubActionsConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: GitHubActionsConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: existingData?.displayName || '',
    hostUrl: existingData?.hostUrl || 'https://api.github.com',
    apiToken: '', // Never pre-populate sensitive data
    useScmToken: !existingData // Default to true for new connections
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
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/integrations/ci-cd/github-actions/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiToken: formData.useScmToken ? undefined : formData.apiToken
          })
        }
      );

      const data = await response.json();

      if (data.verified) {
        setVerificationResult({
          success: true,
          message: data.message || 'GitHub Actions connection verified successfully!'
        });
      } else {
        setVerificationResult({
          success: false,
          message: data.message || 'Failed to verify GitHub Actions connection'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify GitHub Actions connection');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const method = isEditMode ? 'PATCH' : 'POST';
      const payload: any = {
        displayName: formData.displayName || 'GitHub Actions',
        hostUrl: formData.hostUrl
      };

      // Only include apiToken if explicitly provided (not using SCM token)
      if (!formData.useScmToken && formData.apiToken) {
        payload.apiToken = formData.apiToken;
      }

      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/ci-cd/github-actions`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        onConnect(data);
      } else {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'connect'} GitHub Actions integration`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'connect'} GitHub Actions integration`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Form is valid if we have a hostUrl and either:
  // 1. We're using SCM token, OR
  // 2. We have an API token provided, OR
  // 3. We're in edit mode (token is optional for updates)
  const isFormValid = formData.hostUrl && (formData.useScmToken || formData.apiToken || isEditMode);

  return (
    <Stack gap="md">
      <Alert color="blue" title={isEditMode ? "Edit GitHub Actions Connection" : "Connect GitHub Actions"} icon={<span>⚡</span>}>
        {isEditMode 
          ? 'Update your GitHub Actions integration settings.'
          : 'Connect GitHub Actions to trigger workflows and automate your CI/CD pipeline.'}
      </Alert>

      <Alert color="cyan" variant="light" icon={<span>ℹ️</span>}>
        <Text size="sm">
          <strong>Token Options:</strong>
        </Text>
        <Text size="xs" c="dimmed">
          • <strong>Use GitHub SCM Token:</strong> Reuse your existing GitHub SCM integration token (easiest option)
        </Text>
        <Text size="xs" c="dimmed">
          • <strong>Provide New Token:</strong> Use a separate Personal Access Token for GitHub Actions
        </Text>
      </Alert>

      <TextInput
        label="Display Name (Optional)"
        placeholder="GitHub Actions"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <TextInput
        label="GitHub API URL"
        placeholder="https://api.github.com"
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'API URL is required'}
        description="For GitHub Enterprise, use your custom API endpoint"
      />

      {!isEditMode && (
        <Group gap="xs">
          <Button
            variant={formData.useScmToken ? 'filled' : 'light'}
            size="xs"
            onClick={() => setFormData({ ...formData, useScmToken: true, apiToken: '' })}
          >
            Use SCM Token
          </Button>
          <Button
            variant={!formData.useScmToken ? 'filled' : 'light'}
            size="xs"
            onClick={() => setFormData({ ...formData, useScmToken: false })}
          >
            Provide New Token
          </Button>
        </Group>
      )}

      {(!formData.useScmToken || isEditMode) && (
        <PasswordInput
          label={isEditMode ? "Personal Access Token (leave blank to keep existing)" : "Personal Access Token"}
          placeholder={isEditMode ? "Leave blank to keep existing token" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
          required={!isEditMode && !formData.useScmToken}
          value={formData.apiToken}
          onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
          error={!isEditMode && !formData.useScmToken && !formData.apiToken && 'Token is required when not using SCM token'}
          description={isEditMode ? "Only provide a new token if you want to update it" : "Required if not using SCM token"}
        />
      )}

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
          {!isEditMode && (
            <Button
              variant="light"
              onClick={handleVerify}
              disabled={!isFormValid || isVerifying || isConnecting}
              leftSection={isVerifying ? <Loader size="xs" /> : null}
            >
              {isVerifying ? 'Verifying...' : 'Verify Connection'}
            </Button>
          )}
          
          <Button
            onClick={handleConnect}
            disabled={!isFormValid || (isEditMode ? false : !verificationResult?.success) || isConnecting}
            leftSection={isConnecting ? <Loader size="xs" /> : null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? (isEditMode ? 'Updating...' : 'Connecting...') : (isEditMode ? 'Update' : 'Connect')}
          </Button>
        </Group>
      </Group>

      <Text size="xs" c="dimmed" className="mt-2">
        <strong>How to get your Personal Access Token:</strong> Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic)
        <br />
        <strong>Required scopes:</strong> <code>repo</code>, <code>workflow</code>, <code>read:org</code>
      </Text>
    </Stack>
  );
}

