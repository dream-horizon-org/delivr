import { json } from '@remix-run/node';
import { Flex, Group, Text, Box, Skeleton, useMantineTheme } from "@mantine/core";
import { IconRocket } from "@tabler/icons-react";
import { Outlet, useLoaderData, useNavigate, useParams, useLocation } from "@remix-run/react";
import { route } from "routes-gen";
import type { User } from "~/.server/services/Auth/Auth.interface";
import { SimpleTermsGuard } from "~/components/TermsAndConditions/SimpleTermsGuard";
import { authenticateLoaderRequest } from "~/utils/authenticate";
import { HeaderUserButton } from "~/components/UserButton/HeaderUserButton";
import { Sidebar } from "~/components/Pages/components/Sidebar/Sidebar";
import { useGetOrgList } from "~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList";
import { CodepushService } from '~/.server/services/Codepush';
import { STORE_TYPES, ALLOWED_PLATFORMS } from '~/types/app-distribution';
import type { SystemMetadataBackend } from '~/types/system-metadata';

export const loader = authenticateLoaderRequest(async ({ user }) => {
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
    
    return json({
      user,
      initialSystemMetadata: enrichedData,
    });
  } catch (error: any) {
    console.error('[Dashboard] Error loading system metadata:', error.message);
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
  
  // Safe color access
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';
  const bgColor = theme.colors?.slate?.[0] || '#f8fafc';
  const primaryText = theme.colors?.slate?.[9] || '#0f172a';
  const tertiaryText = theme.colors?.slate?.[5] || '#64748b';
  const brandColor = theme.colors?.brand?.[5] || '#14b8a6';

  return (
    <SimpleTermsGuard>
      {orgsLoading ? (
        <Flex h="100vh" direction="column">
          <Skeleton height={56} width="100%" />
          <Flex style={{ flex: 1 }}>
            <Skeleton width={260} height="100%" />
            <Box style={{ flex: 1 }} p="xl">
              <Skeleton height={32} width="40%" mb="lg" />
              <Skeleton height={200} width="100%" />
            </Box>
          </Flex>
        </Flex>
      ) : (
        <Flex h="100vh" direction="column" style={{ background: bgColor }}>
          {/* Clean, minimal header */}
          <Box
            style={{
              background: 'white',
              borderBottom: `1px solid ${borderColor}`,
              height: '56px',
              flexShrink: 0,
            }}
          >
            <Flex align="center" justify="space-between" h="100%" px="xl">
              <Group 
                gap="xs" 
                style={{ cursor: "pointer" }} 
                onClick={() => navigate(route("/dashboard"))}
              >
                {/* Logo mark */}
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: theme.radius.md,
                    background: brandColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconRocket 
                    size={18} 
                    color="white" 
                    stroke={2} 
                  />
                </Box>
                <Text 
                  size="lg" 
                  fw={700} 
                  c={primaryText}
                  style={{
                    letterSpacing: '-0.025em',
                  }}
                >
                  Delivr
                </Text>
              </Group>
              
              <Group gap="md" align="center">
                <Text
                  size="sm"
                  fw={500}
                  onClick={() => window.open('https://dota.dreamsportslabs.com/', '_blank')}
                  style={{ 
                    color: tertiaryText,
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = brandColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tertiaryText;
                  }}
                >
                  Documentation
                </Text>
                <Box
                  style={{
                    width: 1,
                    height: 20,
                    background: borderColor,
                  }}
                />
                <HeaderUserButton user={user} />
              </Group>
            </Flex>
          </Box>

          <Flex style={{ flex: 1, overflow: "hidden" }}>
            {showSidebar && (
              <Sidebar
                organizations={orgs}
                currentOrgId={params.org}
                currentAppId={params.app}
                userEmail={user.user.email}
              />
            )}
            <Box 
              style={{ 
                flex: 1, 
                overflowY: "auto", 
                background: bgColor,
              }}
            >
              <Box
                style={{
                  padding: isMainDashboard ? 0 : 32,
                  minHeight: '100%',
                }}
              >
                <Outlet />
              </Box>
            </Box>
          </Flex>
        </Flex>
      )}
    </SimpleTermsGuard>
  );
}
