/**
 * Jira Project Management Connection Flow Component
 */

import { useState, useRef, useEffect } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  PasswordInput,
  Select,
  Stack,
  Text,
  Alert,
  Box,
  Anchor,
  useMantineTheme,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiGet, apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
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
  const theme = useMantineTheme();
  const params = useParams();
  const tenantId = params.org;
  const isInFlowRef = useRef(false);

  // State to store fetched integration data
  const [fetchedIntegrationData, setFetchedIntegrationData] = useState<any>(null);

  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<JiraConnectionFormData>(
    {
      storageKey: generateStorageKey('jira-pm', tenantId || ''),
      sensitiveFields: ['apiToken'],
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.hostUrl || data.email || data.displayName),
    },
    {
      displayName: existingData?.name || existingData?.displayName || '',
      // Jira config uses baseUrl (not hostUrl) and email directly
      hostUrl: existingData?.baseUrl || existingData?.hostUrl || '',
      // Check multiple possible locations for email
      email: existingData?.email || existingData?.username || existingData?.config?.email || '',
      apiToken: '',
      jiraType: (existingData?.jiraType || existingData?.config?.jiraType || 'CLOUD') as JiraType,
    },
    isEditMode ? {
      displayName: existingData?.name || existingData?.displayName || '',
      // Jira config uses baseUrl (not hostUrl) and email directly
      hostUrl: existingData?.baseUrl || existingData?.hostUrl || '',
      // Check multiple possible locations for email
      email: existingData?.email || existingData?.username || existingData?.config?.email || '',
      apiToken: '',
      jiraType: (existingData?.jiraType || existingData?.config?.jiraType || 'CLOUD') as JiraType,
    } : undefined
  );

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch full integration details in edit mode to get email
  useEffect(() => {
    if (isEditMode && existingData?.id && !fetchedIntegrationData) {
      const fetchIntegrationDetails = async () => {
        try {
          const result = await apiGet<{ success: boolean; integration?: any }>(
            `/api/v1/tenants/${tenantId}/integrations/project-management?providerType=JIRA`
          );
          if (result.success && result.data?.integration) {
            setFetchedIntegrationData(result.data.integration);
          }
        } catch (error) {
          // Silently fail - will use existingData as fallback
        }
      };
      fetchIntegrationDetails();
    }
  }, [isEditMode, existingData?.id, tenantId, fetchedIntegrationData]);

  // Check encryption configuration on mount
  useEffect(() => {
    if (!isEncryptionConfigured()) {
      setError('Encryption is not configured. Please contact your system administrator.');
    }
  }, []);

  // Update form data when existingData or fetchedIntegrationData changes in edit mode
  useEffect(() => {
    if (isEditMode && (existingData || fetchedIntegrationData)) {
      const source = fetchedIntegrationData?.config || existingData;
      const emailValue = source?.email 
        || source?.username 
        || existingData?.email
        || existingData?.username
        || existingData?.config?.email
        || (existingData?.config as any)?.username
        || '';
      
      const displayNameValue = fetchedIntegrationData?.name 
        || existingData?.name 
        || source?.displayName 
        || source?.name 
        || existingData?.displayName 
        || '';
      
      setFormData({
        displayName: displayNameValue,
        hostUrl: source?.baseUrl || source?.hostUrl || existingData?.baseUrl || existingData?.hostUrl || '',
        email: emailValue,
        apiToken: '',
        jiraType: (source?.jiraType || source?.config?.jiraType || existingData?.jiraType || existingData?.config?.jiraType || 'CLOUD') as JiraType,
      });
    }
  }, [isEditMode, existingData, fetchedIntegrationData, setFormData]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: string, value: string, required: boolean = true) => {
    if (!touched[field]) return undefined;
    if (required && !value) return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    return undefined;
  };

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
      const payload: any = {
        name: formData.displayName || `Jira - ${formData.hostUrl}`,
        hostUrl: formData.hostUrl,
        email: formData.email,
        jiraType: formData.jiraType,
      };

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

      if (result.success) {
        markSaveSuccessful();
        onConnect(result);
      } else {
        const errorMsg = (result as any).error || result.message || ALERT_MESSAGES.CONNECTION_FAILED;
        setError(errorMsg);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, ALERT_MESSAGES.CONNECTION_FAILED));
    } finally {
      setIsConnecting(false);
      isInFlowRef.current = false;
    }
  };

  const isFormValid = formData.hostUrl && formData.email && (isEditMode || formData.apiToken);

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
        title={isEditMode ? 'Edit Jira Connection' : 'Connect Jira'}
      >
        <Text size="sm">
          {isEditMode
            ? 'Update your Jira connection settings.'
            : 'Connect your Jira workspace to link releases with project tracking.'}
        </Text>
      </ConnectionAlert>

      <TextInput
        label={JIRA_LABELS.DISPLAY_NAME_LABEL}
        placeholder={JIRA_LABELS.DISPLAY_NAME_PLACEHOLDER}
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
        size="sm"
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
        size="sm"
        disabled={isVerified}
      />

      <TextInput
        label={JIRA_LABELS.BASE_URL_LABEL}
        placeholder={formData.jiraType === 'CLOUD' ? JIRA_LABELS.BASE_URL_PLACEHOLDER_CLOUD : JIRA_LABELS.BASE_URL_PLACEHOLDER_SERVER}
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        onBlur={() => markTouched('hostUrl')}
        error={getFieldError('hostUrl', formData.hostUrl)}
        description={formData.jiraType === 'CLOUD' ? JIRA_LABELS.CLOUD_URL_DESCRIPTION : JIRA_LABELS.SERVER_URL_DESCRIPTION}
        size="sm"
        disabled={isVerified}
      />

      <TextInput
        label={JIRA_LABELS.EMAIL_LABEL}
        placeholder={JIRA_LABELS.EMAIL_PLACEHOLDER}
        type="email"
        required
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        onBlur={() => markTouched('email')}
        error={getFieldError('email', formData.email)}
        description={JIRA_LABELS.EMAIL_DESCRIPTION}
        size="sm"
        disabled={isVerified}
      />

      <PasswordInput
        label={isEditMode ? `${JIRA_LABELS.API_TOKEN_LABEL} (leave blank to keep existing)` : JIRA_LABELS.API_TOKEN_LABEL}
        placeholder={isEditMode ? 'Leave blank to keep existing token' : JIRA_LABELS.API_TOKEN_PLACEHOLDER}
        required={!isEditMode}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        onBlur={() => !isEditMode && markTouched('apiToken')}
        error={!isEditMode ? getFieldError('apiToken', formData.apiToken) : undefined}
        description={isEditMode ? 'Only provide a new token if you want to update it' : JIRA_LABELS.API_TOKEN_DESCRIPTION}
        size="sm"
        disabled={isVerified}
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
        <Alert 
          icon={<IconCheck size={16} />} 
          color="green"
          variant="light"
          radius="md"
        >
          {JIRA_LABELS.VERIFIED_MESSAGE}
        </Alert>
      )}

      {!isEditMode && !isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={JIRA_LABELS.VERIFY_CREDENTIALS}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={!isFormValid}
          isCancelDisabled={isVerifying || isConnecting}
        />
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleConnect}
          primaryLabel={isEditMode ? 'Save Changes' : JIRA_LABELS.CONNECT_JIRA}
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
          <Text component="span" fw={600}>{JIRA_LABELS.FOR_CLOUD}</Text>{' '}
          <Anchor
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            c="brand"
            size="xs"
          >
            {JIRA_LABELS.ATLASSIAN_SETTINGS}
          </Anchor>
        </Text>
      </Box>
    </Stack>
  );
}
