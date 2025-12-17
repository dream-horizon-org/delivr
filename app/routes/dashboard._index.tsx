import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Flex, Box, useMantineTheme } from '@mantine/core';
import { OrgsPage } from "~/components/Pages/components/OrgsPage";
import { CodepushService } from '~/.server/services/Codepush';
import { authenticateLoaderRequest } from '~/utils/authenticate';
import { STORE_TYPES, ALLOWED_PLATFORMS } from '~/types/app-distribution';
import type { SystemMetadataBackend } from '~/types/system-metadata';
import { AuthErrorFallback } from '~/components/Auth/AuthErrorFallback';

/**
 * Top-level loader for system metadata
 * Fetches global system metadata that doesn't change per tenant
 * This data is available to all child routes via route data
 */
export const loader = authenticateLoaderRequest(async ({ user, request }) => {
  try {
    // Safety check for user object
    if (!user || !user.user || !user.user.id) {
      console.error('[DashboardIndex] Invalid user object:', user);
      throw new Error('User not authenticated properly');
    }
    
    const response = await CodepushService.getSystemMetadata(user.user.id);
    
    // Enrich with app distribution metadata (same as API route)
    const enrichedData: SystemMetadataBackend = {
      ...response.data,
      appDistribution: {
        availableStoreTypes: STORE_TYPES,
        allowedPlatforms: ALLOWED_PLATFORMS,
      },
    };
    
    return json({
      initialSystemMetadata: enrichedData,
      authError: null,
    });
  } catch (error: any) {
    console.error('[DashboardIndex] Error loading system metadata:', error.message);
    
    const status = error?.response?.status || error?.status;
    if (status === 401) {
      // Return error state - let user choose to retry or logout
      return json({
        initialSystemMetadata: null,
        authError: {
          message: 'Your session has expired or you are no longer authenticated. Please log in again.',
        },
      });
    }
    
    // For other errors, return null data (hooks will handle fallback)
    return json({
      initialSystemMetadata: null,
      authError: null,
    });
  }
});

export type DashboardIndexLoaderData = {
  initialSystemMetadata: SystemMetadataBackend | null;
  authError: {
    message: string;
  } | null;
};

export default function DashboardIndex() {
  const theme = useMantineTheme();
  const { authError } = useLoaderData<DashboardIndexLoaderData>();
  console.log('authError', authError);
  // Show auth error if present
  if (authError) {
    return (
      <Flex h="100vh" direction="column" bg={theme.colors?.slate?.[0] || '#f8fafc'} align="center" justify="center" p={32}>
        <Box style={{ maxWidth: 600, width: '100%' }}>
          <AuthErrorFallback message={authError.message} />
        </Box>
      </Flex>
    );
  }
  
  return <OrgsPage />;
}
