/**
 * React Query hook for fetching system metadata
 * Fetches all available options (integrations, platforms, etc.)
 */

import { useQuery } from 'react-query';
import type { SystemMetadataBackend } from '~/types/system-metadata';

async function fetchSystemMetadata(): Promise<SystemMetadataBackend> {
  // Call BFF layer which proxies to backend
  const response = await fetch('/api/v1/system/metadata');
  
  if (!response.ok) {
    throw new Error('Failed to fetch system metadata');
  }
  
  return response.json();
}

export function useSystemMetadata() {
  return useQuery<SystemMetadataBackend, Error>(
    ['system', 'metadata'],
    fetchSystemMetadata,
    {
      staleTime: 1000 * 60 * 60, // 1 hour - metadata changes rarely
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 3,
    }
  );
}

