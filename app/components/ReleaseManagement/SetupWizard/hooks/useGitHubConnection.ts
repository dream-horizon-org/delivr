/**
 * Custom hook for managing GitHub connection
 */

import { useState, useCallback } from 'react';
import { useParams } from '@remix-run/react';
import type { GitHubConnection } from '../types';

interface UseGitHubConnectionProps {
  initialData?: GitHubConnection;
  onVerified?: (data: GitHubConnection) => void;
}

export function useGitHubConnection({ initialData, onVerified }: UseGitHubConnectionProps = {}) {
  const { org } = useParams();
  const [connection, setConnection] = useState<Partial<GitHubConnection>>(initialData || {});
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const updateField = useCallback((field: keyof GitHubConnection, value: any) => {
    setConnection(prev => ({ ...prev, [field]: value }));
    setError(null); // Clear error when user types
  }, []);
  
  const verifyConnection = useCallback(async () => {
    if (!connection.owner || !connection.repoName || !connection.token) {
      setError('Owner, repository name, and access token are required');
      return false;
    }
    
    const scmType = connection.scmType || 'GITHUB';
    
    setIsVerifying(true);
    setError(null);
    
    try {
      console.log(`[useGitHubConnection] Calling verify endpoint for ${connection.owner}/${connection.repoName} (${scmType})`);
      
      // Call NEW SCM integration verify endpoint
      const response = await fetch(`/api/v1/tenants/${org}/integrations/scm/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scmType,
          owner: connection.owner,
          repo: connection.repoName,
          accessToken: connection.token,
        }),
      });
      
      const result = await response.json();
      console.log(`[useGitHubConnection] Verification result:`, result);
      
      if (result.success) {
        const verifiedConnection: GitHubConnection = {
          scmType,
          owner: connection.owner,
          repoName: connection.repoName,
          token: connection.token,
          repoUrl: `https://github.com/${connection.owner}/${connection.repoName}`,
          isVerified: true,
        };
        
        setConnection(verifiedConnection);
        onVerified?.(verifiedConnection);
        return true;
      } else {
        setError(result.error || result.message || 'Verification failed');
        return false;
      }
    } catch (err) {
      console.error('[useGitHubConnection] Verification error:', err);
      setError('Failed to verify connection. Please try again.');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [connection, onVerified, org]);
  
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
    isValid: !!connection.owner && !!connection.repoName && !!connection.token,
    isVerified: !!connection.isVerified,
  };
}

