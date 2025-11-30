import { useState, useRef } from 'react';
import { TextInput, Alert, PasswordInput, Select } from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useParams } from '@remix-run/react';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { SCM_TYPES } from '~/constants/integrations';
import { GITHUB_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';

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
  token: string; // Will be excluded from draft storage
}

export function GitHubConnectionFlow({
  onConnect,
  onCancel,
  isEditMode = false,
  existingData
}: GitHubConnectionFlowProps) {
  const { org } = useParams();
  
  // Ref to track if we're in the middle of verify/connect flow
  const isInFlowRef = useRef(false);

  // Draft storage with auto-save
  // In edit mode, prioritize existingData over draft
  const { formData, setFormData, isDraftRestored, markSaveSuccessful } = useDraftStorage<GitHubConnectionFormData>(
    {
      storageKey: generateStorageKey('github-scm', org || ''),
      sensitiveFields: ['token'], // Never save token to draft
      // Only save draft if NOT in verify/connect flow, NOT in edit mode, and has some data
      shouldSaveDraft: (data) => !isInFlowRef.current && !isEditMode && !!(data.owner || data.repoName),
    },
    {
      scmType: existingData?.scmType || existingData?.providerType || SCM_TYPES.GITHUB,
      owner: existingData?.owner || '',
      repoName: existingData?.repo || existingData?.repoName || '',
      token: '', // Never prefill tokens
    },
    isEditMode ? {
      scmType: existingData?.scmType || existingData?.providerType || SCM_TYPES.GITHUB,
      owner: existingData?.owner || '',
      repoName: existingData?.repo || existingData?.repoName || '',
      token: '', // Never prefill tokens
    } : undefined
  );

  // Extract form data
  const { scmType, owner, repoName, token } = formData;

  // State for UI
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(!!existingData?.isVerified || isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Check if owner or repo changed in edit mode
  const hasOwnerOrRepoChanged = isEditMode && (
    owner !== (existingData?.owner || '') ||
    repoName !== (existingData?.repo || existingData?.repoName || '')
  );

  const handleVerify = async () => {
    if (!owner || !repoName || !token) {
      setError('Owner, repository name, and access token are required');
      return;
    }

    isInFlowRef.current = true; // Prevent auto-save during verify
    setIsVerifying(true);
    setError(null);

    try {
      const result = await apiPost(
        `/api/v1/tenants/${org}/integrations/scm/verify`,
        {
          scmType,
          owner,
          repo: repoName,
          accessToken: token,
        }
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
      isInFlowRef.current = false; // Re-enable auto-save
    }
  };

  const handleSaveAndConnect = async () => {
    if (!isEditMode && !isVerified) {
      setError('Please verify the connection before saving');
      return;
    }

    // In edit mode, if owner or repo changed, we need token to verify
    if (isEditMode && hasOwnerOrRepoChanged && !token) {
      setError('Access token is required when changing repository owner or name. Please verify first.');
      setIsSaving(false);
      return;
    }

    // In edit mode, if owner/repo changed but not verified yet, require verification
    if (isEditMode && hasOwnerOrRepoChanged && !isVerified) {
      setError('Please verify the connection before saving changes');
      setIsSaving(false);
      return;
    }

    isInFlowRef.current = true; // Prevent auto-save during save
    setIsSaving(true);
    setError(null);

    try {
      const payload: any = {
        scmType,
        owner,
        repo: repoName,
        displayName: `${owner}/${repoName}`,
      };

      // Only include accessToken if provided (required for create, optional for update)
      if (token) {
        payload.accessToken = token;
      } else if (!isEditMode) {
        setError('Access token is required');
        setIsSaving(false);
        return;
      }

      let result;
      if (isEditMode && existingData?.id) {
        // Use PATCH for updates
        payload.integrationId = existingData.id;
        result = await apiPatch<{ integration: any }>(
          `/api/v1/tenants/${org}/integrations/scm`,
          payload
        );
      } else {
        // Use POST for creates
        result = await apiPost<{ integration: any }>(
          `/api/v1/tenants/${org}/integrations/scm`,
          payload
        );
      }

      if (result.success && result.data?.integration) {
        // Mark save as successful to clear draft
        markSaveSuccessful();
        
        // Pass the saved data back
        onConnect({
          scmType,
          owner,
          repoName,
          token: token || '***', // Don't expose token
          repoUrl: `https://github.com/${owner}/${repoName}`,
          isVerified: true,
        });
      } else {
        setError('Failed to save integration');
        isInFlowRef.current = false; // Re-enable auto-save on error
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save connection'));
      isInFlowRef.current = false; // Re-enable auto-save on error
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Draft Restored Alert */}
      {isDraftRestored && !isEditMode && (
        <Alert icon={<IconCheck size={16} />} color="blue" title="Draft Restored">
          Your previously entered data has been restored. Note: Sensitive credentials (like tokens) are never saved for security.
        </Alert>
      )}

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

      {isVerified && !isEditMode && (
        <ConnectionAlert color="green" title={GITHUB_LABELS.REPO_VERIFIED} icon={<span>✓</span>}>
          Connection verified! Click &quot;Save & Connect&quot; to complete the setup.
        </ConnectionAlert>
      )}

      {isEditMode && hasOwnerOrRepoChanged && !token && (
        <ConnectionAlert color="yellow" title="Repository Changed" icon={<span>⚠</span>}>
          You&apos;ve changed the repository owner or name. Please provide an access token to verify the new repository.
        </ConnectionAlert>
      )}

      {/* SCM Type */}
      <Select
        label="Source Control"
        placeholder="Select provider"
        value={scmType}
        onChange={(value) => {
          setFormData({ ...formData, scmType: value || SCM_TYPES.GITHUB });
          if (isEditMode) {
            setIsVerified(false);
          }
        }}
        data={[
          { value: SCM_TYPES.GITHUB, label: 'GitHub' },
          { value: SCM_TYPES.GITLAB, label: 'GitLab (Coming Soon)', disabled: true },
          { value: SCM_TYPES.BITBUCKET, label: 'Bitbucket (Coming Soon)', disabled: true },
        ]}
        required
        disabled={!isEditMode && isVerified}
        description="Select your source control provider"
      />

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
        description="The GitHub organization or username that owns the repository"
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
        description="The name of your repository (without the owner)"
      />

      {/* Personal Access Token */}
      <PasswordInput
        label={isEditMode ? `${GITHUB_LABELS.ACCESS_TOKEN_LABEL} (leave blank to keep existing)` : GITHUB_LABELS.ACCESS_TOKEN_LABEL}
        placeholder={isEditMode ? 'Leave blank to keep existing token' : GITHUB_LABELS.ACCESS_TOKEN_PLACEHOLDER}
        value={token}
        onChange={(e) => {
          setFormData({ ...formData, token: e.currentTarget.value });
          setIsVerified(false);
          setError(null);
        }}
        required={!isEditMode}
        disabled={!isEditMode && isVerified}
        description={
          isEditMode ? (
            <span>Only provide a new token if you want to update it</span>
          ) : (
            <span>
              Create a token at{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                github.com/settings/tokens
              </a>
              {' '}with &apos;repo&apos; scope
            </span>
          )
        }
      />

      {/* Repository URL Preview */}
      {owner && repoName && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600 mb-1">Repository URL:</p>
          <a
            href={`https://github.com/${owner}/${repoName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            https://github.com/{owner}/{repoName}
          </a>
        </div>
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
          primaryClassName="bg-gray-600 hover:bg-gray-700"
        />
      ) : isEditMode && hasOwnerOrRepoChanged && !token ? (
        <ActionButtons
          onCancel={onCancel}
          onPrimary={handleVerify}
          primaryLabel={GITHUB_LABELS.VERIFY_BUTTON}
          cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
          isPrimaryLoading={isVerifying}
          isPrimaryDisabled={!owner || !repoName || !token || isVerifying}
          primaryClassName="bg-gray-600 hover:bg-gray-700"
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

      {/* Help Text */}
      <div className="bg-blue-50 rounded-lg p-4 mt-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">What you&apos;ll get:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Create and manage release branches</li>
          <li>Trigger GitHub Actions workflows</li>
          <li>Auto-generate release notes</li>
          <li>Manage tags and releases</li>
          <li>Real-time webhook updates</li>
        </ul>
      </div>
    </div>
  );
}
