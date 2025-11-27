import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  ScrollArea,
  useMantineTheme,
  Collapse,
  Modal,
} from "@mantine/core";
import {
  IconPlus,
  IconBuilding,
  IconAppWindow,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import { useGetAppListForOrg } from "../../AppList/hooks/useGetAppListForOrg";
import { CTAButton } from "~/components/CTAButton";
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


// Component for each organization with its apps
function OrgWithApps({
  org,
  isActive,
  currentAppId,
  userEmail,
  isExpanded,
  onToggleExpand,
}: {
  org: Organization;
  isActive: boolean;
  currentAppId?: string;
  userEmail: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
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
          padding: `${theme.other.spacing.md} ${theme.other.spacing.lg}`,
          borderRadius: theme.other.borderRadius.md,
          transition: theme.other.transitions.fast,
          background: isActive
            ? theme.other.brand.gradient
            : "transparent",
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
        <Box style={{ display: "flex", alignItems: "center", gap: theme.other.spacing.md }}>
          <IconBuilding 
            size={theme.other.sizes.icon.xl} 
            color={isActive ? theme.other.text.white : theme.other.text.secondary}
            stroke={1.5}
          />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text
              fw={theme.other.typography.fontWeight.semibold}
              size="md"
              c={isActive ? "white" : theme.other.text.secondary}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {org.orgName}
            </Text>
          </Box>
          <Box
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: theme.other.spacing.xxs,
            }}
          >
            {isExpanded ? (
              <IconChevronUp 
                size={theme.other.sizes.icon.md} 
                color={isActive ? theme.other.text.white : theme.other.text.secondary}
              />
            ) : (
              <IconChevronDown 
                size={theme.other.sizes.icon.md} 
                color={isActive ? theme.other.text.white : theme.other.text.secondary}
              />
            )}
          </Box>
        </Box>
      </UnstyledButton>

      <Collapse in={isExpanded}>
        <Box style={{ paddingLeft: theme.other.spacing.lg, marginTop: theme.other.spacing.sm, marginBottom: theme.other.spacing.sm }}>
          {isLoading ? (
            <Text size="xs" c="dimmed" p="xs">
              Loading apps...
            </Text>
          ) : apps.length === 0 ? (
            <Text size="xs" c="dimmed" p="xs">
              No apps
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
                      padding: `${theme.other.spacing.sm} ${theme.other.spacing.md}`,
                      paddingBottom: theme.other.spacing.md,
                      borderRadius: 0,
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
                        color={isAppActive ? theme.other.brand.primary : theme.other.text.secondary}
                        stroke={1.5}
                      />
                      <Text
                        fw={isAppActive ? theme.other.typography.fontWeight.semibold : theme.other.typography.fontWeight.medium}
                        size="sm"
                        c={isAppActive ? theme.other.brand.primaryDark : theme.other.text.secondary}
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

export function CombinedSidebar({
  organizations,
  currentOrgId,
  currentAppId,
  userEmail,
}: CombinedSidebarProps) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(currentOrgId || null);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  // Auto-expand the organization that contains the current app
  useEffect(() => {
    if (currentOrgId) {
      setExpandedOrgId(currentOrgId);
    }
  }, [currentOrgId, currentAppId]);

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
          paddingRight: theme.other.spacing.lg,
        }}
      >
        <Stack gap="xs" style={{ paddingLeft: theme.other.spacing.lg, paddingTop: theme.other.spacing["3xl"], paddingBottom: theme.other.spacing.md, flex: 1 }}>
          <ScrollArea style={{ height: "calc(100vh - 220px)" }}>
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
            <Stack gap="md">
              {organizations.map((org) => {
                const isActive = org.id === currentOrgId;

                return (
                  <OrgWithApps
                    key={org.id}
                    org={org}
                    isActive={isActive}
                    currentAppId={currentAppId}
                    userEmail={userEmail}
                    isExpanded={expandedOrgId === org.id}
                    onToggleExpand={() => {
                      setExpandedOrgId(expandedOrgId === org.id ? null : org.id);
                    }}
                  />
                );
              })}
            </Stack>
          </ScrollArea>
        </Stack>

        <Box
          style={{
            paddingLeft: theme.other.spacing.lg,
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
