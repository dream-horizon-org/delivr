import { useState } from 'react';
import { Button, TextInput, Group, Alert, Loader, PasswordInput, Select } from '@mantine/core';
import { useParams } from '@remix-run/react';

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
  const [scmType, setScmType] = useState(existingData?.scmType || 'GITHUB');
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
      console.log('[GitHubConnectionFlow] Calling verify endpoint');
      
      const response = await fetch(`/api/v1/tenants/${org}/integrations/scm/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scmType,
          owner,
          repo: repoName,
          accessToken: token,
        }),
      });

      const result = await response.json();
      console.log('[GitHubConnectionFlow] Verification result:', result);

      if (result.success) {
        setIsVerified(true);
        setError(null);
      } else {
        setError(result.error || result.message || 'Verification failed');
        setIsVerified(false);
      }
    } catch (err) {
      console.error('[GitHubConnectionFlow] Verification error:', err);
      setError('Failed to verify connection. Please try again.');
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
      console.log('[GitHubConnectionFlow] Calling save endpoint');
      
      const response = await fetch(`/api/v1/tenants/${org}/integrations/scm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scmType,
          owner,
          repo: repoName,
          accessToken: token,
          displayName: `${owner}/${repoName}`,
        }),
      });

      const result = await response.json();
      console.log('[GitHubConnectionFlow] Save result:', result);

      if (response.ok && result.integration) {
        console.log(`[GitHubConnectionFlow] Successfully saved integration with ID: ${result.integration.id}`);
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
        setError(result.error || 'Failed to save integration');
      }
    } catch (err) {
      console.error('[GitHubConnectionFlow] Save error:', err);
      setError('Failed to save connection. Please try again.');
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
        <Alert color="green" title="Verification Successful" icon={<span>✓</span>}>
          Connection verified! Click "Save & Connect" to complete the setup.
        </Alert>
      )}

      {/* SCM Type */}
      <Select
        label="Source Control"
        placeholder="Select provider"
        value={scmType}
        onChange={(value) => setScmType(value || 'GITHUB')}
        data={[
          { value: 'GITHUB', label: 'GitHub' },
          { value: 'GITLAB', label: 'GitLab (Coming Soon)', disabled: true },
          { value: 'BITBUCKET', label: 'Bitbucket (Coming Soon)', disabled: true },
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
        label="Personal Access Token"
        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
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
            {' '}with 'repo' scope
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
      <Group justify="flex-end" className="mt-6">
        <Button variant="subtle" onClick={onCancel} disabled={isVerifying || isSaving}>
          Cancel
        </Button>
        
        {!isVerified && (
          <Button
            onClick={handleVerify}
            disabled={!owner || !repoName || !token || isVerifying}
            className="bg-gray-600 hover:bg-gray-700"
          >
            {isVerifying ? (
              <>
                <Loader size="xs" className="mr-2" />
                Verifying...
              </>
            ) : (
              'Verify Connection'
            )}
          </Button>
        )}
        
        {isVerified && (
          <Button
            onClick={handleSaveAndConnect}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader size="xs" className="mr-2" />
                Saving...
              </>
            ) : (
              isEditMode ? 'Save Changes' : 'Save & Connect'
            )}
          </Button>
        )}
      </Group>

      {/* Help Text */}
      <div className="bg-blue-50 rounded-lg p-4 mt-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">What you'll get:</h3>
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

