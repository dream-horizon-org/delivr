/**
 * Custom hook for managing Slack connection
 */

import { useState, useCallback } from 'react';
import type { SlackIntegration } from '../types';

interface UseSlackConnectionProps {
  initialData?: SlackIntegration;
  onVerified?: (data: SlackIntegration) => void;
}

export function useSlackConnection({ initialData, onVerified }: UseSlackConnectionProps = {}) {
  const [integration, setIntegration] = useState<Partial<SlackIntegration>>(initialData || {});
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableChannels, setAvailableChannels] = useState<Array<{ id: string; name: string }>>([]);
  
  const updateBotToken = useCallback((botToken: string) => {
    setIntegration(prev => ({ ...prev, botToken }));
    setError(null);
  }, []);
  
  const verifyAndFetchChannels = useCallback(async () => {
    if (!integration.botToken) {
      setError('Bot token is required');
      return false;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/setup/verify-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: integration.botToken }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAvailableChannels(result.channels || []);
        return true;
      } else {
        setError(result.error || 'Verification failed');
        return false;
      }
    } catch (err) {
      setError('Failed to verify connection. Please try again.');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [integration.botToken]);
  
  const selectChannels = useCallback((
    selectedChannels: Array<{ id: string; name: string; purpose: SlackIntegration['channels'][0]['purpose'] }>
  ) => {
    const verifiedIntegration: SlackIntegration = {
      botToken: integration.botToken!,
      channels: selectedChannels,
      isVerified: true,
    };
    
    setIntegration(verifiedIntegration);
    onVerified?.(verifiedIntegration);
  }, [integration.botToken, onVerified]);
  
  const reset = useCallback(() => {
    setIntegration({});
    setError(null);
    setAvailableChannels([]);
  }, []);
  
  return {
    integration,
    isVerifying,
    error,
    availableChannels,
    updateBotToken,
    verifyAndFetchChannels,
    selectChannels,
    reset,
    isValid: !!integration.botToken,
    isVerified: !!integration.isVerified,
    hasChannels: !!integration.channels && integration.channels.length > 0,
  };
}

