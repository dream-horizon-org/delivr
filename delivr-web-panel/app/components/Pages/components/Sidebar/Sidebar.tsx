import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  ScrollArea,
  useMantineTheme,
  Divider,
  Group,
  Badge,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useLocation, useRouteLoaderData } from "@remix-run/react";
import { route } from "routes-gen";
import type { SidebarProps, Organization } from "./types";
import { getNavigationModules, getOrganizationRoutes, type SubItem } from "./navigation-data";
import { Module } from "./Module";
import { SubItem as SubItemComponent } from "./SubItem";
import { usePermissions } from "~/hooks/usePermissions";
import type { OrgLayoutLoaderData } from "~/routes/dashboard.$org";

// All apps list (when on dashboard home) - renamed from AllOrgsList
function AllAppsList({
  organizations,
  onSelectOrg,
}: {
  organizations: (App | Organization)[];
  onSelectOrg: (appId: string) => void;
}) {
  const theme = useMantineTheme();

  return (
    <Box px={4}>
      <Text
        size="xs"
        fw={600}
        tt="uppercase"
        style={{
          letterSpacing: "0.05em",
          marginBottom: 12,
          paddingLeft: 12,
          color: theme.colors.slate[4],
        }}
      >
        Projects
      </Text>
      <Stack gap={2}>
        {organizations.map((app) => {
          // Handle both App and Organization types
          const displayName = 'displayName' in app ? app.displayName : ('orgName' in app ? app.orgName : app.id);
          const initials = displayName.substring(0, 2).toUpperCase();
          return (
            <UnstyledButton
              key={app.id}
              onClick={() => onSelectOrg(app.id)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                transition: "all 0.15s ease",
              }}
              styles={{
                root: {
                  "&:hover": {
                    backgroundColor: theme.colors.slate[1],
                  },
                },
              }}
            >
              <Group gap={10}>
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {initials}
                </Box>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={500} size="sm" c={theme.colors.slate[8]} truncate>
                    {displayName}
                  </Text>
                  <Text size="xs" c={theme.colors.slate[5]}>
                    {app.isAdmin ? "Owner" : "Member"}
                  </Text>
                </Box>
                <IconChevronRight size={14} color={theme.colors.slate[4]} />
              </Group>
            </UnstyledButton>
          );
        })}
      </Stack>
    </Box>
  );
}

// App-focused sidebar (when inside an app) - renamed from OrgSidebar
function AppSidebar({
  org,
  currentAppId,
  userEmail,
}: {
  org: App | Organization; // Accept both for backward compatibility
  currentAppId?: string;
  userEmail: string;
}) {
  const theme = useMantineTheme();
  const location = useLocation();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    releaseManagement: true,
    dota: true,
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Handle both App and Organization types
  const displayName = 'displayName' in org ? org.displayName : ('orgName' in org ? org.orgName : org.id);
  const appId = org.id;
  const isAdmin = 'isAdmin' in org ? org.isAdmin : false;

  const modules = getNavigationModules(org as Organization); // Type assertion for backward compatibility
  const allOrgRoutes = getOrganizationRoutes(org as Organization); // Type assertion for backward compatibility
  const initials = displayName.substring(0, 2).toUpperCase();

  // Get user data and check permissions to filter visible routes
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';
  const { isOwner, isEditor } = usePermissions(appId, userId);

  // Filter orgRoutes based on permissions (same logic as SubItem component)
  const visibleOrgRoutes = allOrgRoutes.filter((route: SubItem) => {
    // Hide owner-only items if not owner
    if (route.isOwnerOnly && !isOwner && !isAdmin) {
      return false;
    }
    // Hide editor-only items if not editor
    if (route.isEditorOnly && !isEditor && !isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <Box>
      {/* Project Header */}
      <Box
        style={{
          padding: "16px 16px",
          borderBottom: `1px solid ${theme.colors.slate[2]}`,
          marginBottom: 12,
        }}
      >
        <Group gap={12}>
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initials}
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="14px" c={theme.colors.slate[9]} truncate style={{ lineHeight: 1.3 }}>
              {displayName}
            </Text>
            <Badge
              size="xs"
              variant="light"
              color={isAdmin ? "brand" : "gray"}
              radius="sm"
              style={{
                textTransform: "capitalize",
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              {isAdmin ? "Owner" : "Member"}
            </Badge>
          </Box>
        </Group>
      </Box>

      {/* Navigation Items */}
      <Box px={10}>
        <Stack gap={0}>
          {/* Modules Section */}
          <Text
            size="11px"
            fw={600}
            tt="uppercase"
            style={{
              letterSpacing: "0.06em",
              marginBottom: 10,
              marginTop: 4,
              paddingLeft: 4,
              color: theme.colors.slate[4],
            }}
          >
            Modules
          </Text>

          {/* Render Modules */}
          {modules.map((module) => (
            <Module
              key={module.id}
              module={module}
              org={org}
              currentAppId={currentAppId}
              userEmail={userEmail}
              isExpanded={expandedModules[module.id] ?? false}
              onToggleExpand={() => toggleModule(module.id)}
            />
          ))}

          {/* Only show Project section if there are visible routes */}
          {visibleOrgRoutes.length > 0 && (
            <>
          <Divider my={16} color={theme.colors.slate[2]} />

          {/* Project Section */}
          <Text
            size="11px"
            fw={600}
            tt="uppercase"
            style={{
              letterSpacing: "0.06em",
              marginBottom: 10,
              paddingLeft: 4,
              color: theme.colors.slate[4],
            }}
          >
            Project
          </Text>

          {/* Render Project Routes */}
              {visibleOrgRoutes.map((orgRoute) => {
            const isRouteActive = location.pathname.startsWith(orgRoute.path);

            return (
              <Box key={orgRoute.path} mb={4}>
                    <SubItemComponent
                  subItem={orgRoute}
                  org={org}
                  isActive={isRouteActive}
                />
              </Box>
            );
          })}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export function Sidebar({
  organizations,
  currentOrgId,
  currentAppId,
  userEmail,
}: SidebarProps) {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  const currentApp = organizations.find((app) => app.id === currentOrgId); // currentOrgId is actually appId

  return (
    <Box
      style={{
        width: 256,
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRight: `1px solid ${theme.colors.slate[2]}`,
        flexShrink: 0,
      }}
    >
      <ScrollArea style={{ flex: 1 }}>
        <Box py={8}>
          {currentApp ? (
            <AppSidebar
              org={currentApp as Organization} // Type assertion for backward compatibility
              currentAppId={currentAppId}
              userEmail={userEmail}
            />
          ) : (
            <AllAppsList
              organizations={organizations}
              onSelectOrg={(appId) =>
                navigate(route("/dashboard/:org/ota/apps", { org: appId })) // Route param is still $org
              }
            />
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
}
