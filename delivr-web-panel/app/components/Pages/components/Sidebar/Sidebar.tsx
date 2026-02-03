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
  ActionIcon,
  Modal,
  TextInput,
  Button,
  Checkbox,
  Paper,
} from "@mantine/core";
import { IconChevronRight, IconPencil } from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useRouteLoaderData, useRevalidator } from "@remix-run/react";
import { route } from "routes-gen";
import type { SidebarProps, App } from "./types";
import { getNavigationModules, getOrganizationRoutes, type SubItem } from "./navigation-data";
import { Module } from "./Module";
import { SubItem as SubItemComponent } from "./SubItem";
import { usePermissions } from "~/hooks/usePermissions";
import type { OrgLayoutLoaderData } from "~/routes/dashboard.$org";
import type { SystemMetadataBackend } from "~/types/system-metadata";
import { showSuccessToast, showErrorToast } from "~/utils/toast";
import { AppBadge } from "~/components/Common/AppBadge";
import { useQueryClient } from "react-query";
import { refetchAppConfigInBackground } from "~/utils/cache-invalidation";

type PlatformTargetPair = { platform: string; target: string };

// All apps list (when on dashboard home) - renamed from AllOrgsList
function AllAppsList({
  organizations,
  onSelectOrg,
}: {
  organizations: App[];
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
          const displayName = app.displayName;
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
  org: App;
  currentAppId?: string;
  userEmail: string;
}) {
  const theme = useMantineTheme();
  const location = useLocation();
  const revalidator = useRevalidator();
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    releaseManagement: true,
    dota: true,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editAppName, setEditAppName] = useState("");
  const [editPlatformTargets, setEditPlatformTargets] = useState<PlatformTargetPair[]>([]);
  const [savingName, setSavingName] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Get user data and check permissions to filter visible routes (before using orgLayoutData below)
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const dashboardData = useRouteLoaderData<{ initialSystemMetadata: SystemMetadataBackend | null }>('routes/dashboard');
  const userId = (orgLayoutData?.user as { user?: { id?: string } } | undefined)?.user?.id ?? '';
  const systemMetadata = dashboardData?.initialSystemMetadata;

  // Prefer layout loader app name so it updates after edit + revalidate
  const displayName = orgLayoutData?.app?.displayName ?? org.displayName;
  const appId = org.id;
  const isAdmin = org.isAdmin;
  const platformTargets = useMemo(
    () => (Array.isArray(orgLayoutData?.platformTargets) ? orgLayoutData.platformTargets : []),
    [orgLayoutData?.platformTargets]
  );
  const platforms = useMemo(
    () => systemMetadata?.releaseManagement?.platforms ?? [],
    [systemMetadata]
  );
  const targets = useMemo(
    () => systemMetadata?.releaseManagement?.targets ?? [],
    [systemMetadata]
  );

  const getPlatformName = (id: string) => platforms.find((p) => p.id === id)?.name ?? id;
  const getTargetName = (id: string) => targets.find((t) => t.id === id)?.name ?? id;

  // Group by platform so each platform appears once, then list targets (with names for display)
  const platformTargetsByPlatform = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const pt of platformTargets) {
      const existing = map.get(pt.platform) ?? [];
      if (!existing.includes(pt.target)) existing.push(pt.target);
      map.set(pt.platform, existing);
    }
    return Array.from(map.entries()).map(([platformId, targetIds]) => ({
      platformId,
      platformName: getPlatformName(platformId),
      targets: targetIds.map((targetId) => ({ id: targetId, name: getTargetName(targetId) })),
    }));
  }, [platformTargets, platforms, targets]);

  const allModules = getNavigationModules(org as App);
  const hasDotaTarget = orgLayoutData?.initialAppConfig?.hasDotaTarget ??
    orgLayoutData?.initialAppConfig?.enabledTargets?.includes('DOTA') ??
    false;
  const modules = hasDotaTarget
    ? allModules
    : allModules.filter((m) => m.id !== 'dota');
  const allOrgRoutes = getOrganizationRoutes(org as App);
  const initials = displayName.substring(0, 2).toUpperCase();
  const { isOwner, isEditor } = usePermissions(appId, userId);
  const canEdit = isOwner || isEditor;

  // Sync edit form when modal opens
  useEffect(() => {
    if (editModalOpen) {
      setEditAppName(orgLayoutData?.app?.displayName ?? org.displayName);
      setEditPlatformTargets(Array.isArray(orgLayoutData?.platformTargets) ? [...orgLayoutData.platformTargets] : []);
    }
  }, [editModalOpen, orgLayoutData?.app?.displayName, orgLayoutData?.platformTargets, org.displayName]);

  const togglePair = (platform: string, target: string) => {
    setEditPlatformTargets((prev) => {
      const exists = prev.some((pt) => pt.platform === platform && pt.target === target);
      if (exists) return prev.filter((pt) => !(pt.platform === platform && pt.target === target));
      return [...prev, { platform, target }];
    });
  };
  const isPairSelected = (platform: string, target: string) =>
    editPlatformTargets.some((pt) => pt.platform === platform && pt.target === target);

  const handleSaveName = async () => {
    if (!editAppName.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/v1/apps/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: editAppName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update app name");
      showSuccessToast({ message: "App name updated" });
      revalidator.revalidate();
      refetchAppConfigInBackground(queryClient, appId);
    } catch (e) {
      showErrorToast({ title: "Error", message: e instanceof Error ? e.message : "Failed to update" });
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePlatformTargets = async () => {
    if (editPlatformTargets.length === 0) {
      showErrorToast({ title: "Select at least one", message: "Choose at least one platform and target." });
      return;
    }
    setSavingTargets(true);
    try {
      const res = await fetch(`/api/v1/apps/${appId}/platform-targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platformTargets: editPlatformTargets }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? data?.message ?? "Failed to save");
      }
      showSuccessToast({ message: "Platform targets saved" });
      revalidator.revalidate();
      refetchAppConfigInBackground(queryClient, appId);
    } catch (e) {
      showErrorToast({ title: "Error", message: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setSavingTargets(false);
    }
  };

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
      {/* Project Header: current app, platforms & targets, edit */}
      <Box
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${theme.colors.slate[2]}`,
          marginBottom: 12,
        }}
      >
        <Group gap={10} wrap="nowrap" align="flex-start">
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
              flexShrink: 0,
            }}
          >
            {initials}
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} wrap="nowrap" align="center">
              <Text fw={600} size="14px" c={theme.colors.slate[9]} truncate style={{ lineHeight: 1.3 }}>
                {displayName}
              </Text>
              {canEdit && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  onClick={() => setEditModalOpen(true)}
                  aria-label="Edit app"
                >
                  <IconPencil size={14} />
                </ActionIcon>
              )}
            </Group>
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
            {platformTargetsByPlatform.length > 0 ? (
              <Group gap={4} mt={6} wrap="wrap" style={{ overflow: "visible" }}>
                {platformTargetsByPlatform.map(({ platformId, platformName, targets: platformTargetList }) => (
                  <Group key={platformId} gap={4} wrap="wrap">
                    <AppBadge type="platform" value={platformId} title={platformName} size="xs" style={{ maxWidth: "none" }} />
                    {platformTargetList.map((t) => (
                      <AppBadge key={t.id} type="target" value={t.id} title={t.name} size="xs" style={{ maxWidth: "none" }} />
                    ))}
                  </Group>
                ))}
              </Group>
            ) : (
              <Text size="xs" c="dimmed" mt={6}>
                Not configured
              </Text>
            )}
          </Box>
        </Group>
      </Box>

      {/* Edit app modal */}
      <Modal
        title="Edit app"
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        size="md"
      >
        <Stack gap="lg">
          <Paper p="md" withBorder radius="md">
            <Text size="sm" fw={600} mb="xs">
              App name
            </Text>
            <TextInput
              placeholder="Enter app name"
              value={editAppName}
              onChange={(e) => setEditAppName(e.currentTarget.value)}
              size="sm"
            />
            <Button size="sm" mt="sm" onClick={handleSaveName} loading={savingName}>
              Save name
            </Button>
          </Paper>
          <Paper p="md" withBorder radius="md">
            <Text size="sm" fw={600} mb="xs">
              Platforms & targets
            </Text>
            <Text size="xs" c="dimmed" mb="sm">
              Choose which platforms and distribution targets this app will use.
            </Text>
            <Box>
              {platforms.map((platform) => (
                <Box key={platform.id} mb="sm">
                  <Text size="xs" fw={600} mb={4}>
                    {platform.name}
                  </Text>
                  <Group gap="md">
                    {(platform.applicableTargets ?? []).map((targetId) => {
                      const target = targets.find((t) => t.id === targetId);
                      if (!target) return null;
                      return (
                        <Checkbox
                          key={`${platform.id}-${targetId}`}
                          label={target.name}
                          checked={isPairSelected(platform.id, targetId)}
                          onChange={() => togglePair(platform.id, targetId)}
                        />
                      );
                    })}
                  </Group>
                </Box>
              ))}
            </Box>
            <Button
              size="sm"
              onClick={handleSavePlatformTargets}
              loading={savingTargets}
              disabled={editPlatformTargets.length === 0}
            >
              Save platforms & targets
            </Button>
          </Paper>
        </Stack>
      </Modal>

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
              org={currentApp}
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
