/**
 * Hook for managing Slack connection state
 * Handles verification, channel fetching, and saving
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackConnection {
  botToken: string;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  selectedChannels: SlackChannel[];
  isVerified: boolean;
}

interface VerificationResult {
  success: boolean;
  workspaceId?: string;
  workspaceName?: string;
  botUserId?: string;
  error?: string;
}

interface ChannelsResult {
  success: boolean;
  channels: SlackChannel[];
  error?: string;
}

export function useSlackConnection(initialConnection?: Partial<SlackConnection>) {
  const params = useParams();
  const tenantId = params.org as string;

  const [connection, setConnection] = useState<SlackConnection>({
    botToken: initialConnection?.botToken || '',
    workspaceId: initialConnection?.workspaceId,
    workspaceName: initialConnection?.workspaceName,
    botUserId: initialConnection?.botUserId,
    selectedChannels: initialConnection?.selectedChannels || [],
    isVerified: initialConnection?.isVerified || false
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string>('');
  
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
  const [channelsError, setChannelsError] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);

  /**
   * Update bot token
   */
  const updateBotToken = (botToken: string) => {
    setConnection(prev => ({
      ...prev,
      botToken,
      // Reset verification if token changes
      isVerified: prev.botToken === botToken ? prev.isVerified : false
    }));
    setVerificationError('');
  };

  /**
   * Verify Slack bot token
   * YOU WILL IMPLEMENT THE ACTUAL API CALL
   */
  const verifyConnection = async (): Promise<VerificationResult> => {
    if (!connection.botToken) {
      setVerificationError('Bot token is required');
      return { success: false, error: 'Bot token is required' };
    }

    if (!connection.botToken.startsWith('xoxb-')) {
      setVerificationError('Invalid bot token format. Must start with "xoxb-"');
      return { success: false, error: 'Invalid bot token format' };
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      const result = await apiPost<{
        success: boolean;
        verified?: boolean;
        workspaceId?: string;
        workspaceName?: string;
        botUserId?: string;
      }>(`/api/v1/tenants/${tenantId}/integrations/slack/verify`, {
        botToken: connection.botToken
      });

      if (result.data?.success && result.data?.verified) {
        const verifiedData: VerificationResult = {
          success: true,
          workspaceId: result.data.workspaceId,
          workspaceName: result.data.workspaceName,
          botUserId: result.data.botUserId,
        };

        setConnection(prev => ({
          ...prev,
          workspaceId: verifiedData.workspaceId,
          workspaceName: verifiedData.workspaceName,
          botUserId: verifiedData.botUserId,
          isVerified: true
        }));

        return verifiedData;
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error, 'Failed to verify Slack token');
      setVerificationError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Fetch available Slack channels - REMOVED
   * Channels should only be fetched in Release Config using stored integration
   * Not needed during setup wizard
   */
  const fetchChannels = async (): Promise<ChannelsResult> => {
    console.warn('[useSlackConnection] fetchChannels is deprecated - channels should be fetched in Release Config');
    return { success: false, channels: [], error: 'Channel fetching not available during setup' };
  };

  /**
   * Update selected channels
   */
  const updateSelectedChannels = (channelIds: string[]) => {
    const channels = channelIds.map(id => {
      const channel = availableChannels.find(c => c.id === id);
      return channel || { id, name: '' };
    });

    setConnection(prev => ({
      ...prev,
      selectedChannels: channels
    }));
    setChannelsError('');
  };

  /**
   * Save Slack integration
   * YOU WILL IMPLEMENT THE ACTUAL API CALL
   */
  const saveConnection = async (): Promise<{ success: boolean; error?: string }> => {
    if (!connection.isVerified) {
      return { success: false, error: 'Please verify the connection first' };
    }

    if (connection.selectedChannels.length === 0) {
      setChannelsError('Please select at least one channel');
      return { success: false, error: 'Please select at least one channel' };
    }

    setIsSaving(true);

    try {
      const result = await apiPost<{ success: boolean }>(
        `/api/v1/tenants/${tenantId}/integrations/slack`,
        {
          botToken: connection.botToken,
          workspaceId: connection.workspaceId,
          workspaceName: connection.workspaceName,
          botUserId: connection.botUserId,
          channels: connection.selectedChannels
        }
      );

      if (result.data?.success) {
        return { success: true };
      } else {
        throw new Error('Failed to save Slack integration');
      }
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error, 'Failed to save Slack integration');
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Reset connection state
   */
  const resetConnection = () => {
    setConnection({
      botToken: '',
      workspaceId: undefined,
      workspaceName: undefined,
      botUserId: undefined,
      selectedChannels: [],
      isVerified: false
    });
    setAvailableChannels([]);
    setVerificationError('');
    setChannelsError('');
  };

  return {
    // State
    connection,
    isVerifying,
    verificationError,
    isLoadingChannels,
    availableChannels,
    channelsError,
    isSaving,

    // Actions
    updateBotToken,
    verifyConnection,
    fetchChannels,
    updateSelectedChannels,
    saveConnection,
    resetConnection
  };
}
