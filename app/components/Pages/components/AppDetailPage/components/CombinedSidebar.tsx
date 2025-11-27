import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  ScrollArea,
  useMantineTheme,
  Collapse,
  Modal,
  Divider,
} from "@mantine/core";
import {
  IconPlus,
  IconBuilding,
  IconAppWindow,
  IconChevronDown,
  IconChevronUp,
  IconUsers,
  IconSettings,
  IconRocket,
  IconCloud,
  IconChartBar,
  IconList,
  IconPlug,
  IconAdjustmentsHorizontal,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "@remix-run/react";
import { route } from "routes-gen";
import { useGetAppListForOrg } from "../../AppList/hooks/useGetAppListForOrg";
import { CTAButton } from "~/components/Common/CTAButton";
import { CreateOrgModal } from "~/components/Pages/components/OrgsPage/components/CreateOrgModal";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";

type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
};

type CombinedSidebarProps = {
  organizations: Organization[];
  currentOrgId?: string;
  currentAppId?: string;
  userEmail: string;
};

// Navigation item component
function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  isOwnerOnly = false,
  isOwner = false,
}: {
  icon: any;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isOwnerOnly?: boolean;
  isOwner?: boolean;
}) {
  const theme = useMantineTheme();

  // Hide owner-only items if not owner
  if (isOwnerOnly && !isOwner) {
    return null;
  }

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        width: "100%",
        padding: `${theme.other.spacing.sm} ${theme.other.spacing.md}`,
        borderRadius: theme.other.borderRadius.md,
        transition: theme.other.transitions.fast,
        background: isActive ? theme.other.brand.gradient : "transparent",
        border: "1px solid transparent",
      }}
      styles={{
        root: {
          "&:hover": {
            background: isActive
              ? theme.other.brand.gradient
              : theme.other.backgrounds.hover,
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
        <Icon
          size={theme.other.sizes.icon.lg}
          color={isActive ? theme.other.text.white : theme.other.text.secondary}
          stroke={1.5}
        />
        <Text
          fw={theme.other.typography.fontWeight.medium}
          size="sm"
          c={isActive ? "white" : theme.other.text.secondary}
        >
          {label}
        </Text>
      </Box>
    </UnstyledButton>
  );
}

// OTA Module with expandable apps
function OTAModule({
  org,
  currentAppId,
  userEmail,
  isExpanded,
  onToggleExpand,
  isActive,
}: {
  org: Organization;
  currentAppId?: string;
  userEmail: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isActive: boolean;
}) {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  const { data: apps = [], isLoading } = useGetAppListForOrg({
    orgId: org.id,
    userEmail: userEmail,
  });

  return (
    <Box>
      <UnstyledButton
        onClick={() => {
          onToggleExpand();
          navigate(route("/dashboard/:org/apps", { org: org.id }));
        }}
        style={{
          width: "100%",
          padding: `${theme.other.spacing.sm} ${theme.other.spacing.md}`,
          borderRadius: theme.other.borderRadius.md,
          transition: theme.other.transitions.fast,
          background: isActive ? theme.other.brand.gradient : "transparent",
          border: "1px solid transparent",
        }}
        styles={{
          root: {
            "&:hover": {
              background: isActive
                ? theme.other.brand.gradient
                : theme.other.backgrounds.hover,
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
          <IconCloud
            size={theme.other.sizes.icon.lg}
            color={isActive ? theme.other.text.white : theme.other.text.secondary}
            stroke={1.5}
          />
          <Box style={{ flex: 1 }}>
            <Text
              fw={theme.other.typography.fontWeight.medium}
              size="sm"
              c={isActive ? "white" : theme.other.text.secondary}
            >
              OTA (Over-The-Air)
            </Text>
          </Box>
          {isExpanded ? (
            <IconChevronUp
              size={theme.other.sizes.icon.sm}
              color={isActive ? theme.other.text.white : theme.other.text.secondary}
            />
          ) : (
            <IconChevronDown
              size={theme.other.sizes.icon.sm}
              color={isActive ? theme.other.text.white : theme.other.text.secondary}
            />
          )}
        </Box>
      </UnstyledButton>

      <Collapse in={isExpanded}>
        <Box style={{ paddingLeft: theme.other.spacing.xl, marginTop: theme.other.spacing.xs }}>
          {isLoading ? (
            <Text size="xs" c="dimmed" p="xs">
              Loading apps...
            </Text>
          ) : apps.length === 0 ? (
            <Text size="xs" c="dimmed" p="xs">
              No apps yet
            </Text>
          ) : (
            <Stack gap="xxs">
              {apps.map((app) => {
                const isAppActive = app.id === currentAppId;

                return (
                  <UnstyledButton
                    key={app.id}
                    onClick={() => {
                      navigate(
                        route("/dashboard/:org/:app", {
                          org: org.id,
                          app: app.id,
                        })
                      );
                    }}
                    style={{
                      width: "100%",
                      padding: `${theme.other.spacing.xs} ${theme.other.spacing.sm}`,
                      borderRadius: theme.other.borderRadius.sm,
                      transition: theme.other.transitions.fast,
                      backgroundColor: isAppActive
                        ? theme.other.brand.light
                        : "transparent",
                    }}
                    styles={{
                      root: {
                        "&:hover": {
                          backgroundColor: isAppActive
                            ? theme.other.brand.light
                            : theme.other.backgrounds.hover,
                        },
                      },
                    }}
                  >
                    <Box
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: theme.other.spacing.sm,
                      }}
                    >
                      <IconAppWindow
                        size={theme.other.sizes.icon.md}
                        color={
                          isAppActive
                            ? theme.other.brand.primary
                            : theme.other.text.tertiary
                        }
                        stroke={1.5}
                      />
                      <Text
                        fw={
                          isAppActive
                            ? theme.other.typography.fontWeight.semibold
                            : theme.other.typography.fontWeight.regular
                        }
                        size="xs"
                        c={
                          isAppActive
                            ? theme.other.brand.primaryDark
                            : theme.other.text.tertiary
                        }
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {app.name}
                      </Text>
                    </Box>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </Box>
      </Collapse>
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
  const navigate = useNavigate();
  const location = useLocation();
  const [otaExpanded, setOtaExpanded] = useState(true);

  const isManageActive = location.pathname.includes("/manage");
  const isOTAActive = location.pathname.includes("/apps") || !!currentAppId;
  // Updated: Release Dashboard is now /releases (index), Releases List is /releases/list
  const isReleaseDashboardActive = location.pathname === `/dashboard/${org.id}/releases` || 
                                     location.pathname.includes("/release-management");
  const isReleasesActive = location.pathname.includes("/releases") || 
                           (location.pathname.includes("/releases/") && 
                            !location.pathname.includes("/releases/setup") &&
                            !location.pathname.includes("/releases/settings") &&
                            !location.pathname.includes("/releases/configure") &&
                            location.pathname !== `/dashboard/${org.id}/releases`);
  const isReleaseSettingsActive = location.pathname.includes("/releases/settings") ||
                                  location.pathname.includes("/releases/configure");
  const isIntegrationsActive = location.pathname.includes("/integrations");

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

          {/* Release Management Dashboard - Analytics View */}
          <NavItem
            icon={IconChartBar}
            label="Release Dashboard"
            isActive={isReleaseDashboardActive}
            onClick={() => navigate(`/dashboard/${org.id}/releases`)}
          />

          {/* Releases List - List View */}
          <NavItem
            icon={IconList}
            label="Releases"
            isActive={isReleasesActive}
            onClick={() => navigate(`/dashboard/${org.id}/releases/`)}
          />

          {/* Integrations */}
          <NavItem
            icon={IconPlug}
            label="Integrations"
            isActive={isIntegrationsActive}
            onClick={() => navigate(`/dashboard/${org.id}/integrations`)}
            isOwnerOnly={true}
            isOwner={org.isAdmin}
          />

          {/* Release Settings */}
          <NavItem
            icon={IconAdjustmentsHorizontal}
            label="Release Settings"
            isActive={isReleaseSettingsActive}
            onClick={() => navigate(`/dashboard/${org.id}/releases/settings`)}
            isOwnerOnly={true}
            isOwner={org.isAdmin}
          />

          <Divider my="sm" />

          {/* OTA (Over-The-Air) */}
          <OTAModule
            org={org}
            currentAppId={currentAppId}
            userEmail={userEmail}
            isExpanded={otaExpanded}
            onToggleExpand={() => setOtaExpanded(!otaExpanded)}
            isActive={isOTAActive}
          />

          <Divider my="sm" />

          {/* Team & Settings Section */}
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

          {/* Manage Team - Owner Only */}
          <NavItem
            icon={IconUsers}
            label="Manage Team"
            isActive={isManageActive}
            onClick={() => navigate(route("/dashboard/:org/manage", { org: org.id }))}
            isOwnerOnly={true}
            isOwner={org.isAdmin}
          />

          {/* Delete functionality moved to state-based modal in OrgsPage */}
          {/* Removed Settings item that incorrectly navigated to delete route */}
        </Stack>
      </Box>
    </Box>
  );
}

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

export function CombinedSidebar({
  organizations,
  currentOrgId,
  currentAppId,
  userEmail,
}: CombinedSidebarProps) {
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
              <OrgSidebar org={currentOrg} currentAppId={currentAppId} userEmail={userEmail} />
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
