import { json } from '@remix-run/node';
import { Flex, Group, Text, Box, Skeleton, useMantineTheme } from "@mantine/core";
import { Outlet, useLoaderData, useNavigate, useParams, useLocation } from "@remix-run/react";
import { route } from "routes-gen";
import type { User } from '~/.server/services/Auth/auth.interface';
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { HeaderUserButton } from "~/components/UserButton/HeaderUserButton";
import { Sidebar } from "~/components/Pages/components/Sidebar/Sidebar";
import { useGetOrgList } from "~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList";
import { CodepushService } from '~/.server/services/Codepush';
import { STORE_TYPES, ALLOWED_PLATFORMS } from '~/types/distribution/app-distribution';
import type { SystemMetadataBackend } from '~/types/system-metadata';
import { AuthErrorFallback } from '~/components/Auth/AuthErrorFallback';
import { OfflineBanner } from '~/components/Common/OfflineBanner';
import { useOfflineStatus } from '~/hooks/useOfflineStatus';
import { IconRocket } from '@tabler/icons-react';

export const loader = authenticateLoaderRequest(async ({ user, request }) => {
  try {
    if (!user || !user.user || !user.user.id) {
      console.error('[Dashboard] Invalid user object:', user);
      throw new Error('User not authenticated properly');
    }
    
    const response = await CodepushService.getSystemMetadata(user.user.id);
    
    const enrichedData: SystemMetadataBackend = {
      ...response.data,
      appDistribution: {
        availableStoreTypes: STORE_TYPES,
        allowedPlatforms: ALLOWED_PLATFORMS,
      },
    };
    
    // Log success with metadata summary
    const metadata = enrichedData.releaseManagement;
    console.log('[Dashboard] System metadata loaded successfully:', {
      integrations: {
        SOURCE_CONTROL: metadata.integrations.SOURCE_CONTROL.length,
        COMMUNICATION: metadata.integrations.COMMUNICATION.length,
        CI_CD: metadata.integrations.CI_CD.length,
        TEST_MANAGEMENT: metadata.integrations.TEST_MANAGEMENT.length,
        PROJECT_MANAGEMENT: metadata.integrations.PROJECT_MANAGEMENT.length,
        APP_DISTRIBUTION: metadata.integrations.APP_DISTRIBUTION.length,
      },
      platforms: metadata.platforms.length,
      targets: metadata.targets.length,
      releaseTypes: metadata.releaseTypes.length,
      releaseStages: metadata.releaseStages?.length || 0,
      releaseStatuses: metadata.releaseStatuses.length,
      buildEnvironments: metadata.buildEnvironments.length,
      systemVersion: enrichedData.system?.version,
    });
    
    return json({
      user,
      initialSystemMetadata: enrichedData,
      authError: null,
    });
  } catch (error: any) {
    console.error('[Dashboard] Error loading system metadata:', error.message);
    
    const status = error?.response?.status || error?.status;
    if (status === 401) {
      // Return error state - let user choose to retry or logout
      return json({
        user,
        initialSystemMetadata: null,
        authError: {
          message: 'Your session has expired or you are no longer authenticated. Please log in again.',
        },
      });
    }
    
    // For other errors, return null data (hooks will handle fallback)
    return json({
      user,
      initialSystemMetadata: null,
      authError: null,
    });
  }
});

export type DashboardLoaderData = {
  user: User;
  initialSystemMetadata: SystemMetadataBackend | null;
  authError: {
    message: string;
  } | null;
};

/**
 * Control revalidation behavior for root dashboard route
 * ONLY revalidate on navigation - never on actions from child routes
 */
export function shouldRevalidate({ 
  currentUrl, 
  nextUrl
}: any) {
  // ONLY revalidate on navigation (URL change)
  // Block ALL other revalidation (actions, manual revalidation from children)
  return currentUrl.pathname !== nextUrl.pathname;
}

export default function Dashboard() {
  const theme = useMantineTheme();
  const { user, authError } = useLoaderData<DashboardLoaderData>();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { data: orgs = [], isLoading: orgsLoading, isError: hasOrgsError, error: orgsError } = useGetOrgList();
  const { shouldShowBanner } = useOfflineStatus();
  if (hasOrgsError) {
    console.error('[Dashboard] Error loading organizations:', orgsError);
    return <AuthErrorFallback message="Failed to load organizations" />;
  }
  
  // Show auth error if present
  if (authError) {
    return <AuthErrorFallback message={authError.message} />;
  }

  // Handle both /dashboard and /dashboard/ (with or without trailing slash)
  const isMainDashboard = location.pathname === "/dashboard" || location.pathname === "/dashboard/";
  const isGettingStarted = location.pathname === "/dashboard/getting-started";
  const isTokensPage = location.pathname === "/dashboard/tokens";
  const showSidebar = orgs.length > 0 && !isMainDashboard && !isGettingStarted && !isTokensPage;
  
  // Theme colors
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';
  const bgColor = theme.colors?.slate?.[0] || '#f8fafc';
  const brandColor = theme.colors?.brand?.[5] || '#14b8a6';

  return (
    <>
      {orgsLoading ? (
        <Flex h="100vh" direction="column" bg={bgColor}>
          {/* Header Skeleton */}
          <Box 
            h={60} 
            bg="white" 
            style={{ borderBottom: `1px solid ${borderColor}` }}
            px={24}
          >
            <Flex align="center" justify="space-between" h="100%">
              <Group gap="sm">
                <Skeleton height={32} width={32} radius="md" />
                <Skeleton height={20} width={60} />
              </Group>
              <Skeleton height={36} width={36} radius="xl" />
            </Flex>
          </Box>
          {/* Content Skeleton */}
          <Flex style={{ flex: 1 }}>
            <Box style={{ flex: 1 }} p={40}>
              <Skeleton height={32} width="30%" mb={24} />
              <Skeleton height={200} width="100%" radius="md" />
            </Box>
          </Flex>
        </Flex>
      ) : (
        <Flex h="100vh" direction="column" bg={bgColor}>
          {/* Offline Banner - Above Header */}
          <OfflineBanner show={shouldShowBanner} />
          
          {/* Header */}
          <Box
            bg="white"
            h={60}
            style={{
              borderBottom: `1px solid ${borderColor}`,
              flexShrink: 0,
            }}
          >
            <Flex align="center" justify="space-between" h="100%" px={24}>
              <Group 
                gap="sm" 
                style={{ cursor: "pointer" }} 
                onClick={() => navigate(route("/dashboard"))}
              >
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: brandColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconRocket size={18} color="white" stroke={2} />
                </Box>
                <Text 
                  size="lg" 
                  fw={700} 
                  c="dark.9"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  Delivr
                </Text>
              </Group>
              
              <Group gap={16} align="center">
                <Text
                  size="sm"
                  fw={500}
                  c="dimmed"
                  onClick={() => window.open('https://delivr.live/', '_blank')}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = brandColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '';
                  }}
                >
                  Documentation
                </Text>
                <Box
                  style={{
                    width: 1,
                    height: 24,
                    background: borderColor,
                  }}
                />
                {user?.user && <HeaderUserButton user={user} />}
              </Group>
            </Flex>
          </Box>

          {/* Main Content */}
          <Flex style={{ flex: 1, overflow: "hidden" }}>
            {showSidebar && (
              <Sidebar
                organizations={orgs}
                currentOrgId={params.org}
                currentAppId={params.app}
                userEmail={user?.user?.email || ''}
              />
            )}
            <Box 
              style={{ 
                flex: 1, 
                overflowY: "auto", 
                background: bgColor,
              }}
            >
              {/* Main dashboard page and getting-started handle their own padding (full bleed) */}
              {/* All other pages get consistent padding */}
              <Box p={isMainDashboard || isGettingStarted ? 0 : 32}>
                <Outlet />
              </Box>
            </Box>
          </Flex>
        </Flex>
      )}
    </>
  );
}
