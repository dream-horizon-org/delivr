/**
 * Checkmate Test Management Connection Flow Component
 * Handles verification and connection of Checkmate integrations
 * 
 * Backend API structure:
 * - Config: { baseUrl: string, authToken: string }
 * - Provider: CHECKMATE
 * - Endpoints: /tenants/:tenantId/integrations/test-management
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  PasswordInput,
  Stack,
  Text
} from '@mantine/core';
import { apiPost, apiPut, getApiErrorMessage } from '~/utils/api-client';
import { TEST_PROVIDERS } from '~/types/release-config-constants';
import { CHECKMATE_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';

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
        // Use tenantId to match backend's tenant-level routes
        const result = await apiPost<{ message: string }>(
          `/api/v1/tenants/${tenantId}/integrations/test-management/${integrationId}/verify`
        );

        if (result.success) {
          setVerificationResult({
            success: true,
            message: result.data?.message || CHECKMATE_LABELS.VERIFY_SUCCESS_MESSAGE
          });
        } else {
          setVerificationResult({
            success: false,
            message: ALERT_MESSAGES.VERIFICATION_FAILED
          });
        }
      } catch (err) {
        setError(getApiErrorMessage(err, ALERT_MESSAGES.VERIFICATION_FAILED));
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
      // Use tenantId to match backend's tenant-level routes
      const endpoint = isEditMode && integrationId 
        ? `/api/v1/tenants/${tenantId}/integrations/test-management/${integrationId}`
        : `/api/v1/tenants/${tenantId}/integrations/test-management`;

      const payload: any = {
        name: formData.name || `${TEST_PROVIDERS.CHECKMATE} - ${formData.baseUrl}`,
        providerType: TEST_PROVIDERS.CHECKMATE.toLowerCase(), // Required by API (lowercase)
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

      const result = isEditMode && integrationId
        ? await apiPut(endpoint, payload)
        : await apiPost(endpoint, payload);

      if (result.success) {
        onConnect(result);
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'connect'} ${TEST_PROVIDERS.CHECKMATE} integration`);
      }
    } catch (err) {
      const action = isEditMode ? 'update' : 'connect';
      setError(getApiErrorMessage(err, `Failed to ${action} ${TEST_PROVIDERS.CHECKMATE} integration`));
    } finally {
      setIsConnecting(false);
    }
  };

  // For edit mode, authToken is optional. For create mode, it's required
  const isFormValid = formData.name && formData.baseUrl && formData.orgId && (isEditMode || formData.authToken);

  return (
    <Stack gap="md">
      <ConnectionAlert 
        color="blue" 
        title={isEditMode ? `${INTEGRATION_MODAL_LABELS.EDIT} ${CHECKMATE_LABELS.CHECKMATE_CONNECTION}` : CHECKMATE_LABELS.CHECKMATE_CONNECTION} 
        icon={<span>✅</span>}
      >
        {isEditMode
          ? CHECKMATE_LABELS.EDIT_DESCRIPTION
          : CHECKMATE_LABELS.CONNECT_DESCRIPTION}
      </ConnectionAlert>

      <TextInput
        label={CHECKMATE_LABELS.DISPLAY_NAME_LABEL}
        placeholder={CHECKMATE_LABELS.DISPLAY_NAME_PLACEHOLDER}
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={!formData.name && 'Name is required'}
      />

      <TextInput
        label={CHECKMATE_LABELS.BASE_URL_LABEL}
        placeholder={CHECKMATE_LABELS.BASE_URL_PLACEHOLDER}
        required
        value={formData.baseUrl}
        onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
        error={!formData.baseUrl && 'Base URL is required'}
        description={CHECKMATE_LABELS.BASE_URL_DESCRIPTION}
      />

      <TextInput
        label={CHECKMATE_LABELS.ORG_ID_LABEL}
        placeholder={CHECKMATE_LABELS.ORG_ID_PLACEHOLDER}
        required
        type="number"
        value={formData.orgId}
        onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
        error={!formData.orgId && 'Organization ID is required'}
        description={CHECKMATE_LABELS.ORG_ID_DESCRIPTION}
      />

      <PasswordInput
        label={isEditMode ? `${CHECKMATE_LABELS.AUTH_TOKEN_LABEL} (leave blank to keep existing)` : CHECKMATE_LABELS.AUTH_TOKEN_LABEL}
        placeholder={isEditMode ? "Leave blank to keep existing token" : CHECKMATE_LABELS.AUTH_TOKEN_PLACEHOLDER}
        required={!isEditMode}
        value={formData.authToken}
        onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
        error={!isEditMode && !formData.authToken && 'Auth Token is required'}
        description={isEditMode ? "Only provide a new token if you want to update it" : CHECKMATE_LABELS.AUTH_TOKEN_DESCRIPTION}
      />

      {error && (
        <ConnectionAlert color="red" title="Error">
          {error}
        </ConnectionAlert>
      )}

      {verificationResult && (
        <ConnectionAlert
          color={verificationResult.success ? 'green' : 'red'}
          title={verificationResult.success ? ALERT_MESSAGES.VERIFICATION_SUCCESS : ALERT_MESSAGES.VERIFICATION_FAILED}
        >
          {verificationResult.message}
        </ConnectionAlert>
      )}

      {isEditMode ? (
        <>
          <ActionButtons
            onCancel={onCancel}
            onSecondary={handleVerify}
            onPrimary={handleConnect}
            primaryLabel={INTEGRATION_MODAL_LABELS.UPDATE}
            secondaryLabel={CHECKMATE_LABELS.VERIFY_CONNECTION}
            cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
            isPrimaryLoading={isConnecting}
            isSecondaryLoading={isVerifying}
            isPrimaryDisabled={!isFormValid || isConnecting}
            isSecondaryDisabled={!integrationId || isVerifying || isConnecting}
            isCancelDisabled={isVerifying || isConnecting}
          />
        </>
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleConnect}
          primaryLabel={CHECKMATE_LABELS.CONNECT_CHECKMATE}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isPrimaryDisabled={!isFormValid || isConnecting}
          isCancelDisabled={isVerifying || isConnecting}
        />
      )}

      <Text size="xs" c="dimmed" className="mt-2">
        <strong>{CHECKMATE_LABELS.NOTE_TITLE}</strong> {CHECKMATE_LABELS.NOTE_MESSAGE}
      </Text>
    </Stack>
  );
}
