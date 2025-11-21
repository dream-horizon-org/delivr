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
  isEditMode?: boolean;
  existingData?: {
    id: string; // integrationId - required for updates
    displayName?: string;
    hostUrl?: string;
    username?: string;
    verificationStatus?: string;
    providerConfig?: {
      useCrumb?: boolean;
      crumbPath?: string;
    };
  };
}

export function JenkinsConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: JenkinsConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: existingData?.displayName || '',
    hostUrl: existingData?.hostUrl || '',
    username: existingData?.username || '',
    apiToken: '', // Never pre-populate sensitive data
    useCrumb: existingData?.providerConfig?.useCrumb ?? true,
    crumbPath: existingData?.providerConfig?.crumbPath || '/crumbIssuer/api/json'
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
      // Send data in request body with POST method (backend expects req.body)
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/integrations/ci-cd/jenkins/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: formData.displayName || undefined,
            hostUrl: formData.hostUrl,
            username: formData.username,
            apiToken: formData.apiToken,
            providerConfig: {
              useCrumb: formData.useCrumb,
              crumbPath: formData.crumbPath
            }
          })
        }
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
      const method = isEditMode ? 'PATCH' : 'POST';
      const payload: any = {
        displayName: formData.displayName || `${formData.hostUrl}`,
        hostUrl: formData.hostUrl,
        username: formData.username,
        providerConfig: {
          useCrumb: formData.useCrumb,
          crumbPath: formData.crumbPath
        }
      };

      // Only include apiToken if it's provided (required for create, optional for update)
      if (formData.apiToken) {
        payload.apiToken = formData.apiToken;
      } else if (!isEditMode) {
        setError('API Token is required');
        setIsConnecting(false);
        return;
      }

      // For updates, include integrationId so service layer knows to use new backend path
      if (isEditMode && existingData?.id) {
        payload.integrationId = existingData.id;
      }

      const response = await fetch(
        `/api/v1/tenants/${tenantId}/integrations/ci-cd/jenkins`,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (data.success) {
        onConnect(data);
      } else {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'connect'} Jenkins integration`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'connect'} Jenkins integration`);
    } finally {
      setIsConnecting(false);
    }
  };

  // For edit mode, apiToken is optional. For create mode, it's required
  const isFormValid = formData.hostUrl && formData.username && (isEditMode || formData.apiToken);

  return (
    <Stack gap="md">
      <Alert color="blue" title={isEditMode ? "Edit Jenkins Connection" : "Connect Jenkins"} icon={<span>🔨</span>}>
        {isEditMode 
          ? 'Update your Jenkins server connection details.'
          : 'Connect your Jenkins server to trigger builds and track deployment pipelines.'}
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
        label={isEditMode ? "API Token (leave blank to keep existing)" : "API Token"}
        placeholder={isEditMode ? "Leave blank to keep existing token" : "Your Jenkins API token"}
        required={!isEditMode}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        error={!isEditMode && !formData.apiToken && 'API Token is required'}
        description={isEditMode ? "Only provide a new token if you want to update it" : undefined}
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
        <strong>How to get your API token:</strong> Go to Jenkins → User → Configure → API Token → Add new Token
      </Text>
    </Stack>
  );
}

