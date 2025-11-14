/**
 * GitHubConnectionStep - Step 1: Connect GitHub repository
 */

import React from 'react';
import { WizardStep, FormField } from '../components';
import { useGitHubConnection } from '../hooks';
import type { GitHubConnection } from '../types';

interface GitHubConnectionStepProps {
  initialData?: GitHubConnection;
  onComplete: (data: GitHubConnection) => void;
}

export function GitHubConnectionStep({ initialData, onComplete }: GitHubConnectionStepProps) {
  const {
    connection,
    isVerifying,
    isSaving,
    error,
    updateField,
    verifyConnection,
    saveConnection,
    isVerified,
  } = useGitHubConnection({
    initialData,
  });
  
  const handleVerify = async () => {
    const success = await verifyConnection();
    if (!success) {
      // Error is already set by the hook
    }
  };
  
  const handleSaveAndNext = async () => {
    const success = await saveConnection();
    if (success) {
      // Integration saved successfully, move to next step
      onComplete(connection as GitHubConnection);
    }
  };
  
  return (
    <WizardStep
      title="Connect GitHub Repository"
      description="Connect your GitHub repository to enable automated builds and releases"
      isRequired
      error={error}
    >
      <div className="space-y-6">
        {/* SCM Type */}
        <FormField
          label="Source Control"
          name="scmType"
          type="select"
          value={connection.scmType || 'GITHUB'}
          onChange={(value) => updateField('scmType', value)}
          options={[
            { value: 'GITHUB', label: 'GitHub' },
            { value: 'GITLAB', label: 'GitLab (Coming Soon)', disabled: true },
            { value: 'BITBUCKET', label: 'Bitbucket (Coming Soon)', disabled: true },
          ]}
          required
          helpText="Select your source control provider"
          disabled={isVerified}
        />
        
        {/* Owner */}
        <FormField
          label="Repository Owner"
          name="owner"
          type="text"
          value={connection.owner || ''}
          onChange={(value) => updateField('owner', value)}
          placeholder="organization or username"
          required
          helpText="The GitHub organization or username that owns the repository"
          disabled={isVerified}
        />
        
        {/* Repository Name */}
        <FormField
          label="Repository Name"
          name="repoName"
          type="text"
          value={connection.repoName || ''}
          onChange={(value) => updateField('repoName', value)}
          placeholder="repository-name"
          required
          helpText="The name of your repository (without the owner)"
          disabled={isVerified}
        />
        
        {/* Personal Access Token */}
        <FormField
          label="Personal Access Token"
          name="token"
          type="password"
          value={connection.token || ''}
          onChange={(value) => updateField('token', value)}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          required
          helpText="Generate a token with 'repo' and 'workflow' permissions from GitHub Settings"
          disabled={isVerified}
        />
        
        {/* Verified Info */}
        {isVerified && connection.owner && connection.repoName && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Repository Connected</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    <strong>Owner:</strong> {connection.owner}
                  </p>
                  <p>
                    <strong>Repository:</strong> {connection.repoName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
        {/* Verify Button */}
        {!isVerified && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={!connection.owner || !connection.repoName || !connection.token || isVerifying}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                'Verify Connection'
              )}
            </button>
          )}
          
          {/* Save & Next Button */}
          {isVerified && (
            <button
              type="button"
              onClick={handleSaveAndNext}
              disabled={isSaving}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  Save & Next
                  <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          )}
          </div>
        
        {/* How to get token */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How to generate a token?</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to GitHub → Settings → Developer settings → Personal access tokens</li>
            <li>Click "Generate new token" (classic)</li>
            <li>Select scopes: <code className="bg-blue-100 px-1 rounded">repo</code> and <code className="bg-blue-100 px-1 rounded">workflow</code></li>
            <li>Generate and copy the token</li>
          </ol>
        </div>
      </div>
    </WizardStep>
  );
}

