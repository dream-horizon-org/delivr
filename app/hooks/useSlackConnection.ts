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
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
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

export function useSlackConnection(existingData?: any, isEditMode: boolean = false) {
  const { org } = useParams();
  const tenantId = org!;

  // Initialize workspace info from existing data in edit mode
  const initialWorkspaceInfo: SlackWorkspaceInfo = isEditMode && existingData ? {
    workspaceId: existingData.workspaceId || existingData.config?.workspaceId || '',
    workspaceName: existingData.workspaceName || existingData.config?.workspaceName || '',
    botUserId: existingData.botUserId || existingData.config?.botUserId || '',
  } : {};

  const [botToken, setBotToken] = useState(''); // Always empty for security
  const [workspaceInfo, setWorkspaceInfo] = useState<SlackWorkspaceInfo>(initialWorkspaceInfo);
  
  // Always start at token step to allow token updates in edit mode
  // User can verify token and move to next step, or save without changing token
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
    token: string | null,
    workspace: SlackWorkspaceInfo,
    isUpdate: boolean = false
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const payload: any = {
        botUserId: workspace.botUserId,
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName
        // No channels array - channels selected in Release Config
      };

      // Only include botToken if provided (required for create, optional for update)
      if (token) {
        payload.botToken = token;
      }

      if (isUpdate) {
        // Use PATCH for updates
        await apiPatch(
          `/api/v1/tenants/${tenantId}/integrations/slack`,
          payload
        );
      } else {
        // Use POST for creates
        if (!token) {
          setError('Bot token is required');
          setIsSaving(false);
          return false;
        }
        await apiPost(
          `/api/v1/tenants/${tenantId}/integrations/slack`,
          payload
        );
      }

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
    // In edit mode, if no token is provided, we can still save (keeps existing token)
    // In create mode, token is required
    if (!isEditMode && !botToken) {
      setError('Token not verified. Please verify your token first.');
      return false;
    }

    // In edit mode, if token is provided but not verified, we need to verify it first
    // OR if we have workspace info, we can save without verifying (keeps existing token)
    if (isEditMode && botToken && !workspaceInfo.workspaceId) {
      // Token was entered but not verified - need to verify first
      const verified = await verifyToken(botToken);
      if (!verified) {
        return false; // Error already set by verifyToken
      }
      // After verification, workspaceInfo is set, so we can proceed to save
    }

    // If we have workspace info, we can save (either from verification or existing data)
    if (!workspaceInfo.workspaceId) {
      setError('Token not verified. Please verify your token first.');
      return false;
    }

    return await saveIntegrationWithoutChannels(botToken || null, workspaceInfo, isEditMode);
  }, [botToken, workspaceInfo, isEditMode, saveIntegrationWithoutChannels, verifyToken]);

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



