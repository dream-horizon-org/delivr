/**
 * Hook for managing Slack connection state
 * Handles verification, channel fetching, and saving
 */

import { useState } from 'react';
import { useParams } from '@remix-run/react';

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
      // TODO: Replace with actual API call
      // Example:
      // const result = await fetch(`/api/v1/tenants/${tenantId}/integrations/slack/verify`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ botToken: connection.botToken })
      // });
      // const data = await result.json();

      // MOCK RESPONSE - REPLACE THIS
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockSuccess = true;

      if (mockSuccess) {
        const mockData: VerificationResult = {
          success: true,
          workspaceId: 'T01234ABCDE',
          workspaceName: 'Acme Corp',
          botUserId: 'U01234ABCDE'
        };

        setConnection(prev => ({
          ...prev,
          workspaceId: mockData.workspaceId,
          workspaceName: mockData.workspaceName,
          botUserId: mockData.botUserId,
          isVerified: true
        }));

        return mockData;
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to verify Slack token';
      setVerificationError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Fetch available Slack channels
   * YOU WILL IMPLEMENT THE ACTUAL API CALL
   */
  const fetchChannels = async (): Promise<ChannelsResult> => {
    if (!connection.botToken) {
      setChannelsError('Bot token is required');
      return { success: false, channels: [], error: 'Bot token is required' };
    }

    setIsLoadingChannels(true);
    setChannelsError('');

    try {
      // TODO: Replace with actual API call
      // Example:
      // const result = await fetch(`/api/v1/tenants/${tenantId}/integrations/slack/channels`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ botToken: connection.botToken })
      // });
      // const data = await result.json();

      // MOCK RESPONSE - REPLACE THIS
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockChannels: SlackChannel[] = [
        { id: 'C01', name: 'general' },
        { id: 'C02', name: 'releases' },
        { id: 'C03', name: 'notifications' },
        { id: 'C04', name: 'engineering' },
        { id: 'C05', name: 'product' },
      ];

      setAvailableChannels(mockChannels);
      return { success: true, channels: mockChannels };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch channels';
      setChannelsError(errorMessage);
      return { success: false, channels: [], error: errorMessage };
    } finally {
      setIsLoadingChannels(false);
    }
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
      // TODO: Replace with actual API call
      // Example:
      // const result = await fetch(`/api/v1/tenants/${tenantId}/integrations/slack`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     botToken: connection.botToken,
      //     workspaceId: connection.workspaceId,
      //     workspaceName: connection.workspaceName,
      //     botUserId: connection.botUserId,
      //     channels: connection.selectedChannels
      //   })
      // });
      // const data = await result.json();

      // MOCK RESPONSE - REPLACE THIS
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Saving Slack integration:', {
        tenantId,
        workspaceId: connection.workspaceId,
        workspaceName: connection.workspaceName,
        channels: connection.selectedChannels
      });

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save Slack integration';
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
