/**
 * Custom hook for managing GitHub connection
 */

import { useState, useCallback } from 'react';
import { useParams } from '@remix-run/react';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import type { GitHubConnection } from '~/types/setup-wizard';

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
    setConnection((prev: Partial<GitHubConnection>) => ({ ...prev, [field]: value }));
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
      const result = await apiPost<{ success: boolean; error?: string; message?: string }>(
        `/api/v1/tenants/${org}/integrations/scm/verify`,
        {
          scmType,
          owner: connection.owner,
          repo: connection.repoName,
          accessToken: connection.token,
        }
      );
      
      if (result.data?.success) {
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
        setError(result.data?.error || result.data?.message || 'Verification failed');
        return false;
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to verify connection');
      setError(errorMessage);
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
      const result = await apiPost<{ integration?: { id: string }; error?: string }>(
        `/api/v1/tenants/${org}/integrations/scm`,
        {
          scmType: connection.scmType || 'GITHUB',
          owner: connection.owner,
          repo: connection.repoName,
          accessToken: connection.token,
          displayName: `${connection.owner}/${connection.repoName}`,
        }
      );
      
      if (result.data?.integration) {
        return true;
      } else {
        setError(result.data?.error || 'Failed to save integration');
        return false;
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to save connection');
      setError(errorMessage);
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

