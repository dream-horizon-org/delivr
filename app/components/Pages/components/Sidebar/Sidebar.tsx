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
import { useNavigate, useLocation } from "@remix-run/react";
import { route } from "routes-gen";
import type { SidebarProps, Organization } from "./types";
import { getNavigationModules, getOrganizationRoutes } from "./navigation-data";
import { Module } from "./Module";
import { SubItem } from "./SubItem";

// All organizations list (when on dashboard home)
function AllOrgsList({
  organizations,
  onSelectOrg,
}: {
  organizations: Organization[];
  onSelectOrg: (orgId: string) => void;
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
        {organizations.map((org) => {
          const initials = org.orgName.substring(0, 2).toUpperCase();
          return (
            <UnstyledButton
              key={org.id}
              onClick={() => onSelectOrg(org.id)}
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
                    {org.orgName}
                  </Text>
                  <Text size="xs" c={theme.colors.slate[5]}>
                    {org.isAdmin ? "Owner" : "Member"}
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

// Organization-focused sidebar (when inside an org)
function OrgSidebar({
  org,
  currentAppId,
  userEmail,
}: {
  org: Organization;
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

  const modules = getNavigationModules(org);
  const orgRoutes = getOrganizationRoutes(org);
  const initials = org.orgName.substring(0, 2).toUpperCase();

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
              {org.orgName}
            </Text>
            <Badge
              size="xs"
              variant="light"
              color={org.isAdmin ? "brand" : "gray"}
              radius="sm"
              style={{
                textTransform: "capitalize",
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              {org.isAdmin ? "Owner" : "Member"}
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
          {orgRoutes.map((orgRoute) => {
            const isRouteActive = location.pathname.startsWith(orgRoute.path);

            return (
              <Box key={orgRoute.path} mb={4}>
                <SubItem
                  subItem={orgRoute}
                  org={org}
                  isActive={isRouteActive}
                />
              </Box>
            );
          })}
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

  const currentOrg = organizations.find((org) => org.id === currentOrgId);

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
          {currentOrg ? (
            <OrgSidebar
              org={currentOrg}
              currentAppId={currentAppId}
              userEmail={userEmail}
            />
          ) : (
            <AllOrgsList
              organizations={organizations}
              onSelectOrg={(orgId) =>
                navigate(route("/dashboard/:org/ota/apps", { org: orgId }))
              }
            />
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
}
