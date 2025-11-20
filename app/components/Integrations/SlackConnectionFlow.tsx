import { Button, Group, Alert, TextInput, Loader } from '@mantine/core';
import { useSlackConnection } from '~/hooks/useSlackConnection';

interface SlackConnectionFlowProps {
  onConnect: (data: any) => void;
  onCancel: () => void;
}

export function SlackConnectionFlow({
  onConnect,
  onCancel
}: SlackConnectionFlowProps) {
  const {
    // State
    botToken,
    workspaceInfo,
    step,
    error,
    
    // Loading states
    isVerifying,
    isSaving,
    
    // Actions
    setBotToken,
    verifyToken,
    saveIntegration,
    goBack
  } = useSlackConnection();

  const handleVerifyToken = async () => {
    const success = await verifyToken(botToken);
    if (!success) {
      // Error is already set by the hook
      return;
    }
  };

  const handleSave = async () => {
    const success = await saveIntegration();
    if (success) {
      // Call parent onConnect with the saved data (no channels - configured in Release Config)
      onConnect({
        botToken,
        workspaceInfo,
        channels: [] // Channels will be configured in Release Config
      });
    }
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

        {/* Step 2: Ready to Connect */}
        {step === 'channels' && (
          <>
            <Alert color="green" title="✓ Token Verified Successfully">
              <div className="text-sm">
                <p><strong>Workspace:</strong> {workspaceInfo.workspaceName}</p>
                <p><strong>Bot ID:</strong> {workspaceInfo.botUserId}</p>
                <p className="mt-2 text-gray-600">
                  Your Slack bot token has been verified. Click "Connect" below to save the integration.
                </p>
              </div>
            </Alert>

            <div className="bg-blue-50 rounded-lg p-4 text-sm border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">📢 Channel Configuration</h3>
              <p className="text-blue-800">
                Channel selection will be done later in <strong>Release Configuration</strong> when you set up your release workflow.
              </p>
            </div>

            {error && (
              <Alert color="red">
                {error}
              </Alert>
            )}

            <Group justify="flex-end" className="mt-6">
              <Button variant="subtle" onClick={goBack}>
                Back
              </Button>
              <Button
                onClick={handleSave}
                loading={isSaving}
                disabled={isSaving}
              >
                Connect Slack
              </Button>
            </Group>
          </>
        )}
      </div>
  );
}

