import { Flex, Group, Text, Box, Skeleton, useMantineTheme } from "@mantine/core";
import { Outlet, useLoaderData, useNavigate, useParams, useLocation } from "@remix-run/react";
import { route } from "routes-gen";
import type { User } from "~/.server/services/Auth/Auth.interface";import { authenticateLoaderRequest } from "~/utils/authenticate";
import { HeaderUserButton } from "~/components/UserButton/HeaderUserButton";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconHelp } from "@tabler/icons-react";
import { CombinedSidebar } from "~/components/Pages/components/AppDetailPage/components/CombinedSidebar";
import { useGetOrgList } from "~/components/Pages/components/OrgListNavbar/hooks/useGetOrgList";
import delivrFavicon from "~/assets/images/delivr-favicon.svg";

export const loader = authenticateLoaderRequest();

export default function Dashboard() {
  const theme = useMantineTheme();
  const user = useLoaderData<User>();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { data: orgs = [], isLoading: orgsLoading } = useGetOrgList();

  const isMainDashboard = location.pathname === "/dashboard";
  const showSidebar = orgs.length > 0 && !isMainDashboard;

  return (
    orgsLoading ? (
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
            background: theme.other.backgrounds.subtle,
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
              <img
                src={delivrFavicon}
                alt="Delivr"
                style={{
                  height: theme.other.sizes.icon["3xl"],
                  width: "auto",
                  display: "block",
                }}
              />
              <Text 
                size="xl" 
                fw={theme.other.typography.fontWeight.bold} 
                c={theme.other.text.primary}
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
                  onClick={() => window.open('https://delivr.live/dota', '_blank')}
                  style={{ 
                    color: theme.other.text.primary,
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
    )
  );
}
