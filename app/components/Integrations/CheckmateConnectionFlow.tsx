/**
 * Checkmate Test Management Connection Flow Component
 * Handles verification and connection of Checkmate integrations
 * 
 * Backend API structure:
 * - Config: { baseUrl: string, authToken: string }
 * - Provider: CHECKMATE
 * - Endpoints: /tenants/:tenantId/integrations/test-management
 */

import { useState, useRef, useEffect } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  PasswordInput,
  Stack,
  Text,
  Alert
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiPost, apiPut, getApiErrorMessage } from '~/utils/api-client';
import { TEST_PROVIDERS } from '~/types/release-config-constants';
import { CHECKMATE_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';
import { encrypt, isEncryptionConfigured } from '~/utils/encryption';

interface CheckmateConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

interface CheckmateConnectionFormData {
  name: string;
  baseUrl: string;
  authToken: string;
  orgId: string;
}

export function CheckmateConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: CheckmateConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  // Ref to track if we're in the middle of verify/connect flow
  const isInFlowRef = useRef(false);

  // Draft storage with auto-save
  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<CheckmateConnectionFormData>(
    {
      storageKey: generateStorageKey('checkmate-tm', tenantId || ''),
      sensitiveFields: ['authToken'], // Never save token to draft
      // Only save draft if NOT in verify/connect flow, NOT in edit mode, and has some data
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.baseUrl || data.name || data.orgId),
    },
    {
      name: existingData?.name || '',
      baseUrl: existingData?.config?.baseUrl || '',
      authToken: '', // Never pre-populate sensitive data
      orgId: existingData?.config?.orgId || '',
    },
    isEditMode ? {
      name: existingData?.name || '',
      baseUrl: existingData?.config?.baseUrl || '',
      authToken: '', // Never pre-populate sensitive data
      orgId: existingData?.config?.orgId || '',
    } : undefined
  );

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrationId, setIntegrationId] = useState<string | null>(existingData?.id || null);

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
      // Encrypt the auth token before sending
      const encryptedAuthToken = await encrypt(formData.authToken);
      
      const verifyPayload = {
        baseUrl: formData.baseUrl,
        authToken: encryptedAuthToken,
        orgId: parseInt(formData.orgId, 10),
        _encrypted: true, // Flag to indicate encryption
      };
      
      const endpoint = `/api/v1/tenants/${tenantId}/integrations/test-management/verify`;
      
      
      const result = await apiPost<{ verified: boolean }>(
        endpoint,
        verifyPayload
      );

      console.log('[CheckmateConnectionFlow] Verification result:', result);

      if (result.data?.verified || result.success) {
        setIsVerified(true);
      } else {
        // Show the specific error message from backend
        const errorMsg = (result as any).error || (result.data as any)?.error || ALERT_MESSAGES.VERIFICATION_FAILED;
        setError(errorMsg);
      }
    } catch (err) {
      console.error('[CheckmateConnectionFlow] Verification error:', err);
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
      // Use tenantId to match backend's tenant-level routes with query params
      const baseEndpoint = `/api/v1/tenants/${tenantId}/integrations/test-management`;
      const endpoint = isEditMode && integrationId 
        ? `${baseEndpoint}?integrationId=${integrationId}`
        : baseEndpoint;

      // Encrypt the auth token if provided
      let encryptedAuthToken: string | undefined;
      if (formData.authToken) {
        encryptedAuthToken = await encrypt(formData.authToken);
      }
      
      const payload: any = {
        name: formData.name || `${TEST_PROVIDERS.CHECKMATE} - ${formData.baseUrl}`,
        providerType: TEST_PROVIDERS.CHECKMATE.toLowerCase(), // Required by API (lowercase)
        config: {
          baseUrl: formData.baseUrl,
          authToken: encryptedAuthToken,
          orgId: parseInt(formData.orgId, 10) || undefined, // Convert to number
          _encrypted: !!encryptedAuthToken, // Flag to indicate encryption
        }
      };


      // Only include authToken if provided (required for create, optional for update)
      if (!formData.authToken && isEditMode) {
        delete payload.config.authToken;
        delete payload.config._encrypted;
      } else if (!formData.authToken && !isEditMode) {
        console.error('[CheckmateConnectionFlow] Auth token missing');
        setError('Auth Token is required');
        setIsConnecting(false);
        return;
      }

      const result = isEditMode && integrationId
        ? await apiPut(endpoint, payload)
        : await apiPost(endpoint, payload);

      console.log('[CheckmateConnectionFlow] Connection result:', result);

      if (result.success) {
        markSaveSuccessful(); // Clear draft on successful save
        onConnect(result);
      } else {
        const errorMsg = result.error || `Failed to ${isEditMode ? 'update' : 'connect'} ${TEST_PROVIDERS.CHECKMATE} integration`;
        console.error('[CheckmateConnectionFlow] Connection failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const action = isEditMode ? 'update' : 'connect';
      const errorMsg = getApiErrorMessage(err, `Failed to ${action} ${TEST_PROVIDERS.CHECKMATE} integration`);
      console.error('[CheckmateConnectionFlow] Connection error:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsConnecting(false);
      isInFlowRef.current = false; // Re-enable draft save after connect
    }
  };

  // For edit mode, authToken is optional. For create mode, it's required
  const isFormValid = () => {
    return formData.name && formData.baseUrl && formData.orgId && (isEditMode || formData.authToken);
  };

  return (
    <Stack gap="md">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="blue" title="Draft Restored">
          Your previously entered data has been restored. Note: Sensitive credentials (like auth tokens) are never saved for security.
        </Alert>
      )}

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
          Credentials verified successfully! Click "{isEditMode ? 'Save Changes' : 'Connect'}" to save.
        </ConnectionAlert>
      )}

      {/* Show verify button for new connections, or save button for edits */}
      {!isEditMode && !isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel="Verify Credentials"
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
          primaryLabel={isEditMode ? 'Save Changes' : CHECKMATE_LABELS.CONNECT_CHECKMATE}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isPrimaryDisabled={!isFormValid()}
          isCancelDisabled={isVerifying || isConnecting}
          primaryClassName="bg-green-600 hover:bg-green-700"
        />
      )}

      <Text size="xs" c="dimmed" className="mt-2">
        <strong>{CHECKMATE_LABELS.NOTE_TITLE}</strong> {CHECKMATE_LABELS.NOTE_MESSAGE}
      </Text>
    </Stack>
  );
}
