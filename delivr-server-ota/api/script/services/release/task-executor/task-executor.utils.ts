/**
 * Build Delivr URL for release-related pages
 * 
 * @param appId - app id
 * @param releaseId - Release ID
 * @returns Full Delivr URL
 */
export const buildDelivrUrl = (
  appId: string,
  releaseId: string
): string => {
  // Use FRONTEND_URL for user-facing links
  let baseUrl = process.env.FRONTEND_URL || 'https://horizon.delivr.live/dashboard';
  
  // Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/+$/, '');
  
  // Format: {baseUrl}/{appId}/releases/{releaseId}
  return `${baseUrl}/${appId}/releases/${releaseId}`;
};

