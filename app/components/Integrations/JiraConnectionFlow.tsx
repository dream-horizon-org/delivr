/**
 * Jira Project Management Connection Flow Component
 * Handles verification and connection of Jira integrations
 * 
 * Backend API: /projects/:projectId/integrations/project-management
 * Config: { baseUrl, email, apiToken, jiraType }
 */

import { useState, useRef, useEffect } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  PasswordInput,
  Select,
  Stack,
  Text,
  Alert
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { JIRA_TYPES } from '~/types/jira-integration';
import type { JiraType } from '~/types/jira-integration';
import { JIRA_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';
import { encrypt, isEncryptionConfigured } from '~/utils/encryption';

interface JiraConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

interface JiraConnectionFormData {
  displayName: string;
  hostUrl: string;
  email: string;
  apiToken: string;
  jiraType: JiraType;
}

export function JiraConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: JiraConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  // Ref to track if we're in the middle of verify/connect flow
  const isInFlowRef = useRef(false);

  // Draft storage with auto-save
  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<JiraConnectionFormData>(
    {
      storageKey: generateStorageKey('jira-pm', tenantId || ''),
      sensitiveFields: ['apiToken'], // Never save token to draft
      // Only save draft if NOT in verify/connect flow, NOT in edit mode, and has some data
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.hostUrl || data.email || data.displayName),
    },
    {
      displayName: existingData?.displayName || existingData?.name || '',
      hostUrl: existingData?.hostUrl || existingData?.config?.hostUrl || '',
      email: existingData?.email || existingData?.config?.email || '',
      apiToken: '', // Never prefill sensitive data
      jiraType: (existingData?.jiraType || existingData?.config?.jiraType || 'CLOUD') as JiraType,
    },
    isEditMode ? {
      displayName: existingData?.displayName || existingData?.name || '',
      hostUrl: existingData?.hostUrl || existingData?.config?.hostUrl || '',
      email: existingData?.email || existingData?.config?.email || '',
      apiToken: '', // Never prefill sensitive data
      jiraType: (existingData?.jiraType || existingData?.config?.jiraType || 'CLOUD') as JiraType,
    } : undefined
  );

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check encryption configuration on mount
  useEffect(() => {
    if (!isEncryptionConfigured()) {
      console.error('❌ VITE_ENCRYPTION_KEY is not configured!');
      setError('Encryption is not configured. Please contact your system administrator.');
    }
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setIsVerified(false);
    isInFlowRef.current = true; // Prevent draft save during verify

    try {
      // Encrypt the API token before sending
      const encryptedApiToken = await encrypt(formData.apiToken);
      
      const verifyPayload = {
        hostUrl: formData.hostUrl,
        email: formData.email,
        apiToken: encryptedApiToken,
        jiraType: formData.jiraType,
        _encrypted: true, // Flag to indicate encryption
      };
      const result = await apiPost<{ verified: boolean }>(
        `/api/v1/tenants/${tenantId}/integrations/project-management/verify?providerType=JIRA`,
        verifyPayload
      );

      console.log('[JiraConnectionFlow] Verification result:', result);

      if (result.data?.verified || result.success) {
        setIsVerified(true);
      } else {
        // Show the specific error message from backend
        const errorMsg = (result as any).error || (result.data as any)?.error || ALERT_MESSAGES.VERIFICATION_FAILED;
        setError(errorMsg);
      }
    } catch (err) {
      console.error('[JiraConnectionFlow] Verification error:', err);
      setError(getApiErrorMessage(err, ALERT_MESSAGES.VERIFICATION_FAILED));
    } finally {
      setIsVerifying(false);
      isInFlowRef.current = false; // Re-enable draft save after verify
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    isInFlowRef.current = true; // Prevent draft save during connect

    try {
      const payload: any = {
        name: formData.displayName || `Jira - ${formData.hostUrl}`,
        hostUrl: formData.hostUrl,
        email: formData.email,
        jiraType: formData.jiraType,
      };

      // Only include apiToken if provided (required for create, optional for update)
      if (formData.apiToken) {
        // Encrypt the API token before sending
        const encryptedApiToken = await encrypt(formData.apiToken);
        payload.apiToken = encryptedApiToken;
        payload._encrypted = true; // Flag to indicate encryption
      } else if (!isEditMode) {
        setError('API Token is required');
        setIsConnecting(false);
        return;
      }

      // For updates, include integrationId as query parameter
      const endpoint = isEditMode && existingData?.id
        ? `/api/v1/tenants/${tenantId}/integrations/project-management?providerType=JIRA&integrationId=${existingData.id}`
        : `/api/v1/tenants/${tenantId}/integrations/project-management?providerType=JIRA`;
      
      const result = isEditMode && existingData?.id
        ? await apiPatch(endpoint, payload)
        : await apiPost(endpoint, payload);

      console.log('[JiraConnectionFlow] Save result:', result);

      if (result.success) {
        markSaveSuccessful(); // Clear draft on successful save
        onConnect(result);
      } else {
        // Show the specific error from backend if available
        const errorMsg = (result as any).error || result.message || ALERT_MESSAGES.CONNECTION_FAILED;
        console.error('[JiraConnectionFlow] Save failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, ALERT_MESSAGES.CONNECTION_FAILED);
      console.error('[JiraConnectionFlow] Save error:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsConnecting(false);
      isInFlowRef.current = false; // Re-enable draft save after connect
    }
  };

  const isFormValid = () => {
    return formData.hostUrl && formData.email && (isEditMode || formData.apiToken);
  };

  return (
    <Stack gap="lg">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="blue" title="Draft Restored">
          Your previously entered data has been restored. Note: Sensitive credentials (like API tokens) are never saved for security.
        </Alert>
      )}

      <TextInput
        label={JIRA_LABELS.DISPLAY_NAME_LABEL}
        placeholder={JIRA_LABELS.DISPLAY_NAME_PLACEHOLDER}
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
      />

      <Select
        label={JIRA_LABELS.JIRA_TYPE_LABEL}
        required
        value={formData.jiraType}
        onChange={(value) => setFormData({ ...formData, jiraType: value as JiraType })}
        data={JIRA_TYPES.map(type => ({
          value: type.value,
          label: type.label,
        }))}
        description={JIRA_LABELS.JIRA_TYPE_DESCRIPTION}
      />

      <TextInput
        label={JIRA_LABELS.BASE_URL_LABEL}
        placeholder={formData.jiraType === 'CLOUD' ? JIRA_LABELS.BASE_URL_PLACEHOLDER_CLOUD : JIRA_LABELS.BASE_URL_PLACEHOLDER_SERVER}
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        error={!formData.hostUrl && 'Base URL is required'}
        description={formData.jiraType === 'CLOUD' ? JIRA_LABELS.CLOUD_URL_DESCRIPTION : JIRA_LABELS.SERVER_URL_DESCRIPTION}
      />

      <TextInput
        label={JIRA_LABELS.EMAIL_LABEL}
        placeholder={JIRA_LABELS.EMAIL_PLACEHOLDER}
        type="email"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={!formData.email && 'Email is required'}
        description={JIRA_LABELS.EMAIL_DESCRIPTION}
      />

      <PasswordInput
        label={isEditMode ? `${JIRA_LABELS.API_TOKEN_LABEL} (leave blank to keep existing)` : JIRA_LABELS.API_TOKEN_LABEL}
        placeholder={isEditMode ? 'Leave blank to keep existing token' : JIRA_LABELS.API_TOKEN_PLACEHOLDER}
        required={!isEditMode}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        error={!isEditMode && !formData.apiToken && 'API Token is required'}
        description={isEditMode ? 'Only provide a new token if you want to update it' : JIRA_LABELS.API_TOKEN_DESCRIPTION}
      />

      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red" 
          title="Error"
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      {isVerified && (
        <ConnectionAlert color="green" title={ALERT_MESSAGES.VERIFICATION_SUCCESS}>
          {JIRA_LABELS.VERIFIED_MESSAGE}
        </ConnectionAlert>
      )}

      {/* Show verify button for new connections, or save button for edits */}
      {!isEditMode && !isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={JIRA_LABELS.VERIFY_CREDENTIALS}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={!isFormValid()}
          isCancelDisabled={isVerifying || isConnecting}
          primaryClassName="bg-gray-600 hover:bg-gray-700"
        />
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleConnect}
          primaryLabel={isEditMode ? 'Save Changes' : JIRA_LABELS.CONNECT_JIRA}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isPrimaryDisabled={!isFormValid()}
          isCancelDisabled={isVerifying || isConnecting}
          primaryClassName="bg-green-600 hover:bg-green-700"
        />
      )}

      <Text size="xs" c="dimmed">
        <strong>{JIRA_LABELS.FOR_CLOUD}</strong>{' '}
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {JIRA_LABELS.ATLASSIAN_SETTINGS}
        </a>
      </Text>
    </Stack>
  );
}
