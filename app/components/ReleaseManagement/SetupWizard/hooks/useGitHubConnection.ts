/**
 * Custom hook for managing GitHub connection
 */

import { useState, useCallback } from 'react';
import type { GitHubConnection } from '../types';

interface UseGitHubConnectionProps {
  initialData?: GitHubConnection;
  onVerified?: (data: GitHubConnection) => void;
}

export function useGitHubConnection({ initialData, onVerified }: UseGitHubConnectionProps = {}) {
  const [connection, setConnection] = useState<Partial<GitHubConnection>>(initialData || {});
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const updateField = useCallback((field: keyof GitHubConnection, value: any) => {
    setConnection(prev => ({ ...prev, [field]: value }));
    setError(null); // Clear error when user types
  }, []);
  
  const verifyConnection = useCallback(async () => {
    if (!connection.repoUrl || !connection.token) {
      setError('Repository URL and token are required');
      return false;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      // Call API to verify
      const response = await fetch('/api/v1/setup/verify-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: connection.repoUrl,
          token: connection.token,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const verifiedConnection: GitHubConnection = {
          repoUrl: connection.repoUrl,
          token: connection.token,
          owner: result.data.owner,
          repoName: result.data.repoName,
          isVerified: true,
        };
        
        setConnection(verifiedConnection);
        onVerified?.(verifiedConnection);
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
  }, [connection, onVerified]);
  
  const reset = useCallback(() => {
    setConnection({});
    setError(null);
  }, []);
  
  return {
    connection,
    isVerifying,
    error,
    updateField,
    verifyConnection,
    reset,
    isValid: !!connection.repoUrl && !!connection.token,
    isVerified: !!connection.isVerified,
  };
}

