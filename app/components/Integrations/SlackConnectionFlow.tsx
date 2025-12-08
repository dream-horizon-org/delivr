import { Alert, TextInput, Stack, Box, Text, Group, useMantineTheme, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconMessageCircle } from '@tabler/icons-react';
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
  isEditMode?: boolean;
  existingData?: any;
}

export function SlackConnectionFlow({
  onConnect,
  onCancel,
  isEditMode = false,
  existingData
}: SlackConnectionFlowProps) {
  const theme = useMantineTheme();
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
  } = useSlackConnection(existingData, isEditMode);

  const displayWorkspaceInfo = workspaceInfo;

  const handleVerifyToken = async () => {
    const success = await verifyToken(botToken);
    if (!success) {
      return;
    }
  };

  const handleSave = async () => {
    const success = await saveIntegration();
    if (success) {
      onConnect({
        botToken: botToken || '***',
        workspaceInfo: displayWorkspaceInfo,
        channels: []
      });
    }
  };

  return (
    <Stack gap="lg">
      {/* Step 1: Token Input */}
      {step === CONNECTION_STEPS.SLACK_TOKEN && (
        <>
          {isEditMode && displayWorkspaceInfo.workspaceName ? (
            <ConnectionAlert 
              color="green" 
              title="Current Slack Connection"
            >
              <Stack gap="xs">
                <Text size="sm">
                  <Text component="span" fw={600}>Workspace:</Text> {displayWorkspaceInfo.workspaceName}
                </Text>
                {displayWorkspaceInfo.botUserId && (
                  <Text size="sm">
                    <Text component="span" fw={600}>Bot ID:</Text> {displayWorkspaceInfo.botUserId}
                  </Text>
                )}
                <Text size="sm" c={theme.colors.slate[6]} mt="xs">
                  Enter a new bot token below to update the connection, or leave blank to keep the existing token.
                </Text>
              </Stack>
            </ConnectionAlert>
          ) : (
            <ConnectionAlert 
              color="brand" 
              title={SLACK_LABELS.READY_TO_CONNECT}
            >
              <Text size="sm">{SLACK_LABELS.CONNECTION_DESCRIPTION}</Text>
            </ConnectionAlert>
          )}

          <TextInput
            label={isEditMode ? `${SLACK_LABELS.BOT_TOKEN_LABEL} (leave blank to keep existing)` : SLACK_LABELS.BOT_TOKEN_LABEL}
            placeholder={isEditMode ? 'Leave blank to keep existing token' : SLACK_LABELS.BOT_TOKEN_PLACEHOLDER}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            error={error}
            description={isEditMode ? 'Only provide a new token if you want to update it' : SLACK_LABELS.BOT_TOKEN_DESCRIPTION}
            size="sm"
          />

          {/* Instructions */}
          <Box
            p="md"
            style={{
              backgroundColor: theme.colors.slate[0],
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.slate[2]}`,
            }}
          >
            <Text size="sm" fw={600} c={theme.colors.slate[8]} mb="sm">
              {SLACK_LABELS.HOW_TO_GET_TOKEN}
            </Text>
            <Stack gap="xs">
              <Text size="sm" c={theme.colors.slate[6]}>
                1. Go to{' '}
                <Text 
                  component="a" 
                  href="https://api.slack.com/apps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  c="brand"
                  td="underline"
                >
                  api.slack.com/apps
                </Text>
              </Text>
              <Text size="sm" c={theme.colors.slate[6]}>2. Create or select your app</Text>
              <Text size="sm" c={theme.colors.slate[6]}>3. Go to "OAuth & Permissions"</Text>
              <Text size="sm" c={theme.colors.slate[6]}>
                4. Add scopes:{' '}
                <Group gap={4} display="inline-flex">
                  {SLACK_REQUIRED_SCOPES.map((scope) => (
                    <ScopeChip key={scope} scope={scope} />
                  ))}
                </Group>
              </Text>
              <Text size="sm" c={theme.colors.slate[6]}>5. Install app to workspace</Text>
              <Text size="sm" c={theme.colors.slate[6]}>6. Copy the "Bot User OAuth Token"</Text>
            </Stack>
          </Box>

          {isEditMode && displayWorkspaceInfo.workspaceName && !botToken ? (
            <ActionButtons
              onCancel={onCancel}
              onPrimary={handleSave}
              primaryLabel="Save Changes"
              cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
              isPrimaryLoading={isSaving}
              isPrimaryDisabled={isSaving}
            />
          ) : (
            <ActionButtons
              onCancel={onCancel}
              onPrimary={handleVerifyToken}
              primaryLabel={SLACK_LABELS.VERIFY_TOKEN}
              cancelLabel={INTEGRATION_MODAL_LABELS.CANCEL}
              isPrimaryLoading={isVerifying}
              isPrimaryDisabled={!botToken || isVerifying}
            />
          )}
        </>
      )}

      {/* Step 2: Ready to Connect */}
      {step === CONNECTION_STEPS.SLACK_CHANNELS && (
        <>
          <ConnectionAlert 
            color="green" 
            title={isEditMode ? 'Slack Connection' : SLACK_LABELS.TOKEN_VERIFIED}
          >
            <Stack gap="xs">
              {displayWorkspaceInfo.workspaceName && (
                <Text size="sm">
                  <Text component="span" fw={600}>Workspace:</Text> {displayWorkspaceInfo.workspaceName}
                </Text>
              )}
              {displayWorkspaceInfo.botUserId && (
                <Text size="sm">
                  <Text component="span" fw={600}>Bot ID:</Text> {displayWorkspaceInfo.botUserId}
                </Text>
              )}
              <Text size="sm" c={theme.colors.slate[6]} mt="xs">
                {isEditMode 
                  ? 'Token verified! Click "Save Changes" to update the connection.'
                  : SLACK_LABELS.TOKEN_VERIFIED_MESSAGE}
              </Text>
            </Stack>
          </ConnectionAlert>

          <Box
            p="md"
            style={{
              backgroundColor: theme.colors.brand[0],
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.brand[2]}`,
            }}
          >
            <Group gap="sm" mb="xs">
              <ThemeIcon size={24} radius="sm" variant="light" color="brand">
                <IconMessageCircle size={14} />
              </ThemeIcon>
              <Text size="sm" fw={600} c={theme.colors.brand[8]}>
                Channel Configuration
              </Text>
            </Group>
            <Text size="sm" c={theme.colors.brand[7]}>
              {SLACK_LABELS.CHANNEL_CONFIG_MESSAGE}
            </Text>
          </Box>

          {error && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              color="red" 
              title="Error"
              variant="light"
              radius="md"
              withCloseButton
              onClose={() => setBotToken('')}
            >
              {error}
            </Alert>
          )}

          <ActionButtons
            onBack={goBack}
            onPrimary={handleSave}
            primaryLabel={isEditMode ? 'Save Changes' : SLACK_LABELS.CONNECT_SLACK}
            backLabel={INTEGRATION_MODAL_LABELS.BACK}
            isPrimaryLoading={isSaving}
            isPrimaryDisabled={isSaving}
          />
        </>
      )}
    </Stack>
  );
}
