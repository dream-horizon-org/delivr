import { json } from '@remix-run/node';
import { Flex, Group, Text, Box, Skeleton, useMantineTheme } from "@mantine/core";
import { IconRocket } from "@tabler/icons-react";
import { Outlet, useLoaderData, useNavigate, useParams, useLocation } from "@remix-run/react";
import { route } from "routes-gen";
import type { User } from "~/.server/services/Auth/Auth.interface";
import { SimpleTermsGuard } from "~/components/TermsAndConditions/SimpleTermsGuard";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { HeaderUserButton } from "~/components/UserButton/HeaderUserButton";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconHelp } from "@tabler/icons-react";
import { CombinedSidebar } from "~/components/Pages/components/AppDetailPage/components/CombinedSidebar";
import { useGetOrgList } from "~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList";
import { CodepushService } from '~/.server/services/Codepush';
import { STORE_TYPES, ALLOWED_PLATFORMS } from '~/types/app-distribution';
import type { SystemMetadataBackend } from '~/types/system-metadata';

/**
 * Dashboard layout loader
 * Fetches system metadata globally so it's available to all child routes
 */
export const loader = authenticateLoaderRequest(async ({ user }) => {
  try {
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
      user,
      initialSystemMetadata: enrichedData,
    });
  } catch (error: any) {
    console.error('[Dashboard] Error loading system metadata:', error.message);
    // Return empty metadata on error - hooks will handle fallback
    return json({
      user,
      initialSystemMetadata: null,
    });
  }
});

export type DashboardLoaderData = {
  user: User;
  initialSystemMetadata: SystemMetadataBackend | null;
};

export default function Dashboard() {
  const theme = useMantineTheme();
  const { user } = useLoaderData<DashboardLoaderData>();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { data: orgs = [], isLoading: orgsLoading } = useGetOrgList();

  const isMainDashboard = location.pathname === "/dashboard";
  const showSidebar = orgs.length > 0 && !isMainDashboard;

  return (
    <SimpleTermsGuard>
      {orgsLoading ? (
        <Flex h="100vh" direction="column">
          <Skeleton height={60} width="100%" />
          <Flex style={{ flex: 1 }}>
            <Skeleton width={280} height="100%" />
            <Box style={{ flex: 1 }} p="md">
              <Skeleton height={40} width="100%" mb="md" />
              <Skeleton height={400} width="100%" />
            </Box>
          </Flex>
        </Flex>
      ) : (
        <Flex h="100vh" direction="column">
          <Box
            style={{
              background: theme.other.brand.gradient,
              borderBottom: "none",
              paddingTop: theme.other.spacing.lg,
              paddingBottom: theme.other.spacing.lg,
            }}
          >
            <Flex align="center" justify="space-between" h="100%" px="lg">
              <Group 
                gap="sm" 
                style={{ cursor: "pointer" }} 
                onClick={() => navigate(route("/dashboard"))}
              >
                <IconRocket size={theme.other.sizes.icon["3xl"]} color={theme.other.text.white} stroke={2} />
                <Text 
                  size="xl" 
                  fw={theme.other.typography.fontWeight.bold} 
                  c="white"
                  style={{
                    fontSize: theme.other.typography.fontSize["2xl"],
                    letterSpacing: theme.other.typography.letterSpacing.wide,
                  }}
                >
                  Delivr
                </Text>
              </Group>
              <Group gap="lg" align="center">
                <Tooltip label="Access Documentation & Guides" position="bottom">
                  <Text
                    size="md"
                    fw={600}
                    onClick={() => window.open('https://dota.dreamsportslabs.com/', '_blank')}
                    style={{ 
                      color: theme.other.text.white,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.5px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.85';
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Get Started
                  </Text>
                </Tooltip>
                <HeaderUserButton user={user} />
              </Group>
            </Flex>
          </Box>

          <Flex style={{ flex: 1, overflow: "hidden" }}>
            {showSidebar && (
              <CombinedSidebar
                organizations={orgs}
                currentOrgId={params.org}
                currentAppId={params.app}
                userEmail={user.user.email}
              />
            )}
            <Box style={{ flex: 1, overflowY: "auto", padding: theme.other.spacing["2xl"] }}>
              <Outlet />
            </Box>
          </Flex>
        </Flex>
      )}
    </SimpleTermsGuard>
  );
}
