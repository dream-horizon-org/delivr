/**
 * GitHub Actions CI/CD Connection Flow Component
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
  Anchor,
  Badge,
  Group,
  useMantineTheme,
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
    id: string;
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
  const theme = useMantineTheme();
  const params = useParams();
  const tenantId = params.org;
  const isInFlowRef = useRef(false);

  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<GitHubActionsConnectionFormData>(
    {
      storageKey: generateStorageKey('github-actions-cicd', tenantId || ''),
      sensitiveFields: ['apiToken'],
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.hostUrl || data.displayName),
    },
    {
      displayName: existingData?.displayName || '',
      hostUrl: existingData?.hostUrl || GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER,
      apiToken: '',
    },
    isEditMode ? {
      displayName: existingData?.displayName || '',
      hostUrl: existingData?.hostUrl || GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER,
      apiToken: '',
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
      isInFlowRef.current = false;
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    isInFlowRef.current = true;

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

      if (isEditMode && existingData?.id) {
        payload.integrationId = existingData.id;
      }

      const endpoint = `/api/v1/tenants/${tenantId}/integrations/ci-cd/${BUILD_PROVIDERS.GITHUB_ACTIONS.toLowerCase().replace('_', '-')}`;
      const result = isEditMode
        ? await apiPatch(endpoint, payload)
        : await apiPost(endpoint, payload);

      if (result.success) {
        markSaveSuccessful();
        onConnect(result);
      } else {
        setError(ALERT_MESSAGES.CONNECTION_FAILED);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, ALERT_MESSAGES.CONNECTION_FAILED));
    } finally {
      setIsConnecting(false);
      isInFlowRef.current = false;
    }
  };

  return (
    <Stack gap="md">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="brand" variant="light" radius="md" title="Draft Restored">
          Your previously entered data has been restored. Tokens are never saved for security.
        </Alert>
      )}

      {/* Info alert about token fallback */}
      {!isEditMode && (
        <Alert icon={<IconInfoCircle size={16} />} color="brand" variant="light" radius="md">
          <Text size="sm">
            <Text component="span" fw={600}>{GITHUB_ACTIONS_LABELS.TIP_TITLE}</Text> {GITHUB_ACTIONS_LABELS.TIP_MESSAGE}
          </Text>
        </Alert>
      )}

      <TextInput
        label={GITHUB_ACTIONS_LABELS.DISPLAY_NAME_LABEL}
        placeholder={GITHUB_ACTIONS_LABELS.DISPLAY_NAME_PLACEHOLDER}
        value={formData.displayName}
        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
        description={GITHUB_ACTIONS_LABELS.DISPLAY_NAME_DESCRIPTION}
        size="sm"
      />

      <TextInput
        label={GITHUB_ACTIONS_LABELS.API_URL_LABEL}
        placeholder={GITHUB_ACTIONS_LABELS.API_URL_PLACEHOLDER}
        value={formData.hostUrl}
        onChange={(e) => setFormData({ ...formData, hostUrl: e.target.value })}
        description={GITHUB_ACTIONS_LABELS.API_URL_DESCRIPTION}
        size="sm"
        disabled={isVerified}
      />

      <PasswordInput
        label={isEditMode ? GITHUB_ACTIONS_LABELS.PAT_LABEL_EDIT : GITHUB_ACTIONS_LABELS.PAT_LABEL}
        placeholder={isEditMode ? GITHUB_ACTIONS_LABELS.PAT_PLACEHOLDER_EDIT : GITHUB_ACTIONS_LABELS.PAT_PLACEHOLDER}
        value={formData.apiToken}
        onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
        description={isEditMode ? GITHUB_ACTIONS_LABELS.PAT_DESCRIPTION_EDIT : GITHUB_ACTIONS_LABELS.PAT_DESCRIPTION}
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
          {GITHUB_ACTIONS_LABELS.VERIFIED_MESSAGE}
        </Alert>
      )}

      {!isEditMode && !isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={GITHUB_ACTIONS_LABELS.VERIFY_CONNECTION}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={false}
          isCancelDisabled={isVerifying || isConnecting}
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
        <Text size="xs" c={theme.colors.slate[6]} mb="xs">
          <Text component="span" fw={600}>{GITHUB_ACTIONS_LABELS.REQUIRED_SCOPES_TITLE}</Text>
        </Text>
        <Group gap={4} mb="sm">
          {GITHUB_ACTIONS_LABELS.REQUIRED_SCOPES.map((scope) => (
            <Badge key={scope} size="xs" variant="light" color="brand" ff="monospace">
              {scope}
            </Badge>
          ))}
        </Group>
        <Anchor
          href={GITHUB_ACTIONS_LABELS.GENERATE_TOKEN_URL}
          target="_blank"
          rel="noopener noreferrer"
          c="brand"
          size="xs"
        >
          {GITHUB_ACTIONS_LABELS.GENERATE_TOKEN_LINK}
        </Anchor>
      </Box>
    </Stack>
  );
}
