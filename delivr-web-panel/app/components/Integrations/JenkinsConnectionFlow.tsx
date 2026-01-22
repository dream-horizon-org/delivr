/**
 * Jenkins CI/CD Connection Flow Component
 * Handles verification and connection of Jenkins integrations
 */

import { useState, useRef, useEffect } from 'react';
import { useParams } from '@remix-run/react';
import {
  TextInput,
  Alert,
  PasswordInput,
  Switch,
  Stack,
  Text,
  Box,
  List,
  ThemeIcon,
  useMantineTheme,
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { JENKINS_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';
import { encrypt, isEncryptionConfigured } from '~/utils/encryption';

interface JenkinsConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: {
    id: string;
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

interface JenkinsConnectionFormData {
  displayName: string;
  hostUrl: string;
  username: string;
  apiToken: string;
  useCrumb: boolean;
  crumbPath: string;
}

export function JenkinsConnectionFlow({ onConnect, onCancel, isEditMode = false, existingData }: JenkinsConnectionFlowProps) {
  const theme = useMantineTheme();
  const params = useParams();
  const tenantId = params.org;
  const isInFlowRef = useRef(false);

  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<JenkinsConnectionFormData>(
    {
      storageKey: generateStorageKey('jenkins-cicd', tenantId || ''),
      sensitiveFields: ['apiToken'],
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.hostUrl || data.username || data.displayName),
    },
    {
      displayName: existingData?.displayName || '',
      hostUrl: existingData?.hostUrl || '',
      username: existingData?.username || '',
      apiToken: '',
      useCrumb: existingData?.providerConfig?.useCrumb ?? true,
      crumbPath: existingData?.providerConfig?.crumbPath || '/crumbIssuer/api/json'
    },
    isEditMode ? {
      displayName: existingData?.displayName || '',
      hostUrl: existingData?.hostUrl || '',
      username: existingData?.username || '',
      apiToken: '',
      useCrumb: existingData?.providerConfig?.useCrumb ?? true,
      crumbPath: existingData?.providerConfig?.crumbPath || '/crumbIssuer/api/json'
    } : undefined
  );

  const [isVerifying, setIsVerifying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check encryption configuration on mount
  useEffect(() => {
    if (!isEncryptionConfigured()) {
      console.error('❌ VITE_ENCRYPTION_KEY is not configured!');
      setError('Encryption is not configured. Please contact your system administrator.');
    }
  }, []);
  
  // Track touched fields for proper validation UX
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Validation helper - only show error if field is touched or form was submitted
  const getFieldError = (field: string, isEmpty: boolean, message: string) => {
    if ((touched[field] || hasAttemptedSubmit) && isEmpty) {
      return message;
    }
    return undefined;
  };

  const handleVerify = async () => {
    setHasAttemptedSubmit(true);
    
    // Check if form is valid before proceeding
    if (!formData.hostUrl || !formData.username || !formData.apiToken) {
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);
    isInFlowRef.current = true; // Prevent draft save during verify
    

    try {
      // Encrypt the API token before sending
      const encryptedApiToken = await encrypt(formData.apiToken);
      
      const verifyPayload = {
        displayName: formData.displayName || undefined,
        hostUrl: formData.hostUrl,
        username: formData.username,
        apiToken: encryptedApiToken,
        _encrypted: true, // Flag to indicate encryption
        providerConfig: {
          useCrumb: formData.useCrumb,
          crumbPath: formData.crumbPath
        }
      };
      
      const endpoint = `/api/v1/tenants/${tenantId}/integrations/ci-cd/${BUILD_PROVIDERS.JENKINS.toLowerCase()}/verify`;
      
      const result = await apiPost<{ verified: boolean; message?: string }>(
        endpoint,
        verifyPayload
      );

      if (result.data?.verified) {
        setVerificationResult({
          success: true,
          message: result.data.message || 'Jenkins connection verified successfully!'
        });
      } else {
        setVerificationResult({
          success: false,
          message: 'Failed to verify Jenkins connection'
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to verify Jenkins connection'));
    } finally {
      setIsVerifying(false);
      isInFlowRef.current = false;
    }
  };

  const handleConnect = async () => {
    setHasAttemptedSubmit(true);
    
    // Validate required fields
    if (!formData.hostUrl || !formData.username) {
      return;
    }
    
    if (!isEditMode && !formData.apiToken) {
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    isInFlowRef.current = true;

    try {
      const payload: any = {
        displayName: formData.displayName || `${formData.hostUrl}`,
        hostUrl: formData.hostUrl,
        username: formData.username,
        providerConfig: {
          useCrumb: formData.useCrumb,
          crumbPath: formData.crumbPath
        }
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

      if (isEditMode && existingData?.id) {
        payload.integrationId = existingData.id;
      }

      const endpoint = `/api/v1/tenants/${tenantId}/integrations/ci-cd/${BUILD_PROVIDERS.JENKINS.toLowerCase()}`;
      const result = isEditMode
        ? await apiPatch(endpoint, payload)
        : await apiPost(endpoint, payload);

      if (result.success) {
        markSaveSuccessful();
        onConnect(result);
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'connect'} Jenkins integration`);
      }
    } catch (err) {
      const action = isEditMode ? 'update' : 'connect';
      setError(getApiErrorMessage(err, `Failed to ${action} Jenkins integration`));
    } finally {
      setIsConnecting(false);
      isInFlowRef.current = false;
    }
  };

  const isFormValid = formData.hostUrl && formData.username && (isEditMode || formData.apiToken);

  return (
    <Stack gap="md">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="brand" variant="light" radius="md" title="Draft Restored">
          Your previously entered data has been restored. Note: Tokens are never saved for security.
        </Alert>
      )}

      <ConnectionAlert 
        color="brand" 
        title={isEditMode ? 'Edit Jenkins Connection' : JENKINS_LABELS.JENKINS_DETAILS}
      >
        <Text size="sm">
          {isEditMode 
            ? 'Update your Jenkins server connection details.'
            : 'Connect your Jenkins server to trigger builds and track deployment pipelines.'}
        </Text>
      </ConnectionAlert>

      <TextInput
        label="Display Name (Optional)"
        placeholder="My Jenkins Server"
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
        size="sm"
      />

      <TextInput
        label={JENKINS_LABELS.SERVER_URL_LABEL}
        placeholder={JENKINS_LABELS.SERVER_URL_PLACEHOLDER}
        required
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        onBlur={() => markTouched('hostUrl')}
        error={getFieldError('hostUrl', !formData.hostUrl, 'Host URL is required')}
        size="sm"
        disabled={verificationResult?.success}
      />

      <TextInput
        label={JENKINS_LABELS.USERNAME_LABEL}
        placeholder={JENKINS_LABELS.USERNAME_PLACEHOLDER}
        required
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        onBlur={() => markTouched('username')}
        error={getFieldError('username', !formData.username, 'Username is required')}
        size="sm"
        disabled={verificationResult?.success}
      />

      <PasswordInput
        label={isEditMode ? `${JENKINS_LABELS.API_TOKEN_LABEL} (leave blank to keep existing)` : JENKINS_LABELS.API_TOKEN_LABEL}
        placeholder={isEditMode ? "Leave blank to keep existing token" : JENKINS_LABELS.API_TOKEN_PLACEHOLDER}
        required={!isEditMode}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        onBlur={() => markTouched('apiToken')}
        error={!isEditMode ? getFieldError('apiToken', !formData.apiToken, 'API Token is required') : undefined}
        description={isEditMode ? "Only provide a new token if you want to update it" : undefined}
        size="sm"
        disabled={verificationResult?.success}
      />

      <Box
        p="sm"
        style={{
          backgroundColor: theme.colors.slate[0],
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.slate[2]}`,
        }}
      >
        <Switch
          label="Use CSRF Protection (Recommended)"
          checked={formData.useCrumb}
          onChange={(e) => setFormData({ ...formData, useCrumb: e.currentTarget.checked })}
          size="sm"
          color="brand"
        />
        
        {formData.useCrumb && (
          <TextInput
            label="Crumb Path"
            placeholder="/crumbIssuer/api/json"
            value={formData.crumbPath}
            onChange={(e) => setFormData({ ...formData, crumbPath: e.target.value })}
            size="xs"
            mt="sm"
          />
        )}
      </Box>

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

      {verificationResult && (
        <Alert
          icon={verificationResult.success ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
          color={verificationResult.success ? 'green' : 'red'}
          variant="light"
          radius="md"
        >
          {verificationResult.message}
        </Alert>
      )}

      {!isEditMode ? (
        <>
          {!verificationResult?.success ? (
            <ActionButtons
              onCancel={onCancel}
              onPrimary={handleVerify}
              primaryLabel={JENKINS_LABELS.VERIFY_CONNECTION}
              cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
              isPrimaryLoading={isVerifying}
              isPrimaryDisabled={!isFormValid || isVerifying || isConnecting}
            />
          ) : (
            <ActionButtons
              onCancel={onCancel}
              onPrimary={handleConnect}
              primaryLabel={JENKINS_LABELS.CONNECT_JENKINS}
              cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
              isPrimaryLoading={isConnecting}
              isPrimaryDisabled={isConnecting}
            />
          )}
        </>
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleConnect}
          primaryLabel="Update"
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isPrimaryDisabled={!isFormValid || isConnecting}
        />
      )}

      {/* How to get token */}
      <Box
        p="md"
        style={{
          backgroundColor: theme.colors.slate[0],
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.slate[2]}`,
        }}
      >
        <Text size="sm" fw={600} c={theme.colors.slate[8]} mb="sm">
          {JENKINS_LABELS.HOW_TO_GET_TOKEN}
        </Text>
        <Stack gap="xs">
          {JENKINS_LABELS.INSTRUCTIONS.map((instruction, idx) => (
            <Text key={idx} size="sm" c={theme.colors.slate[6]}>
              {idx + 1}. {instruction}
            </Text>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
