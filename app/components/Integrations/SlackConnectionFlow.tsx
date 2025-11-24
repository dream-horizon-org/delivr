import { Alert, TextInput } from '@mantine/core';
import { useSlackConnection } from '~/hooks/useSlackConnection';
import { 
  SLACK_LABELS, 
  SLACK_REQUIRED_SCOPES, 
  INTEGRATION_MODAL_LABELS,
  CONNECTION_STEPS 
} from '~/constants/integration-ui';
import { ActionButtons } from './shared/ActionButtons';
import { ConnectionAlert } from './shared/ConnectionAlert';
import { InstructionsPanel } from './shared/InstructionsPanel';
import { ScopeChip } from './shared/ScopeChip';

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
        {step === CONNECTION_STEPS.SLACK_TOKEN && (
          <>
            <ConnectionAlert 
              color="blue" 
              title={SLACK_LABELS.READY_TO_CONNECT} 
              icon={<span>✓</span>}
            >
              {SLACK_LABELS.CONNECTION_DESCRIPTION}
            </ConnectionAlert>

            <TextInput
              label={SLACK_LABELS.BOT_TOKEN_LABEL}
              placeholder={SLACK_LABELS.BOT_TOKEN_PLACEHOLDER}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              error={error}
              description={SLACK_LABELS.BOT_TOKEN_DESCRIPTION}
            />

            {/* How to get token */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <h3 className="font-medium text-gray-900 mb-2">{SLACK_LABELS.HOW_TO_GET_TOKEN}</h3>
              <ol className="text-gray-600 space-y-1 list-decimal list-inside">
                <li>
                  {SLACK_LABELS.INSTRUCTIONS[0].text}
                  <a 
                    href={SLACK_LABELS.INSTRUCTIONS[0].link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 underline"
                  >
                    {SLACK_LABELS.INSTRUCTIONS[0].linkText}
                  </a>
                </li>
                <li>{SLACK_LABELS.INSTRUCTIONS[1]}</li>
                <li>{SLACK_LABELS.INSTRUCTIONS[2]}</li>
                <li>
                  {SLACK_LABELS.INSTRUCTIONS[3]}{' '}
                  {SLACK_REQUIRED_SCOPES.map((scope, idx) => (
                    <span key={scope}>
                      <ScopeChip scope={scope} />
                      {idx < SLACK_REQUIRED_SCOPES.length - 1 && ', '}
                    </span>
                  ))}
                </li>
                <li>{SLACK_LABELS.INSTRUCTIONS[4]}</li>
                <li>{SLACK_LABELS.INSTRUCTIONS[5]}</li>
              </ol>
            </div>

            <ActionButtons
              onCancel={onCancel}
              onPrimary={handleVerifyToken}
              primaryLabel={SLACK_LABELS.VERIFY_TOKEN}
              cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
              isPrimaryLoading={isVerifying}
              isPrimaryDisabled={!botToken || isVerifying}
            />
          </>
        )}

        {/* Step 2: Ready to Connect */}
        {step === CONNECTION_STEPS.SLACK_CHANNELS && (
          <>
            <ConnectionAlert color="green" title={SLACK_LABELS.TOKEN_VERIFIED}>
              <div className="text-sm">
                <p><strong>{SLACK_LABELS.WORKSPACE_LABEL}</strong> {workspaceInfo.workspaceName}</p>
                <p><strong>{SLACK_LABELS.BOT_ID_LABEL}</strong> {workspaceInfo.botUserId}</p>
                <p className="mt-2 text-gray-600">
                  {SLACK_LABELS.TOKEN_VERIFIED_MESSAGE}
                </p>
              </div>
            </ConnectionAlert>

            <div className="bg-blue-50 rounded-lg p-4 text-sm border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">{SLACK_LABELS.CHANNEL_CONFIG_TITLE}</h3>
              <p className="text-blue-800">
                {SLACK_LABELS.CHANNEL_CONFIG_MESSAGE}
              </p>
              </div>

            {error && (
              <Alert color="red">
                {error}
              </Alert>
            )}

            <ActionButtons
              onBack={goBack}
              onPrimary={handleSave}
              primaryLabel={SLACK_LABELS.CONNECT_SLACK}
              backLabel={INTEGRATION_MODAL_LABELS.BACK}
              isPrimaryLoading={isSaving}
              isPrimaryDisabled={isSaving}
            />
          </>
        )}
      </div>
  );
}
