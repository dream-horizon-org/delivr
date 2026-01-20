import { Button, Group, Alert, TextInput, MultiSelect, Loader } from '@mantine/core';
import { useState } from 'react';

interface SlackConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
}

export function SlackConnectionFlow({
  onConnect,
  onCancel
}: SlackConnectionFlowProps) {
  const [botToken, setBotToken] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [availableChannels, setAvailableChannels] = useState<Array<{ value: string; label: string }>>([]);
  
  const [step, setStep] = useState<'token' | 'channels'>('token');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [workspaceInfo, setWorkspaceInfo] = useState<{
    workspaceId?: string;
    workspaceName?: string;
    botUserId?: string;
  }>({});

  const handleVerifyToken = async () => {
    if (!botToken) {
      setError('Please enter a bot token');
      return;
    }

    if (!botToken.startsWith('xoxb-')) {
      setError('Invalid bot token format. Must start with "xoxb-"');
      return;
    }

    setIsVerifying(true);
    setError('');

    // TODO: YOU WILL IMPLEMENT THIS
    // Example:
    // const result = await slackService.verifyToken({ botToken, tenantId, userId });
    
    // MOCK - Replace with actual API call
    setTimeout(() => {
      setIsVerifying(false);
      setWorkspaceInfo({
        workspaceId: 'T01234',
        workspaceName: 'Acme Corp',
        botUserId: 'U01234'
      });
      setStep('channels');
      handleLoadChannels();
    }, 1500);
  };

  const handleLoadChannels = async () => {
    setIsLoadingChannels(true);
    setError('');

    // TODO: YOU WILL IMPLEMENT THIS
    // Example:
    // const result = await slackService.fetchChannels({ botToken, tenantId, userId });
    
    // MOCK - Replace with actual API call
    setTimeout(() => {
      setIsLoadingChannels(false);
      setAvailableChannels([
        { value: 'C01', label: 'general' },
        { value: 'C02', label: 'releases' },
        { value: 'C03', label: 'notifications' },
        { value: 'C04', label: 'engineering' },
      ]);
    }, 1000);
  };

  const handleSave = async () => {
    if (selectedChannels.length === 0) {
      setError('Please select at least one channel');
      return;
    }

    setIsSaving(true);
    setError('');

    // TODO: YOU WILL IMPLEMENT THIS
    // Example:
    // const result = await slackService.createOrUpdateIntegration({
    //   tenantId,
    //   botToken,
    //   workspaceId: workspaceInfo.workspaceId,
    //   workspaceName: workspaceInfo.workspaceName,
    //   botUserId: workspaceInfo.botUserId,
    //   channels: selectedChannels.map(id => ({
    //     id,
    //     name: availableChannels.find(c => c.value === id)?.label || ''
    //   })),
    //   userId
    // });

    setTimeout(() => {
      setIsSaving(false);
      onConnect({
        botToken,
        ...workspaceInfo,
        channels: selectedChannels.map(id => ({
          id,
          name: availableChannels.find(c => c.value === id)?.label || ''
        }))
      });
    }, 1000);
  };

  return (
    <div className="space-y-4">
        {/* Step 1: Token Input */}
        {step === 'token' && (
          <>
            <Alert color="blue" title="Ready to Connect" icon={<span>✓</span>}>
              Connect your Slack workspace to receive release notifications and updates.
            </Alert>

            <TextInput
              label="Slack Bot Token"
              placeholder="xoxb-..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              error={error}
              description="Enter your Slack bot token (starts with 'xoxb-')"
            />

            {/* How to get token */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <h3 className="font-medium text-gray-900 mb-2">How to get your Bot Token:</h3>
              <ol className="text-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">api.slack.com/apps</a></li>
                <li>Create or select your app</li>
                <li>Go to "OAuth & Permissions"</li>
                <li>Add scopes: <code className="bg-gray-200 px-1 rounded text-xs">channels:read</code>, <code className="bg-gray-200 px-1 rounded text-xs">chat:write</code></li>
                <li>Install app to workspace</li>
                <li>Copy the "Bot User OAuth Token"</li>
              </ol>
            </div>

            <Group justify="flex-end" className="mt-6">
              <Button variant="subtle" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleVerifyToken}
                loading={isVerifying}
                disabled={!botToken || isVerifying}
              >
                Verify Token
              </Button>
            </Group>
          </>
        )}

        {/* Step 2: Channel Selection */}
        {step === 'channels' && (
          <>
            <Alert color="green" title="✓ Token Verified">
              <div className="text-sm">
                <p><strong>Workspace:</strong> {workspaceInfo.workspaceName}</p>
                <p><strong>Bot ID:</strong> {workspaceInfo.botUserId}</p>
              </div>
            </Alert>

            {isLoadingChannels ? (
              <div className="flex items-center gap-2 text-gray-600 py-4">
                <Loader size="sm" />
                <span>Loading channels...</span>
              </div>
            ) : (
              <>
                <MultiSelect
                  label="Select Channels"
                  description="Choose which channels should receive release notifications"
                  placeholder="Select channels"
                  data={availableChannels}
                  value={selectedChannels}
                  onChange={setSelectedChannels}
                  searchable
                  error={error}
                />

                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <h3 className="font-medium text-gray-900 mb-2">What you'll get:</h3>
                  <ul className="text-gray-600 space-y-1 list-disc list-inside">
                    <li>Release creation notifications</li>
                    <li>Build status updates</li>
                    <li>Cherry-pick approvals</li>
                    <li>Deployment summaries</li>
                  </ul>
                </div>
              </>
            )}

            <Group justify="flex-end" className="mt-6">
              <Button variant="subtle" onClick={() => setStep('token')}>
                Back
              </Button>
              <Button
                onClick={handleSave}
                loading={isSaving}
                disabled={selectedChannels.length === 0 || isLoadingChannels || isSaving}
              >
                Connect Slack
              </Button>
            </Group>
          </>
        )}
      </div>
  );
}

