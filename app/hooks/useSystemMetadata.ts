/**
 * React Query hook for fetching system metadata
 * Fetches all available options (integrations, platforms, etc.)
 * Supports initialData from server-side loader for faster initial load
 */

import { useQuery } from 'react-query';
import { apiGet } from '~/utils/api-client';
import type { SystemMetadataBackend } from '~/types/system-metadata';

async function fetchSystemMetadata(): Promise<SystemMetadataBackend> {
  const result = await apiGet<SystemMetadataBackend>('/api/v1/system/metadata');
  
  if (!result.data) {
    throw new Error('No data returned from system metadata API');
  }
  
  return result.data as SystemMetadataBackend;
}

export function useSystemMetadata(initialData?: SystemMetadataBackend | null) {
  return useQuery<SystemMetadataBackend, Error>(
    ['system', 'metadata'],
    fetchSystemMetadata,
    {
      initialData: initialData || undefined, // Use initialData if provided
      staleTime: 1000 * 60 * 60, // 1 hour - metadata changes rarely
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 3,
    }
  );
}

