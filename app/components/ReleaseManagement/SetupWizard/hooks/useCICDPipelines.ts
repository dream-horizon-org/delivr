/**
 * Custom hook for managing CI/CD pipelines (multiple pipelines support)
 */

import { useState, useCallback } from 'react';
import { apiPost, getApiErrorMessage } from '~/utils/api-client';
import type { CICDPipeline } from '~/types/setup-wizard';

interface UseCICDPipelinesProps {
  initialPipelines?: CICDPipeline[];
  onPipelinesChange?: (pipelines: CICDPipeline[]) => void;
}

export function useCICDPipelines({ initialPipelines = [], onPipelinesChange }: UseCICDPipelinesProps = {}) {
  const [pipelines, setPipelines] = useState<CICDPipeline[]>(initialPipelines);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const addPipeline = useCallback(async (
    pipelineData: Omit<CICDPipeline, 'id' | 'isVerified' | 'createdAt'>
  ): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);
    
    try {
      // Verify based on type
      const endpoint = pipelineData.type === 'GITHUB_ACTIONS' 
        ? '/api/v1/setup/verify-github-actions'
        : '/api/v1/setup/verify-jenkins';
      
      const result = await apiPost<{ success: boolean; error?: string }>(endpoint, pipelineData);
      
      if (result.data?.success) {
        const newPipeline: CICDPipeline = {
          ...pipelineData,
          id: `pipeline-${Date.now()}`,
          isVerified: true,
          createdAt: new Date().toISOString(),
        };
        
        const updatedPipelines = [...pipelines, newPipeline];
        setPipelines(updatedPipelines);
        onPipelinesChange?.(updatedPipelines);
        return true;
      } else {
        setError(result.data?.error || 'Verification failed');
        return false;
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, 'Failed to verify pipeline');
      setError(errorMessage);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [pipelines, onPipelinesChange]);
  
  const removePipeline = useCallback((pipelineId: string) => {
    const updatedPipelines = pipelines.filter(p => p.id !== pipelineId);
    setPipelines(updatedPipelines);
    onPipelinesChange?.(updatedPipelines);
  }, [pipelines, onPipelinesChange]);
  
  const updatePipeline = useCallback((pipelineId: string, updates: Partial<CICDPipeline>) => {
    const updatedPipelines = pipelines.map(p => 
      p.id === pipelineId ? { ...p, ...updates } : p
    );
    setPipelines(updatedPipelines);
    onPipelinesChange?.(updatedPipelines);
  }, [pipelines, onPipelinesChange]);
  
  const getPipelinesByPlatform = useCallback((platform: 'IOS' | 'ANDROID') => {
    return pipelines.filter(p => p.platform === platform);
  }, [pipelines]);
  
  const getPipelinesByEnvironment = useCallback((environment: CICDPipeline['environment']) => {
    return pipelines.filter(p => p.environment === environment);
  }, [pipelines]);
  
  return {
    pipelines,
    isVerifying,
    error,
    addPipeline,
    removePipeline,
    updatePipeline,
    getPipelinesByPlatform,
    getPipelinesByEnvironment,
    hasPipelines: pipelines.length > 0,
    pipelineCount: pipelines.length,
  };
}

