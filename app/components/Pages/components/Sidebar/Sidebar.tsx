import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  ScrollArea,
  useMantineTheme,
  Modal,
  Divider,
  Group,
} from "@mantine/core";
import {
  IconPlus,
  IconBuilding,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useLocation } from "@remix-run/react";
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
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';

  return (
    <Box>
      <Text
        size="xs"
        fw={600}
        c="dimmed"
        tt="uppercase"
        style={{
          letterSpacing: '0.05em',
          marginBottom: 12,
          paddingLeft: 16,
        }}
      >
        Organizations
      </Text>
      <Stack gap={4}>
        {organizations.map((org) => (
          <UnstyledButton
            key={org.id}
            onClick={() => onSelectOrg(org.id)}
            style={{
              width: "100%",
              padding: '10px 16px',
              borderRadius: 8,
              transition: 'background 0.15s ease',
            }}
            styles={{
              root: {
                "&:hover": {
                  backgroundColor: theme.colors?.slate?.[1] || '#f1f5f9',
                },
              },
            }}
          >
            <Group gap={12}>
              <IconBuilding size={18} color={theme.colors?.slate?.[5] || '#64748b'} stroke={1.5} />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  fw={600}
                  size="sm"
                  c="dark.8"
                  truncate
                >
                  {org.orgName}
                </Text>
                <Text size="xs" c="dimmed">
                  {org.isAdmin ? "Owner" : "Member"}
                </Text>
              </Box>
            </Group>
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
  
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';
  const brandColor = theme.colors?.brand?.[5] || '#14b8a6';

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const modules = getNavigationModules(org);
  const orgRoutes = getOrganizationRoutes(org);

  return (
    <Box>
      {/* Organization Header */}
      <Box
        style={{
          padding: '16px',
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <Group gap={10}>
          <IconBuilding size={20} color={brandColor} stroke={1.5} />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="sm" c="dark.9" truncate>
              {org.orgName}
            </Text>
            <Text size="xs" c="dimmed">
              {org.isAdmin ? "Owner" : "Member"}
            </Text>
          </Box>
        </Group>
      </Box>

      {/* Navigation Items */}
      <Box p={12}>
        <Stack gap={4}>
          {/* Modules Section */}
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            tt="uppercase"
            style={{
              letterSpacing: '0.05em',
              marginBottom: 4,
              paddingLeft: 8,
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

          <Divider my={12} color={borderColor} />

          {/* Organization Section */}
          <Text
            size="xs"
            fw={600}
            c="dimmed"
            tt="uppercase"
            style={{
              letterSpacing: '0.05em',
              marginBottom: 4,
              paddingLeft: 8,
            }}
          >
            Organization
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
  
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';
  const bgColor = theme.colors?.slate?.[0] || '#f8fafc';

  const currentOrg = organizations.find((org) => org.id === currentOrgId);

  return (
    <Box
      style={{
        width: 260,
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: 'white',
        borderRight: `1px solid ${borderColor}`,
      }}
    >
      <Box style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack gap={0} style={{ flex: 1 }}>
          <ScrollArea style={{ flex: 1 }} p={12}>
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
                  navigate(route("/dashboard/:org/apps", { org: orgId }))
                }
              />
            )}
          </ScrollArea>
        </Stack>

        {/* Bottom CTA */}
        <Box
          style={{
            padding: 16,
            borderTop: `1px solid ${borderColor}`,
          }}
        >
          <CTAButton
            fullWidth
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateOrgOpen(true)}
            size="sm"
          >
            New Organization
          </CTAButton>
        </Box>
      </Box>

      {/* Create Organization Modal */}
      <Modal
        opened={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        title={<Text fw={600} size="md">Create Organization</Text>}
        centered
        size="sm"
        padding="lg"
        radius="md"
        overlayProps={{ backgroundOpacity: 0.2, blur: 2 }}
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
