/**
 * Checkmate Test Management Connection Flow Component
 * Handles verification and connection of Checkmate integrations
 * 
 * Backend API structure:
 * - Config: { baseUrl: string, authToken: string }
 * - Provider: CHECKMATE
 * - Endpoints: /projects/:projectId/integrations/test-management
 */

import { useState, useEffect } from 'react';
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

interface CheckmateConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

export function CheckmateConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: CheckmateConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  const [formData, setFormData] = useState({
    name: existingData?.name || '',
    baseUrl: existingData?.config?.baseUrl || '',
    authToken: '', // Never pre-populate sensitive data
    orgId: existingData?.config?.orgId || '',
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState<string | null>(existingData?.id || null);

  const handleVerify = async () => {
    // For edit mode, verify the existing integration
    if (isEditMode && integrationId) {
      setIsVerifying(true);
      setError(null);
      setVerificationResult(null);

      try {
        // Use projectId (which equals tenantId) to match backend's project-level routes
        const projectId = tenantId;
        const response = await fetch(
          `/api/v1/projects/${projectId}/integrations/test-management/${integrationId}/verify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        const data = await response.json();

        if (data.success) {
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
    } else {
      setError('Cannot verify without saving first');
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const method = isEditMode && integrationId ? 'PUT' : 'POST';
      // Use projectId (which equals tenantId) to match backend's project-level routes
      const projectId = tenantId;
      const url = isEditMode && integrationId 
        ? `/api/v1/projects/${projectId}/integrations/test-management/${integrationId}`
        : `/api/v1/projects/${projectId}/integrations/test-management`;

      const payload: any = {
        name: formData.name || `Checkmate - ${formData.baseUrl}`,
        providerType: 'CHECKMATE', // Required by API
        config: {
          baseUrl: formData.baseUrl,
          authToken: formData.authToken,
          orgId: parseInt(formData.orgId, 10) || undefined // Convert to number
        }
      };

      // Only include authToken if provided (required for create, optional for update)
      if (!formData.authToken && isEditMode) {
        delete payload.config.authToken;
      } else if (!formData.authToken && !isEditMode) {
        setError('Auth Token is required');
        setIsConnecting(false);
        return;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        onConnect(data);
      } else {
        setError(data.error || `Failed to ${isEditMode ? 'update' : 'connect'} Checkmate integration`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'connect'} Checkmate integration`);
    } finally {
      setIsConnecting(false);
    }
  };

  // For edit mode, authToken is optional. For create mode, it's required
  const isFormValid = formData.name && formData.baseUrl && formData.orgId && (isEditMode || formData.authToken);

  return (
    <Stack gap="md">
      <Alert color="blue" title={isEditMode ? "Edit Checkmate Connection" : "Connect Checkmate"} icon={<span>✅</span>}>
        {isEditMode
          ? 'Update your Checkmate test management connection details.'
          : 'Connect your Checkmate test management system to track test runs and regression status.'}
      </Alert>

      <TextInput
        label="Display Name"
        placeholder="My Checkmate Instance"
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={!formData.name && 'Name is required'}
      />

      <TextInput
        label="Base URL"
        placeholder="https://checkmate.example.com"
        required
        value={formData.baseUrl}
        onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
        error={!formData.baseUrl && 'Base URL is required'}
        description="Your Checkmate base URL (e.g., https://checkmate.yourcompany.com)"
      />

      <TextInput
        label="Organization ID"
        placeholder="123"
        required
        type="number"
        value={formData.orgId}
        onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
        error={!formData.orgId && 'Organization ID is required'}
        description="Your Checkmate organization/workspace ID (numeric)"
      />

      <PasswordInput
        label={isEditMode ? "Auth Token (leave blank to keep existing)" : "Auth Token"}
        placeholder={isEditMode ? "Leave blank to keep existing token" : "Your Checkmate auth token"}
        required={!isEditMode}
        value={formData.authToken}
        onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
        error={!isEditMode && !formData.authToken && 'Auth Token is required'}
        description={isEditMode ? "Only provide a new token if you want to update it" : "Generate this from your Checkmate account settings"}
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
          {isEditMode && (
            <Button
              variant="light"
              onClick={handleVerify}
              disabled={!integrationId || isVerifying || isConnecting}
              leftSection={isVerifying ? <Loader size="xs" /> : null}
            >
              {isVerifying ? 'Verifying...' : 'Verify Connection'}
            </Button>
          )}
          
          <Button
            onClick={handleConnect}
            disabled={!isFormValid || isConnecting}
            leftSection={isConnecting ? <Loader size="xs" /> : null}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? (isEditMode ? 'Updating...' : 'Connecting...') : (isEditMode ? 'Update' : 'Connect')}
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

