/**
 * Backend Base URL Utilities
 * 
 * Centralized logic for determining backend API base URLs
 * Supports hybrid/mock modes for development
 */

/**
 * Get the backend base URL based on environment configuration
 * 
 * Priority:
 * 1. If DELIVR_MOCK_MODE=true → use mock server
 * 2. If DELIVR_HYBRID_MODE=true → use mock server
 * 3. Otherwise → use real backend
 * 
 * @returns The base URL for backend API calls
 */
export function getBackendBaseURL(): string {
  const isMockMode = process.env.DELIVR_MOCK_MODE === 'true';
  const isHybridMode = process.env.DELIVR_HYBRID_MODE === 'true';
  const mockURL = process.env.DELIVR_MOCK_URL || 'http://localhost:4000';
  const backendURL = process.env.DELIVR_BACKEND_URL || 
                     process.env.BACKEND_API_URL || 
                     'http://localhost:3010';
  
  if (isMockMode || isHybridMode) {
    console.log('[Backend] Using mock server:', mockURL);
    return mockURL;
  }
  
  return backendURL;
}

