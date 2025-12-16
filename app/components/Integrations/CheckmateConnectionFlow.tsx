/**
 * Checkmate Test Management Connection Flow Component
 */

import { useState, useRef, useEffect } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  PasswordInput,
  Stack,
  Text,
  Alert,
  Box,
  useMantineTheme,
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
  const theme = useMantineTheme();
  const params = useParams();
  const tenantId = params.org;
  const isInFlowRef = useRef(false);

  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<CheckmateConnectionFormData>(
    {
      storageKey: generateStorageKey('checkmate-tm', tenantId || ''),
      sensitiveFields: ['authToken'],
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.baseUrl || data.name || data.orgId),
    },
    {
      name: existingData?.name || '',
      baseUrl: existingData?.config?.baseUrl || '',
      authToken: '',
      orgId: existingData?.config?.orgId || '',
    },
    isEditMode ? {
      name: existingData?.name || '',
      baseUrl: existingData?.config?.baseUrl || '',
      authToken: '',
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string, value: string) => {
    if (!touched[field]) return undefined;
    if (!value) return `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
    return undefined;
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setIsVerified(false);
    isInFlowRef.current = true;

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

      if (result.data?.verified || result.success) {
        setIsVerified(true);
      } else {
        const errorMsg = (result as any).error || (result.data as any)?.error || ALERT_MESSAGES.VERIFICATION_FAILED;
        setError(errorMsg);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, ALERT_MESSAGES.VERIFICATION_FAILED));
    } finally {
      setIsVerifying(false);
      isInFlowRef.current = false;
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    isInFlowRef.current = true;

    try {
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
        providerType: TEST_PROVIDERS.CHECKMATE.toLowerCase(),
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
        setError('Auth Token is required');
        setIsConnecting(false);
        return;
      }

      const result = isEditMode && integrationId
        ? await apiPut(endpoint, payload)
        : await apiPost(endpoint, payload);

      if (result.success) {
        markSaveSuccessful();
        onConnect(result);
      } else {
        const errorMsg = result.error || `Failed to ${isEditMode ? 'update' : 'connect'} ${TEST_PROVIDERS.CHECKMATE} integration`;
        setError(errorMsg);
      }
    } catch (err) {
      const action = isEditMode ? 'update' : 'connect';
      setError(getApiErrorMessage(err, `Failed to ${action} ${TEST_PROVIDERS.CHECKMATE} integration`));
    } finally {
      setIsConnecting(false);
      isInFlowRef.current = false;
    }
  };

  const isFormValid = formData.name && formData.baseUrl && formData.orgId && (isEditMode || formData.authToken);

  return (
    <Stack gap="md">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="brand" variant="light" radius="md" title="Draft Restored">
          Your previously entered data has been restored. Tokens are never saved for security.
        </Alert>
      )}

      <ConnectionAlert 
        color="brand" 
        title={isEditMode ? 'Edit Checkmate Connection' : CHECKMATE_LABELS.CHECKMATE_CONNECTION}
      >
        <Text size="sm">
          {isEditMode
            ? CHECKMATE_LABELS.EDIT_DESCRIPTION
            : CHECKMATE_LABELS.CONNECT_DESCRIPTION}
        </Text>
      </ConnectionAlert>

      <TextInput
        label={CHECKMATE_LABELS.DISPLAY_NAME_LABEL}
        placeholder={CHECKMATE_LABELS.DISPLAY_NAME_PLACEHOLDER}
        required
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        onBlur={() => markTouched('name')}
        error={getFieldError('name', formData.name)}
        size="sm"
      />

      <TextInput
        label={CHECKMATE_LABELS.BASE_URL_LABEL}
        placeholder={CHECKMATE_LABELS.BASE_URL_PLACEHOLDER}
        required
        value={formData.baseUrl}
        onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
        onBlur={() => markTouched('baseUrl')}
        error={getFieldError('baseUrl', formData.baseUrl)}
        description={CHECKMATE_LABELS.BASE_URL_DESCRIPTION}
        size="sm"
      />

      <TextInput
        label={CHECKMATE_LABELS.ORG_ID_LABEL}
        placeholder={CHECKMATE_LABELS.ORG_ID_PLACEHOLDER}
        required
        type="number"
        value={formData.orgId}
        onChange={(e) => setFormData({ ...formData, orgId: e.target.value })}
        onBlur={() => markTouched('orgId')}
        error={getFieldError('orgId', formData.orgId)}
        description={CHECKMATE_LABELS.ORG_ID_DESCRIPTION}
        size="sm"
      />

      <PasswordInput
        label={isEditMode ? `${CHECKMATE_LABELS.AUTH_TOKEN_LABEL} (leave blank to keep existing)` : CHECKMATE_LABELS.AUTH_TOKEN_LABEL}
        placeholder={isEditMode ? "Leave blank to keep existing token" : CHECKMATE_LABELS.AUTH_TOKEN_PLACEHOLDER}
        required={!isEditMode}
        value={formData.authToken}
        onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
        onBlur={() => !isEditMode && markTouched('authToken')}
        error={!isEditMode ? getFieldError('authToken', formData.authToken) : undefined}
        description={isEditMode ? "Only provide a new token if you want to update it" : CHECKMATE_LABELS.AUTH_TOKEN_DESCRIPTION}
        size="sm"
      />

      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red"
          variant="light"
          radius="md"
          title="Error"
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      {isVerified && (
        <ConnectionAlert color="green" title={ALERT_MESSAGES.VERIFICATION_SUCCESS}>
          <Text size="sm">Credentials verified successfully! Click "{isEditMode ? 'Save Changes' : 'Connect'}" to save.</Text>
        </ConnectionAlert>
      )}

      {!isEditMode && !isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel="Verify Credentials"
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={!isFormValid}
          isCancelDisabled={isVerifying || isConnecting}
        />
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleConnect}
          primaryLabel={isEditMode ? 'Save Changes' : CHECKMATE_LABELS.CONNECT_CHECKMATE}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isPrimaryDisabled={!isFormValid}
          isCancelDisabled={isVerifying || isConnecting}
        />
      )}

      <Box
        p="sm"
        style={{
          backgroundColor: theme.colors.slate[0],
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.slate[2]}`,
        }}
      >
        <Text size="xs" c={theme.colors.slate[6]}>
          <Text component="span" fw={600}>{CHECKMATE_LABELS.NOTE_TITLE}</Text> {CHECKMATE_LABELS.NOTE_MESSAGE}
        </Text>
      </Box>
    </Stack>
  );
}
