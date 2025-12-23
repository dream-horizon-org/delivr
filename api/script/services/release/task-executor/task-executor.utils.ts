/**
 * Build Delivr URL for release-related pages
 * 
 * @param tenantId - Tenant ID
 * @param releaseId - Release ID
 * @returns Full Delivr URL
 */
export const buildDelivrUrl = (
  tenantId: string,
  releaseId: string
): string => {
  // Use FRONTEND_URL for user-facing links
  let baseUrl = process.env.FRONTEND_URL || 'https://horizon.delivr.live/dashboard';
  
  // Remove trailing slash if present
  baseUrl = baseUrl.replace(/\/+$/, '');
  
  // Format: {baseUrl}/{tenantId}/releases/{releaseId}
  return `${baseUrl}/${tenantId}/releases/${releaseId}`;
};

