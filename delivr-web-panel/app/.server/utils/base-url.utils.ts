/**
 * Backend Base URL Utilities
 * 
 * Centralized logic for determining backend API base URLs
 * Supports hybrid/mock modes for development
 */

import { isDistributionAPI, isReleaseProcessAPI } from '~/config/api.config';

/**
 * Get the backend base URL based on environment configuration
 * 
 * Priority:
 * 1. If DELIVR_MOCK_MODE=true → use mock server (full mock mode)
 * 2. If DELIVR_HYBRID_MODE=true AND url is Distribution/ReleaseProcess API → use mock server
 * 3. Otherwise → use real backend
 * 
 * @param url - Optional URL to check if it's a Distribution/ReleaseProcess API
 * @returns The base URL for backend API calls from BFF routes
 */
export function getBackendBaseURL(url?: string): string {
  const isMockMode = process.env.DELIVR_MOCK_MODE === 'true';
  const isHybridMode = process.env.DELIVR_HYBRID_MODE === 'true';
  const mockURL = process.env.DELIVR_MOCK_URL || 'http://localhost:4000';
  const backendURL = process.env.DELIVR_BACKEND_URL || 
                     process.env.BACKEND_API_URL || 
                     'http://localhost:3010';
  
  // Full mock mode - everything goes to mock
  if (isMockMode) {
    console.log('[Backend] Using mock server (MOCK_MODE):', mockURL);
    return mockURL;
  }
  
  // Hybrid mode - Distribution and ReleaseProcess APIs go to mock
  if (isHybridMode && url) {
    if (isDistributionAPI(url) || isReleaseProcessAPI(url)) {
      console.log('[Backend] Using mock server (HYBRID_MODE) for:', url);
      return mockURL;
    }
  }
  
  console.log('[Backend] Using real backend:', backendURL);
  return backendURL;
}

