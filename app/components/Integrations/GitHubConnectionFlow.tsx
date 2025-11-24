import { useState } from 'react';
import { TextInput, Alert, PasswordInput, Select } from '@mantine/core';
import { useParams } from '@remix-run/react';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import { SCM_TYPES } from '~/constants/integrations';
import { GITHUB_LABELS, ALERT_MESSAGES, INTEGRATION_MODAL_LABELS } from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';

interface GitHubConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
  isEditMode?: boolean;
  existingData?: any;
}

export function GitHubConnectionFlow({
  onConnect,
  onCancel,
  isEditMode = false,
  existingData
}: GitHubConnectionFlowProps) {
  const { org } = useParams();
  const [scmType, setScmType] = useState(existingData?.scmType || SCM_TYPES.GITHUB);
  const [owner, setOwner] = useState(existingData?.owner || '');
  const [repoName, setRepoName] = useState(existingData?.repoName || '');
  const [token, setToken] = useState(existingData?.accessToken || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerified, setIsVerified] = useState(!!existingData?.isVerified);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!owner || !repoName || !token) {
      setError('Owner, repository name, and access token are required');
      return;
    }

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
    }
  };

  const handleSaveAndConnect = async () => {
    if (!isVerified) {
      setError('Please verify the connection before saving');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await apiPost<{ integration: any }>(
        `/api/v1/tenants/${org}/integrations/scm`,
        {
          scmType,
          owner,
          repo: repoName,
          accessToken: token,
          displayName: `${owner}/${repoName}`,
        }
      );

      if (result.success && result.data?.integration) {
        // Pass the saved data back
        onConnect({
          scmType,
          owner,
          repoName,
          token,
          repoUrl: `https://github.com/${owner}/${repoName}`,
          isVerified: true,
        });
      } else {
        setError('Failed to save integration');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save connection'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert color="red" title="Error" onClose={() => setError(null)} withCloseButton>
          {error}
        </Alert>
      )}

      {isVerified && (
        <ConnectionAlert color="green" title={GITHUB_LABELS.REPO_VERIFIED} icon={<span>✓</span>}>
          Connection verified! Click &quot;Save & Connect&quot; to complete the setup.
        </ConnectionAlert>
      )}

      {/* SCM Type */}
      <Select
        label="Source Control"
        placeholder="Select provider"
        value={scmType}
        onChange={(value) => setScmType(value || SCM_TYPES.GITHUB)}
        data={[
          { value: SCM_TYPES.GITHUB, label: 'GitHub' },
          { value: SCM_TYPES.GITLAB, label: 'GitLab (Coming Soon)', disabled: true },
          { value: SCM_TYPES.BITBUCKET, label: 'Bitbucket (Coming Soon)', disabled: true },
        ]}
        required
        disabled={isVerified}
        description="Select your source control provider"
      />

      {/* Repository Owner */}
      <TextInput
        label="Repository Owner"
        placeholder="organization or username"
        value={owner}
        onChange={(e) => {
          setOwner(e.currentTarget.value);
          setIsVerified(false);
          setError(null);
        }}
        required
        disabled={isVerified}
        description="The GitHub organization or username that owns the repository"
      />

      {/* Repository Name */}
      <TextInput
        label="Repository Name"
        placeholder="repository-name"
        value={repoName}
        onChange={(e) => {
          setRepoName(e.currentTarget.value);
          setIsVerified(false);
          setError(null);
        }}
        required
        disabled={isVerified}
        description="The name of your repository (without the owner)"
      />

      {/* Personal Access Token */}
      <PasswordInput
        label={GITHUB_LABELS.ACCESS_TOKEN_LABEL}
        placeholder={GITHUB_LABELS.ACCESS_TOKEN_PLACEHOLDER}
        value={token}
        onChange={(e) => {
          setToken(e.currentTarget.value);
          setIsVerified(false);
          setError(null);
        }}
        required
        disabled={isVerified}
        description={
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
      {!isVerified ? (
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
          isPrimaryDisabled={isSaving}
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
