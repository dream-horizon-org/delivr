/**
 * Checkmate Test Management Connection Flow Component
 * Handles verification and connection of Checkmate integrations
 * 
 * Based on OG Delivr implementation:
 * - Host URL: http://chekmate.dream11.local/api/v1/
 * - Auth: Bearer token
 * - Used for test run tracking and squad-based regression status
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
  Text,
  Textarea
} from '@mantine/core';

interface CheckmateConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
}

export function CheckmateConnectionFlow({ onConnect, onCancel }: CheckmateConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    displayName: '',
    hostUrl: 'https://checkmate.example.com',
    apiKey: '',
    workspaceId: '',
    providerConfig: {
      defaultProjectId: '',
      syncEnabled: false,
      webhookEnabled: false
    }
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
        apiKey: formData.apiKey,
        workspaceId: formData.workspaceId
      });

      const response = await fetch(
        `/api/v1/tenants/${tenantId}/integrations/test-management/checkmate/verify?${queryParams}`
      );

      const data = await response.json();

      if (data.verified) {
        setVerificationResult({
          success: true,
          message: data.message || 'Checkmate connection verified successfully!'
        });
      } else {
        setVerificationResult({
          success: false,
          message: data.message || 'Failed to verify Checkmate connection'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify Checkmate connection');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/test-management/checkmate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName || `Checkmate - ${formData.workspaceId}`,
          hostUrl: formData.hostUrl,
          apiKey: formData.apiKey,
          workspaceId: formData.workspaceId,
          providerConfig: {
            defaultProjectId: formData.providerConfig.defaultProjectId || undefined,
            syncEnabled: formData.providerConfig.syncEnabled,
            webhookEnabled: formData.providerConfig.webhookEnabled
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        onConnect(data);
      } else {
        setError(data.error || 'Failed to connect Checkmate integration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect Checkmate integration');
    } finally {
      setIsConnecting(false);
    }
  };

  const isFormValid = formData.hostUrl && formData.apiKey && formData.workspaceId;

  return (
    <Stack gap="md">
      <Alert color="blue" title="Connect Checkmate" icon={<span>✅</span>}>
        Connect your Checkmate test management system to track test runs and regression status.
      </Alert>

      <TextInput
        label="Display Name (Optional)"
        placeholder="My Checkmate Instance"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <TextInput
        label="Checkmate Host URL"
        placeholder="https://checkmate.example.com"
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'Host URL is required'}
        description="Your Checkmate instance URL (e.g., https://checkmate.yourcompany.com)"
      />

      <PasswordInput
        label="API Key / Token"
        placeholder="Your Checkmate API key"
        required
        value={formData.apiKey}
        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
        error={!formData.apiKey && 'API Key is required'}
        description="Generate this from your Checkmate account settings"
      />

      <TextInput
        label="Workspace ID"
        placeholder="workspace-123"
        required
        value={formData.workspaceId}
        onChange={(e) => setFormData({ ...formData, workspaceId: e.target.value })}
        error={!formData.workspaceId && 'Workspace ID is required'}
        description="Your Checkmate workspace identifier"
      />

      <TextInput
        label="Default Project ID (Optional)"
        placeholder="project-456"
        value={formData.providerConfig.defaultProjectId}
        onChange={(e) => setFormData({ 
          ...formData, 
          providerConfig: { ...formData.providerConfig, defaultProjectId: e.target.value }
        })}
        description="Default project to use for test runs"
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
        <strong>Note:</strong> Checkmate integration enables test run tracking, squad-based regression status, 
        and automated testing workflows.
      </Text>
    </Stack>
  );
}

