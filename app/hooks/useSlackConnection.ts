/**
 * Custom Hook: Slack Connection
 * Handles the complete Slack integration flow:
 * 1. Verify bot token
 * 2. Fetch channels
 * 3. Save integration
 */

import { useState, useCallback } from 'react';
import { useParams } from '@remix-run/react';

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
  const [availableChannels, setAvailableChannels] = useState<SlackChannel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  
  const [step, setStep] = useState<'token' | 'channels'>('token');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
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
      console.log(`[useSlackConnection] Verifying token for tenant: ${tenantId}`);
      
      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/slack/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token })
      });

      const result = await response.json();

      console.log(`[useSlackConnection] Verification result:`, result);

      if (!result.success || !result.verified) {
        setError(result.message || result.error || 'Failed to verify token');
        setIsVerifying(false);
        return false;
      }

      // Store workspace info
      setWorkspaceInfo({
        workspaceId: result.workspaceId,
        workspaceName: result.workspaceName,
        botUserId: result.botUserId
      });

      setBotToken(token);
      setIsVerifying(false);
      setStep('channels');

      // Automatically fetch channels
      await fetchChannels(token);

      return true;
    } catch (error) {
      console.error('[useSlackConnection] Verification error:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify token');
      setIsVerifying(false);
      return false;
    }
  }, [tenantId]);

  /**
   * Step 2: Fetch Slack channels
   */
  const fetchChannels = useCallback(async (token: string): Promise<boolean> => {
    setIsLoadingChannels(true);
    setError(null);

    try {
      console.log(`[useSlackConnection] Fetching channels for tenant: ${tenantId}`);
      
      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/slack/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token })
      });

      const result = await response.json();

      console.log(`[useSlackConnection] Fetched ${result.channels?.length || 0} channels`);

      if (!result.success) {
        setError(result.message || result.error || 'Failed to fetch channels');
        setIsLoadingChannels(false);
        return false;
      }

      setAvailableChannels(result.channels || []);
      setIsLoadingChannels(false);
      return true;
    } catch (error) {
      console.error('[useSlackConnection] Fetch channels error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch channels');
      setIsLoadingChannels(false);
      return false;
    }
  }, [tenantId]);

  /**
   * Step 3: Save Slack integration
   */
  const saveIntegration = useCallback(async (): Promise<boolean> => {
    if (selectedChannels.length === 0) {
      setError('Please select at least one channel');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log(`[useSlackConnection] Saving integration for tenant: ${tenantId}`);
      console.log(`[useSlackConnection] Selected channels:`, selectedChannels);
      
      // Map selected channel IDs to full channel objects
      const channels = selectedChannels.map(id => {
        const channel = availableChannels.find(c => c.id === id);
        return {
          id,
          name: channel?.name || ''
        };
      });

      const response = await fetch(`/api/v1/tenants/${tenantId}/integrations/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken,
          botUserId: workspaceInfo.botUserId,
          workspaceId: workspaceInfo.workspaceId,
          workspaceName: workspaceInfo.workspaceName,
          channels
        })
      });

      const result = await response.json();

      console.log(`[useSlackConnection] Save result:`, result.success ? 'Success' : 'Failed');

      if (!result.success) {
        setError(result.error || 'Failed to save integration');
        setIsSaving(false);
        return false;
      }

      setIsSaving(false);
      return true;
    } catch (error) {
      console.error('[useSlackConnection] Save integration error:', error);
      setError(error instanceof Error ? error.message : 'Failed to save integration');
      setIsSaving(false);
      return false;
    }
  }, [tenantId, botToken, workspaceInfo, selectedChannels, availableChannels]);

  /**
   * Reset the form
   */
  const reset = useCallback(() => {
    setBotToken('');
    setWorkspaceInfo({});
    setAvailableChannels([]);
    setSelectedChannels([]);
    setStep('token');
    setError(null);
  }, []);

  /**
   * Go back to token step
   */
  const goBack = useCallback(() => {
    setStep('token');
    setError(null);
  }, []);

  return {
    // State
    botToken,
    workspaceInfo,
    availableChannels,
    selectedChannels,
    step,
    error,
    
    // Loading states
    isVerifying,
    isLoadingChannels,
    isSaving,
    
    // Actions
    setBotToken,
    setSelectedChannels,
    verifyToken,
    fetchChannels,
    saveIntegration,
    reset,
    goBack
  };
}


