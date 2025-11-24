/**
 * Custom Hook: Slack Connection
 * Handles the Slack integration setup:
 * 1. Verify bot token
 * 2. Save integration (without channel selection)
 * 
 * Note: Channel configuration is done separately in Release Config
 */

import { useState, useCallback } from 'react';
import { useParams } from '@remix-run/react';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import { CONNECTION_STEPS } from '~/constants/integration-ui';

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackWorkspaceInfo {
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
}

export interface SlackConnectionData {
  botToken: string;
  workspaceInfo: SlackWorkspaceInfo;
  channels: SlackChannel[];
}

export function useSlackConnection() {
  const { org } = useParams();
  const tenantId = org!;

  const [botToken, setBotToken] = useState('');
  const [workspaceInfo, setWorkspaceInfo] = useState<SlackWorkspaceInfo>({});
  
  const [step, setStep] = useState<typeof CONNECTION_STEPS.SLACK_TOKEN | typeof CONNECTION_STEPS.SLACK_CHANNELS>(CONNECTION_STEPS.SLACK_TOKEN);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Step 1: Verify Slack bot token
   */
  const verifyToken = useCallback(async (token: string): Promise<boolean> => {
    if (!token) {
      setError('Please enter a bot token');
      return false;
    }

    if (!token.startsWith('xoxb-')) {
      setError('Invalid bot token format. Must start with "xoxb-"');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await apiPost<{
        verified: boolean;
        workspaceId: string;
        workspaceName: string;
        botUserId: string;
      }>(
        `/api/v1/tenants/${tenantId}/integrations/slack/verify`,
        { botToken: token }
      );

      if (!result.data?.verified) {
        setError('Failed to verify token');
        setIsVerifying(false);
        return false;
      }

      // Store workspace info
      setWorkspaceInfo({
        workspaceId: result.data.workspaceId,
        workspaceName: result.data.workspaceName,
        botUserId: result.data.botUserId
      });

      setBotToken(token);
      setIsVerifying(false);

      // Move to next step - user will click "Connect" to save
      setStep(CONNECTION_STEPS.SLACK_CHANNELS); // Keep this for UI flow, but we won't show channel selection

      return true;
    } catch (error) {
      setError(getApiErrorMessage(error, 'Failed to verify token'));
      setIsVerifying(false);
      return false;
    }
  }, [tenantId]);

  /**
   * Step 2.5: Save Slack integration WITHOUT channel selection
   * (Channel selection now happens in Release Config)
   */
  const saveIntegrationWithoutChannels = useCallback(async (
    token: string,
    workspace: SlackWorkspaceInfo
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      await apiPost(
        `/api/v1/tenants/${tenantId}/integrations/slack`,
        {
          botToken: token,
          botUserId: workspace.botUserId,
          workspaceId: workspace.workspaceId,
          workspaceName: workspace.workspaceName
          // No channels array - channels selected in Release Config
        }
      );

      setIsSaving(false);
      return true;
    } catch (error) {
      setError(getApiErrorMessage(error, 'Failed to save integration'));
      setIsSaving(false);
      return false;
    }
  }, [tenantId]);

  /**
   * Step 3: Save Slack integration (without channel selection)
   */
  const saveIntegration = useCallback(async (): Promise<boolean> => {
    // Validate we have the required info
    if (!botToken || !workspaceInfo.workspaceId) {
      setError('Token not verified. Please verify your token first.');
      return false;
    }

    return await saveIntegrationWithoutChannels(botToken, workspaceInfo);
  }, [botToken, workspaceInfo, saveIntegrationWithoutChannels]);

  /**
   * Reset the form
   */
  const reset = useCallback(() => {
    setBotToken('');
    setWorkspaceInfo({});
    setStep(CONNECTION_STEPS.SLACK_TOKEN);
    setError(null);
  }, []);

  /**
   * Go back to token step
   */
  const goBack = useCallback(() => {
    setStep(CONNECTION_STEPS.SLACK_TOKEN);
    setError(null);
  }, []);

  return {
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
    reset,
    goBack
  };
}



