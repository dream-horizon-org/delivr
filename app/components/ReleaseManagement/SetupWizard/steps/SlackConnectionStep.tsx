/**
 * Slack Connection Step UI Component
 * Allows users to connect their Slack workspace for release notifications
 */

import { useState } from 'react';
import { TextInput, MultiSelect, Alert, Loader } from '@mantine/core';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import { WizardStep } from '~/components/ReleaseManagement/SetupWizard/components';

interface SlackConnectionData {
  botToken: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  selectedChannels: string[];
  isVerified: boolean;
}

interface SlackConnectionStepProps {
  tenantId: string;
  initialData?: Partial<SlackConnectionData>;
  onComplete: () => void;
  hasSlackIntegration?: boolean;
}

export function SlackConnectionStep({ tenantId, initialData, onComplete, hasSlackIntegration }: SlackConnectionStepProps) {
  const [botToken, setBotToken] = useState(initialData?.botToken || '');
  const [workspaceId, setWorkspaceId] = useState(initialData?.workspaceId || '');
  const [workspaceName, setWorkspaceName] = useState(initialData?.workspaceName || '');
  const [botUserId, setBotUserId] = useState(initialData?.botUserId || '');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialData?.selectedChannels || []);
  const [isVerified, setIsVerified] = useState(initialData?.isVerified || false);
  const [isSaved, setIsSaved] = useState(hasSlackIntegration || false);
  
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState<string>('');
  
  const [channelsStatus, setChannelsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [availableChannels, setAvailableChannels] = useState<Array<{ value: string; label: string }>>([]);
  const [channelsError, setChannelsError] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);

  // If already has integration, mark as saved so "Next" is enabled
  // This allows skipping this optional step

  const handleVerify = async () => {
    if (!botToken) {
      setVerificationError('Please enter a bot token');
      return;
    }

    if (!botToken.startsWith('xoxb-')) {
      setVerificationError('Invalid bot token format. Token must start with "xoxb-"');
      return;
    }

    setVerificationStatus('verifying');
    setVerificationError('');

    try {
      const result = await apiPost<{
        success: boolean;
        verified?: boolean;
        workspaceId?: string;
        workspaceName?: string;
        botUserId?: string;
        message?: string;
        error?: string;
      }>(`/api/v1/tenants/${tenantId}/integrations/slack/verify`, { botToken });

      if (result.data?.success && result.data?.verified) {
        setIsVerified(true);
        setVerificationStatus('success');
        setWorkspaceId(result.data.workspaceId || '');
        setWorkspaceName(result.data.workspaceName || '');
        setBotUserId(result.data.botUserId || '');
        
        // Auto-fetch channels after successful verification
        await handleFetchChannels();
      } else {
        setVerificationStatus('error');
        setVerificationError(result.data?.message || result.data?.error || 'Failed to verify token');
        setIsVerified(false);
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to verify token');
      setVerificationStatus('error');
      setVerificationError(errorMessage);
      setIsVerified(false);
    }
  };

  const handleFetchChannels = async () => {
    if (!botToken) {
      setChannelsError('Bot token required');
      return;
    }

    setChannelsStatus('loading');
    setChannelsError('');

    try {
      const result = await apiPost<{
        success: boolean;
        channels?: Array<{ id: string; name: string }>;
        message?: string;
        error?: string;
      }>(`/api/v1/tenants/${tenantId}/integrations/slack/channels`, { botToken });

      if (result.data?.success && result.data?.channels) {
        const channelOptions = result.data.channels.map((channel: { id: string; name: string }) => ({
          value: channel.id,
          label: channel.name,
        }));
        setAvailableChannels(channelOptions);
        setChannelsStatus('success');
      } else {
        setChannelsStatus('error');
        setChannelsError(result.data?.message || result.data?.error || 'Failed to fetch channels');
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to fetch channels');
      setChannelsStatus('error');
      setChannelsError(errorMessage);
    }
  };

  const handleSaveAndNext = async () => {
    if (!isVerified) {
      setVerificationError('Please verify your token first');
      return;
    }

    if (selectedChannels.length === 0) {
      setChannelsError('Please select at least one channel');
      return;
    }

    setIsSaving(true);

    try {
      const channels = selectedChannels.map((channelId: string) => {
        const channel = availableChannels.find((c: { value: string; label: string }) => c.value === channelId);
        return {
          id: channelId,
          name: channel?.label || channelId,
        };
      });

      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/v1/tenants/${tenantId}/integrations/slack`,
        {
          botToken,
          workspaceId,
          workspaceName,
          botUserId,
          channels,
        }
      );

      if (result.data?.success) {
        setIsSaved(true);
        setIsSaving(false);
        
        // Integration saved successfully! User can now click "Next" to proceed
        // or use "Skip" button to move on without configuring Slack
      } else {
        setChannelsError(result.data?.error || 'Failed to save Slack integration');
        setIsSaving(false);
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to save Slack integration');
      setChannelsError(errorMessage);
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping this optional step (no data to save)
    onComplete();
  };

  // If Slack integration already exists, show read-only view
  if (hasSlackIntegration && initialData) {
    return (
      <WizardStep
        title="Connect Slack Workspace"
        description="Your Slack workspace is already connected"
        isRequired={false}
        error={null}
      >
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Slack workspace connected successfully</h3>
                <p className="mt-2 text-sm text-green-700">
                  Your Slack workspace is configured and ready to receive release notifications.
                </p>
              </div>
            </div>
          </div>

          {/* Connection Details Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {/* Slack Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                </div>
              </div>

              {/* Connection Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Workspace Details</h3>
                <dl className="space-y-2">
                  <div className="flex items-center text-sm">
                    <dt className="font-medium text-gray-500 w-32">Workspace:</dt>
                    <dd className="text-gray-900">{initialData.workspaceName || 'N/A'}</dd>
                  </div>
                  <div className="flex items-center text-sm">
                    <dt className="font-medium text-gray-500 w-32">Workspace ID:</dt>
                    <dd className="text-gray-900 font-mono text-xs">{initialData.workspaceId || 'N/A'}</dd>
                  </div>
                  <div className="flex items-center text-sm">
                    <dt className="font-medium text-gray-500 w-32">Channels:</dt>
                    <dd className="text-gray-900">{initialData.selectedChannels?.length || 0} configured</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              ✓ This step is already complete. Use the navigation below to continue.
            </p>
          </div>
        </div>
      </WizardStep>
    );
  }

  // Regular flow for new setup
  return (
    <WizardStep
      title="Connect Slack Workspace"
      description="Connect your Slack workspace to receive release notifications"
      isRequired={false}
      error={verificationStatus === 'error' ? verificationError : null}
    >
      <div className="space-y-6">

      {/* Bot Token Input */}
      <div className="space-y-4">
        <TextInput
          label="Slack Bot Token"
          placeholder="xoxb-..."
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          required
          disabled={isVerified}
          description="Enter your Slack bot token (starts with 'xoxb-')"
          error={verificationStatus === 'error' ? verificationError : undefined}
        />

        {/* Verify Button */}
        {!isVerified && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={!botToken || verificationStatus === 'verifying'}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {verificationStatus === 'verifying' ? (
              <span className="flex items-center gap-2">
                <Loader size="xs" color="white" />
                Verifying...
              </span>
            ) : (
              'Verify Connection'
            )}
          </button>
        )}

        {/* Success Message */}
        {isVerified && verificationStatus === 'success' && (
          <Alert color="green" title="✓ Connection Verified">
            <div className="text-sm">
              <p className="font-medium">Workspace: {workspaceName}</p>
              <p className="text-gray-600">Bot User ID: {botUserId}</p>
            </div>
          </Alert>
        )}
      </div>

      {/* Channel Selection (shown after verification) */}
      {isVerified && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Channels
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Choose which channels should receive release notifications
            </p>

            {channelsStatus === 'loading' ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader size="sm" />
                <span>Loading channels...</span>
              </div>
            ) : channelsStatus === 'success' ? (
              <MultiSelect
                data={availableChannels}
                value={selectedChannels}
                onChange={setSelectedChannels}
                placeholder="Select channels"
                searchable
                nothingFoundMessage="No channels found"
                error={channelsError}
              />
            ) : (
              <button
                type="button"
                onClick={handleFetchChannels}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Load Channels
              </button>
            )}
          </div>

          {/* Save Button */}
          {channelsStatus === 'success' && !isSaved && (
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSaveAndNext}
                disabled={selectedChannels.length === 0 || isSaving}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader size="xs" color="white" />
                    Saving Configuration...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Configuration
                  </>
                )}
              </button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                Save your Slack configuration to enable the Next button
              </p>
            </div>
          )}

          {/* Saved Confirmation */}
          {isSaved && (
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    Slack configuration saved successfully!
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onComplete}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                Continue to Next Step
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

        </div>
      )}

      {/* Skip Option (only if not saved) */}
      {!hasSlackIntegration && !isSaved && (
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Skip Slack Integration (Optional)
          </button>
        </div>
      )}

      {/* How to get token */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How to get your Slack Bot Token</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline font-medium">api.slack.com/apps</a></li>
          <li>Create a new app or select an existing one</li>
          <li>Navigate to "OAuth & Permissions"</li>
          <li>Add these scopes: <code className="bg-blue-100 px-1 rounded">channels:read</code>, <code className="bg-blue-100 px-1 rounded">chat:write</code></li>
          <li>Install app to workspace</li>
          <li>Copy the "Bot User OAuth Token" (starts with <code className="bg-blue-100 px-1 rounded">xoxb-</code>)</li>
        </ol>
      </div>
      </div>
    </WizardStep>
  );
}


