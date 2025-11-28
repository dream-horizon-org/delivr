import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  ScrollArea,
  useMantineTheme,
  Modal,
  Divider,
} from "@mantine/core";
import {
  IconPlus,
  IconBuilding,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useLocation, Link } from "@remix-run/react";
import { route } from "routes-gen";
import { CTAButton } from "~/components/Common/CTAButton";
import { CreateOrgModal } from "~/components/Pages/components/OrgsPage/components/CreateOrgModal";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";
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
    <Box>
      <Text
        size="sm"
        fw={theme.other.typography.fontWeight.semibold}
        c={theme.other.text.disabled}
        style={{
          letterSpacing: theme.other.typography.letterSpacing.wider,
          marginBottom: theme.other.spacing.md,
          paddingLeft: theme.other.spacing.lg,
        }}
      >
        ORGANIZATIONS
      </Text>
      <Stack gap="xs">
        {organizations.map((org) => (
          <UnstyledButton
            key={org.id}
            onClick={() => onSelectOrg(org.id)}
            style={{
              width: "100%",
              padding: `${theme.other.spacing.md} ${theme.other.spacing.lg}`,
              borderRadius: theme.other.borderRadius.md,
              transition: theme.other.transitions.fast,
            }}
            styles={{
              root: {
                "&:hover": {
                  backgroundColor: theme.other.backgrounds.hover,
                },
              },
            }}
          >
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                gap: theme.other.spacing.md,
              }}
            >
              <IconBuilding
                size={theme.other.sizes.icon.xl}
                color={theme.other.text.secondary}
                stroke={1.5}
              />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  fw={theme.other.typography.fontWeight.semibold}
                  size="md"
                  c={theme.other.text.primary}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {org.orgName}
                </Text>
                <Text size="xs" c="dimmed">
                  {org.isAdmin ? "Owner" : "Member"}
                </Text>
              </Box>
            </Box>
          </UnstyledButton>
        ))}
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

  // Get navigation modules from data object
  const modules = getNavigationModules(org);
  const orgRoutes = getOrganizationRoutes(org);

  return (
    <Box>
      {/* Organization Header */}
      <Box
        style={{
          padding: `${theme.other.spacing.lg} ${theme.other.spacing.lg}`,
          borderBottom: `1px solid ${theme.other.borders.primary}`,
        }}
      >
        <Box style={{ display: "flex", alignItems: "center", gap: theme.other.spacing.sm }}>
          <IconBuilding
            size={theme.other.sizes.icon.xl}
            color={theme.other.brand.primary}
            stroke={1.5}
          />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text
              fw={theme.other.typography.fontWeight.bold}
              size="md"
              c={theme.other.text.primary}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {org.orgName}
            </Text>
            <Text size="xs" c="dimmed">
              {org.isAdmin ? "Owner" : "Member"}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Navigation Items */}
      <Box style={{ padding: theme.other.spacing.md }}>
        <Stack gap="xs">
          {/* Modules Section */}
          <Text
            size="xs"
            fw={theme.other.typography.fontWeight.semibold}
            c={theme.other.text.disabled}
            style={{
              letterSpacing: theme.other.typography.letterSpacing.wider,
              marginBottom: theme.other.spacing.xs,
              paddingLeft: theme.other.spacing.sm,
            }}
          >
            MODULES
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

          <Divider my="sm" />

          {/* Organization Section */}
          <Text
            size="xs"
            fw={theme.other.typography.fontWeight.semibold}
            c={theme.other.text.disabled}
            style={{
              letterSpacing: theme.other.typography.letterSpacing.wider,
              marginBottom: theme.other.spacing.xs,
              paddingLeft: theme.other.spacing.sm,
            }}
          >
            ORGANIZATION
          </Text>

          {/* Render Organization Routes */}
          {orgRoutes.map((orgRoute) => {
            const isRouteActive = location.pathname.startsWith(orgRoute.path);

            return (
              <SubItem
                key={orgRoute.path}
                subItem={orgRoute}
                org={org}
                isActive={isRouteActive}
              />
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
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const currentOrg = organizations.find((org) => org.id === currentOrgId);

  return (
    <Box
      style={{
        width: theme.other.sizes.sidebar.width,
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: theme.other.backgrounds.tertiary,
        borderRight: `1px solid ${theme.other.borders.primary}`,
      }}
    >
      <Box
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          gap="xs"
          style={{
            paddingTop: theme.other.spacing["3xl"],
            paddingBottom: theme.other.spacing.md,
            flex: 1,
          }}
        >
          <ScrollArea style={{ height: "calc(100vh - 220px)" }}>
            {currentOrg ? (
              // Show org-specific navigation when inside an org
              <OrgSidebar
                org={currentOrg}
                currentAppId={currentAppId}
                userEmail={userEmail}
              />
            ) : (
              // Show all orgs when on dashboard home
              <AllOrgsList
                organizations={organizations}
                onSelectOrg={(orgId) =>
                  navigate(route("/dashboard/:org/apps", { org: orgId }))
                }
              />
            )}
          </ScrollArea>
        </Stack>

        <Box
          style={{
            paddingLeft: theme.other.spacing.lg,
            paddingRight: theme.other.spacing.lg,
            paddingTop: theme.other.spacing.md,
            paddingBottom: theme.other.spacing.lg,
            borderTop: `1px solid ${theme.other.borders.primary}`,
          }}
        >
          <CTAButton
            fullWidth
            leftSection={<IconPlus size={theme.other.sizes.icon.lg} />}
            onClick={() => setCreateOrgOpen(true)}
            styles={{
              root: {
                boxShadow: theme.other.shadows.md,
              },
            }}
          >
            Create Organization
          </CTAButton>
        </Box>
      </Box>

      {/* Create Organization Modal */}
      <Modal
        opened={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        title="Create Organization"
        centered
      >
        <CreateOrgModal
          onSuccess={() => {
            actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
            setCreateOrgOpen(false);
          }}
        />
      </Modal>
    </Box>
  );
}
