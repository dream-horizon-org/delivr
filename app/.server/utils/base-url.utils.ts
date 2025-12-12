/**
 * Backend Base URL Utilities
 * 
 * Centralized logic for determining backend API base URLs
 * Supports hybrid/mock modes for development
 */

/**
 * Get the backend base URL based on environment configuration
 * 
 * NOTE: BFF routes should ALWAYS call the real backend, not the mock server.
 * Hybrid mode only affects frontend API client routing, not BFF routes.
 * 
 * Priority:
 * 1. If DELIVR_MOCK_MODE=true → use mock server (full mock mode)
 * 2. Otherwise → use real backend (even in HYBRID_MODE, BFF routes use real backend)
 * 
 * @returns The base URL for backend API calls from BFF routes
 */
export function getBackendBaseURL(): string {
  const isMockMode = process.env.DELIVR_MOCK_MODE === 'true';
  const mockURL = process.env.DELIVR_MOCK_URL || 'http://localhost:4000';
  const backendURL = process.env.DELIVR_BACKEND_URL || 
                     process.env.BACKEND_API_URL || 
                     'http://localhost:3010';
  
  // Only use mock server in full MOCK_MODE
  // HYBRID_MODE only affects frontend API client routing, not BFF routes
  if (isMockMode) {
    console.log('[Backend] Using mock server (MOCK_MODE):', mockURL);
    return mockURL;
  }
  
  console.log('[Backend] Using real backend:', backendURL);
  return backendURL;
}

