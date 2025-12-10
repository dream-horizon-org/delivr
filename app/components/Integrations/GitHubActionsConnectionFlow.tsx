/**
 * GitHub Actions CI/CD Connection Flow Component
 * Simplified connection flow aligned with Jira integration pattern
 * 
 * Backend API: /tenants/:tenantId/integrations/ci-cd/github-actions
 * Falls back to SCM GitHub token if no token provided
 * Supports both create and edit modes
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
import { IconInfoCircle, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { BUILD_PROVIDERS } from '~/types/release-config-constants';
import { GITHUB_ACTIONS_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';
import { encrypt, isEncryptionConfigured } from '~/utils/encryption';

interface GitHubActionsConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: {
    id: string; // integrationId - required for updates
    displayName?: string;
    hostUrl?: string;
    verificationStatus?: string;
    lastVerifiedAt?: string;
  };
}

interface GitHubActionsConnectionFormData {
  displayName: string;
  hostUrl: string;
  apiToken: string;
}

export function GitHubActionsConnectionFlow({ 
  onConnect, 
  onCancel, 
  isEditMode = false, 
  existingData 
}: GitHubActionsConnectionFlowProps) {
  const params = useParams();
  const tenantId = params.org;

  // Ref to track if we're in the middle of verify/connect flow
  const isInFlowRef = useRef(false);

  // Draft storage with auto-save
  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<GitHubActionsConnectionFormData>(
    {
      storageKey: generateStorageKey('github-actions-cicd', tenantId || ''),
      sensitiveFields: ['apiToken'], // Never save token to draft
      // Only save draft if NOT in verify/connect flow, NOT in edit mode, and has some data
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.hostUrl || data.displayName),
    },
    {
      displayName: existingData?.displayName || '',
      hostUrl: existingData?.hostUrl || GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER,
      apiToken: '', // Never pre-populate token for security
    },
    isEditMode ? {
      displayName: existingData?.displayName || '',
      hostUrl: existingData?.hostUrl || GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER,
      apiToken: '', // Never pre-populate token for security
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
      // Encrypt the API token if provided
      const encryptedApiToken = formData.apiToken ? await encrypt(formData.apiToken) : undefined;
      
      const verifyPayload = {
        displayName: formData.displayName || undefined,
        hostUrl: formData.hostUrl || GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER,
        apiToken: encryptedApiToken, // Let backend fallback to SCM token if undefined
        _encrypted: !!encryptedApiToken, // Flag to indicate encryption
      };
      
      const endpoint = `/api/v1/tenants/${tenantId}/integrations/ci-cd/${BUILD_PROVIDERS.GITHUB_ACTIONS.toLowerCase().replace('_', '-')}/verify`;
      
      const result = await apiPost<{ verified: boolean }>(
        endpoint,
        verifyPayload
      );

      if (result.data?.verified) {
        setIsVerified(true);
      } else {
        setError(ALERT_MESSAGES.VERIFICATION_FAILED);
      }
    } catch (err) {
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
        displayName: formData.displayName || GITHUB_ACTIONS_LABELS.DISPLAY_NAME_PLACEHOLDER,
        hostUrl: formData.hostUrl || GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER,
      };

      // Only include apiToken if provided (encrypt before sending)
      if (formData.apiToken) {
        const encryptedApiToken = await encrypt(formData.apiToken);
        payload.apiToken = encryptedApiToken;
        payload._encrypted = true; // Flag to indicate encryption
      }

      // For updates, include integrationId so service layer knows to use new backend path
      if (isEditMode && existingData?.id) {
        payload.integrationId = existingData.id;
      }

      const endpoint = `/api/v1/tenants/${tenantId}/integrations/ci-cd/${BUILD_PROVIDERS.GITHUB_ACTIONS.toLowerCase().replace('_', '-')}`;
      const result = isEditMode
        ? await apiPatch(endpoint, payload)
        : await apiPost(endpoint, payload);

      if (result.success) {
        markSaveSuccessful(); // Clear draft on successful save
        onConnect(result);
      } else {
        setError(ALERT_MESSAGES.CONNECTION_FAILED);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, ALERT_MESSAGES.CONNECTION_FAILED));
    } finally {
      setIsConnecting(false);
      isInFlowRef.current = false; // Re-enable draft save after connect
    }
  };

  const isFormValid = () => {
    return true; // Token is optional (falls back to SCM), no other required fields
  };

  return (
    <Stack gap="lg">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="blue" title="Draft Restored">
          Your previously entered data has been restored. Note: Sensitive credentials (like API tokens) are never saved for security.
        </Alert>
      )}

      {/* Info alert about token fallback (only for new connections) */}
      {!isEditMode && (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>{GITHUB_ACTIONS_LABELS.TIP_TITLE}</strong> {GITHUB_ACTIONS_LABELS.TIP_MESSAGE}
          </Text>
        </Alert>
      )}

      <TextInput
        label={GITHUB_ACTIONS_LABELS.DISPLAY_NAME_LABEL}
        placeholder={GITHUB_ACTIONS_LABELS.DISPLAY_NAME_PLACEHOLDER}
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
        description={GITHUB_ACTIONS_LABELS.DISPLAY_NAME_DESCRIPTION}
      />

      <TextInput
        label={GITHUB_ACTIONS_LABELS.API_URL_LABEL}
        placeholder={GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER}
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        description={GITHUB_ACTIONS_LABELS.API_URL_DESCRIPTION}
      />

      <PasswordInput
        label={isEditMode ? GITHUB_ACTIONS_LABELS.PAT_LABEL_EDIT : GITHUB_ACTIONS_LABELS.PAT_LABEL}
        placeholder={isEditMode ? GITHUB_ACTIONS_LABELS.PAT_PLACEHOLDER_EDIT : GITHUB_ACTIONS_LABELS.PAT_PLACEHOLDER}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        description={isEditMode ? GITHUB_ACTIONS_LABELS.PAT_DESCRIPTION_EDIT : GITHUB_ACTIONS_LABELS.PAT_DESCRIPTION}
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
          {GITHUB_ACTIONS_LABELS.VERIFIED_MESSAGE}
        </ConnectionAlert>
      )}

      {!isEditMode && !isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={GITHUB_ACTIONS_LABELS.VERIFY_CONNECTION}
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
          primaryLabel={isEditMode ? INTEGRATION_MODAL_LABELS.UPDATE : GITHUB_ACTIONS_LABELS.CONNECT_GITHUB_ACTIONS}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isConnecting}
          isPrimaryDisabled={!isEditMode && !isVerified}
          isCancelDisabled={isVerifying || isConnecting}
          primaryClassName={isEditMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
        />
      )}

      <Text size="xs" c="dimmed">
        <strong>{GITHUB_ACTIONS_LABELS.REQUIRED_SCOPES_TITLE}</strong>{' '}
        {GITHUB_ACTIONS_LABELS.REQUIRED_SCOPES.map((scope, idx) => (
          <span key={scope}>
            <code>{scope}</code>{idx < GITHUB_ACTIONS_LABELS.REQUIRED_SCOPES.length - 1 ? ', ' : ''}
          </span>
        ))}
        <br />
        <a
          href={GITHUB_ACTIONS_LABELS.GENERATE_TOKEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {GITHUB_ACTIONS_LABELS.GENERATE_TOKEN_LINK}
        </a>
      </Text>
    </Stack>
  );
}
