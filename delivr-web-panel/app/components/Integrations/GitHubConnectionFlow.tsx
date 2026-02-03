import { useState, useRef, useEffect } from 'react';
import { TextInput, Alert, PasswordInput, Stack, Box, Text, Anchor, List, ThemeIcon, useMantineTheme, Group } from '@mantine/core';
import { IconCheck, IconAlertCircle, IconExternalLink, IconBrandGithub } from '@tabler/icons-react';
import { useParams } from '@remix-run/react';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { trimIntegrationFields } from '~/utils/integration-helpers';
import { SCM_TYPES } from '~/constants/integrations';
import { GITHUB_LABELS, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';
import { encrypt, isEncryptionConfigured } from '~/utils/encryption';

interface GitHubConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

interface GitHubConnectionFormData {
  scmType: string;
  owner: string;
  repoName: string;
  token: string;
}

export function GitHubConnectionFlow({
  onConnect,
  onCancel,
  isEditMode = false,
  existingData
}: GitHubConnectionFlowProps) {
  const theme = useMantineTheme();
  const { org } = useParams();
  const isInFlowRef = useRef(false);

  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<GitHubConnectionFormData>(
    {
      storageKey: generateStorageKey('github-scm', org || ''),
      sensitiveFields: ['token'],
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.owner || data.repoName),
    },
    {
      scmType: existingData?.scmType || existingData?.providerType || SCM_TYPES.GITHUB,
      owner: existingData?.owner || '',
      repoName: existingData?.repo || existingData?.repoName || '',
      token: '',
    },
    isEditMode ? {
      scmType: existingData?.scmType || existingData?.providerType || SCM_TYPES.GITHUB,
      owner: existingData?.owner || '',
      repoName: existingData?.repo || existingData?.repoName || '',
      token: '',
    } : undefined
  );

  const { scmType, owner, repoName, token } = formData;

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(!!existingData?.isVerified || isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Check encryption configuration on mount
  useEffect(() => {
    if (!isEncryptionConfigured()) {
      console.error('❌ VITE_ENCRYPTION_KEY is not configured!');
      setError('Encryption is not configured. Please contact your system administrator.');
    }
  }, []);

  // Check encryption configuration on mount
  useEffect(() => {
    if (!isEncryptionConfigured()) {
      console.error('❌ VITE_ENCRYPTION_KEY is not configured!');
      setError('Encryption is not configured. Please contact your system administrator.');
    }
  }, []);

  
  const hasOwnerOrRepoChanged = isEditMode && (
    owner !== (existingData?.owner || '') ||
    repoName !== (existingData?.repo || existingData?.repoName || '')
  );

  const handleVerify = async () => {
    if (!owner || !repoName || !token) {
      setError('Owner, repository name, and access token are required');
      return;
    }

    isInFlowRef.current = true;
    setIsVerifying(true);
    setError(null);

    try {
      // Encrypt the access token before sending
      const encryptedToken = await encrypt(token);
      
      const verifyPayload = trimIntegrationFields({
        scmType,
        owner,
        repo: repoName,
        accessToken: encryptedToken,
        _encrypted: true, // Flag to indicate encryption
      });
      
      const endpoint = `/api/v1/apps/${org}/integrations/scm/verify`;
      const result = await apiPost(
        endpoint,
        verifyPayload
      );

      if (result.success) {
        setIsVerified(true);
        setError(null);
      } else {
        setError('Verification failed');
        setIsVerified(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to verify connection'));
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
      isInFlowRef.current = false;
    }
  };

  const handleSaveAndConnect = async () => {
    if (!isEditMode && !isVerified) {
      setError('Please verify the connection before saving');
      return;
    }

    if (isEditMode && hasOwnerOrRepoChanged && !token) {
      setError('Access token is required when changing repository. Please verify first.');
      return;
    }

    if (isEditMode && hasOwnerOrRepoChanged && !isVerified) {
      setError('Please verify the connection before saving changes');
      return;
    }

    isInFlowRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      const payload: any = trimIntegrationFields({
        scmType,
        owner,
        repo: repoName,
        displayName: `${owner}/${repoName}`,
      });

      if (token) {
        // Encrypt the access token before sending
        const encryptedToken = await encrypt(token);
        payload.accessToken = encryptedToken;
        payload._encrypted = true; // Flag to indicate encryption
      } else if (!isEditMode) {
        setError('Access token is required');
        setIsSaving(false);
        return;
      }

      let result;
      const endpoint = `/api/v1/apps/${org}/integrations/scm`;
      
      if (isEditMode && existingData?.id) {
        payload.integrationId = existingData.id;
        result = await apiPatch<{ integration: any }>(
          endpoint,
          payload
        );
      } else {
        // Use POST for creates
        
        result = await apiPost<{ integration: any }>(
          endpoint,
          payload
        );
      }

      if (result.success && result.data?.integration) {
        markSaveSuccessful();
        
        onConnect({
          scmType,
          owner,
          repoName,
          token: token || '***',
          repoUrl: `https://github.com/${owner}/${repoName}`,
          isVerified: true,
        });
      } else {
        setError('Failed to save integration');
        isInFlowRef.current = false;
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save connection'));
      isInFlowRef.current = false;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="brand" variant="light" radius="md" title="Draft Restored">
          Your previously entered data has been restored. Note: Tokens are never saved for security.
        </Alert>
      )}

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

      {isVerified && !isEditMode && (
        <Alert 
          icon={<IconCheck size={16} />} 
          color="green"
          variant="light"
          radius="md"
        >
          Connection verified! Click "Save & Connect" to complete the setup.
        </Alert>
      )}

      {isEditMode && hasOwnerOrRepoChanged && !token && (
        <ConnectionAlert color="yellow" title="Repository Changed">
          <Text size="sm">You've changed the repository. Please provide an access token to verify.</Text>
        </ConnectionAlert>
      )}

     

      {/* Repository Owner */}
      <TextInput
        label="Repository Owner"
        placeholder="organization or username"
        value={owner}
        onChange={(e) => {
          setFormData({ ...formData, owner: e.currentTarget.value });
          setIsVerified(false);
          setError(null);
        }}
        required
        disabled={!isEditMode && isVerified}
        description="The GitHub organization or username"
        size="sm"
      />

      {/* Repository Name */}
      <TextInput
        label="Repository Name"
        placeholder="repository-name"
        value={repoName}
        onChange={(e) => {
          setFormData({ ...formData, repoName: e.currentTarget.value });
          setIsVerified(false);
          setError(null);
        }}
        required
        disabled={!isEditMode && isVerified}
        description="The name of your repository"
        size="sm"
      />

      {/* Personal Access Token */}
      <PasswordInput
        label={
          isEditMode 
            ? hasOwnerOrRepoChanged 
              ? GITHUB_LABELS.ACCESS_TOKEN_LABEL
              : `${GITHUB_LABELS.ACCESS_TOKEN_LABEL} (leave blank to keep existing)`
            : GITHUB_LABELS.ACCESS_TOKEN_LABEL
        }
        placeholder={
          isEditMode 
            ? hasOwnerOrRepoChanged
              ? GITHUB_LABELS.ACCESS_TOKEN_PLACEHOLDER
              : 'Leave blank to keep existing token'
            : GITHUB_LABELS.ACCESS_TOKEN_PLACEHOLDER
        }
        value={token}
        onChange={(e) => {
          setFormData({ ...formData, token: e.currentTarget.value });
          setIsVerified(false);
          setError(null);
        }}
        required={!isEditMode || hasOwnerOrRepoChanged}
        disabled={isVerifying || isSaving}
        description={
          isEditMode 
            ? hasOwnerOrRepoChanged
              ? 'Access token is required to verify the new repository'
              : 'Only provide a new token if you want to update it'
            : 'Create a token with "repo" scope'
        }
        size="sm"
      />

      {/* Repository URL Preview */}
      {owner && repoName && (
        <Box
          p="sm"
          style={{
            backgroundColor: theme.colors.slate[0],
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.slate[2]}`,
          }}
        >
          <Text size="xs" c={theme.colors.slate[5]} mb={4}>
            Repository URL:
          </Text>
          <Group gap="xs">
            <IconBrandGithub size={14} color={theme.colors.slate[6]} />
            <Anchor
              href={`https://github.com/${owner}/${repoName}`}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              fw={500}
              c="brand"
            >
              https://github.com/{owner}/{repoName}
            </Anchor>
          </Group>
        </Box>
      )}

      {/* Action Buttons */}
      {!isEditMode && !isVerified ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={GITHUB_LABELS.VERIFY_BUTTON}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={!owner || !repoName || !token || isVerifying}
        />
      ) : isEditMode && !isVerified && (hasOwnerOrRepoChanged || token) ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={GITHUB_LABELS.VERIFY_BUTTON}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={!owner || !repoName || !token || isVerifying}
        />
      ) : (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleSaveAndConnect}
          primaryLabel={isEditMode ? 'Save Changes' : 'Save & Connect'}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isSaving}
          isPrimaryDisabled={isSaving || (!isEditMode && !isVerified)}
        />
      )}

      {/* Features List */}
      <Box
        p="md"
        style={{
          backgroundColor: theme.colors.brand[0],
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.brand[2]}`,
        }}
      >
        <Text size="sm" fw={600} c={theme.colors.brand[8]} mb="sm">
          What you'll get:
        </Text>
        <List
          size="sm"
          spacing="xs"
          icon={
            <ThemeIcon size={16} radius="xl" variant="light" color="brand">
              <IconCheck size={10} />
            </ThemeIcon>
          }
        >
          <List.Item><Text size="sm" c={theme.colors.brand[7]}>Create and manage release branches</Text></List.Item>
          <List.Item><Text size="sm" c={theme.colors.brand[7]}>Trigger GitHub Actions workflows</Text></List.Item>
          <List.Item><Text size="sm" c={theme.colors.brand[7]}>Auto-generate release notes</Text></List.Item>
          <List.Item><Text size="sm" c={theme.colors.brand[7]}>Manage tags and releases</Text></List.Item>
        </List>
      </Box>
    </Stack>
  );
}
