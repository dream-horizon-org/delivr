/**
 * GitHub Actions CI/CD Connection Flow Component
 * Simplified connection flow aligned with Jira integration pattern
 * 
 * Backend API: /tenants/:tenantId/integrations/ci-cd/github-actions
 * Falls back to SCM GitHub token if no token provided
 * Supports both create and edit modes
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  Button,
  Group,
  Alert,
  PasswordInput,
  Stack,
  Text
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';

interface GitHubActionsConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

export function GitHubActionsConnectionFlow({ 
  onConnect, 
  onCancel, 
  isEditMode = false, 
  existingData 
}: GitHubActionsConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: existingData?.displayName || '',
    hostUrl: existingData?.hostUrl || 'https://api.github.com',
    apiToken: '', // Never pre-populate token for security
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
        `/api/v1/tenants/${tenantId}/integrations/github-actions/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiToken: formData.apiToken || undefined, // Let backend fallback to SCM token
          })
        }
      );

      const data = await response.json();

      if (data.verified) {
        setIsVerified(true);
      } else {
        setError(data.message || 'Failed to verify GitHub Actions connection');
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
      const payload: any = {
        displayName: formData.displayName || 'GitHub Actions',
        hostUrl: formData.hostUrl,
      };

      // Only include apiToken if provided
      if (formData.apiToken) {
        payload.apiToken = formData.apiToken;
      }

      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/github-actions`, {
        method: isEditMode ? 'PATCH' : 'POST',
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

  const isFormValid = () => {
    return formData.hostUrl; // Token is optional (falls back to SCM)
  };

  return (
    <Stack gap="lg">
      {/* Info alert about token fallback (only for new connections) */}
      {!isEditMode && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>Tip:</strong> If you have GitHub SCM integration connected, you can leave the token field empty and we'll use your existing GitHub token.
          </Text>
        </Alert>
      )}

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

      <PasswordInput
        label={isEditMode ? "Personal Access Token (leave blank to keep existing)" : "Personal Access Token (Optional)"}
        placeholder={isEditMode ? "Leave blank to keep existing token" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        description={isEditMode ? "Only provide if you want to update the token" : "Leave empty to use your connected GitHub SCM token"}
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
        {!isEditMode && !isVerified ? (
          <Button
            onClick={handleVerify}
            loading={isVerifying}
            disabled={!isFormValid()}
          >
            Verify Connection
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            loading={isConnecting}
            color={isEditMode ? 'blue' : 'green'}
            disabled={!isEditMode && !isVerified}
          >
            {isEditMode ? 'Update' : 'Connect'}
          </Button>
        )}
      </Group>

      <Text size="xs" c="dimmed">
        <strong>Required token scopes:</strong> <code>repo</code>, <code>workflow</code>, <code>read:org</code>
        <br />
        <a
          href="https://github.com/settings/tokens/new"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Generate a new Personal Access Token
        </a>
      </Text>
    </Stack>
  );
}
