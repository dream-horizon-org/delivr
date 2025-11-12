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
  const [isSaving, setIsSaving] = useState(false);
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
  
  const saveConnection = useCallback(async () => {
    if (!connection.isVerified) {
      setError('Please verify the connection before saving');
      return false;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      console.log(`[useGitHubConnection] Saving SCM integration for ${connection.owner}/${connection.repoName}`);
      
      // Call CREATE SCM integration endpoint
      const response = await fetch(`/api/v1/tenants/${org}/integrations/scm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scmType: connection.scmType || 'GITHUB',
          owner: connection.owner,
          repo: connection.repoName,
          accessToken: connection.token,
          displayName: `${connection.owner}/${connection.repoName}`,
        }),
      });
      
      const result = await response.json();
      console.log(`[useGitHubConnection] Save result:`, result);
      
      if (response.ok && result.integration) {
        console.log(`[useGitHubConnection] Successfully saved integration with ID: ${result.integration.id}`);
        return true;
      } else {
        setError(result.error || 'Failed to save integration');
        return false;
      }
    } catch (err) {
      console.error('[useGitHubConnection] Save error:', err);
      setError('Failed to save connection. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [connection, org]);
  
  const reset = useCallback(() => {
    setConnection({});
    setError(null);
  }, []);
  
  return {
    connection,
    isVerifying,
    isSaving,
    error,
    updateField,
    verifyConnection,
    saveConnection,
    reset,
    isValid: !!connection.owner && !!connection.repoName && !!connection.token,
    isVerified: !!connection.isVerified,
  };
}

