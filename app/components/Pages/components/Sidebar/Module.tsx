import {
  Box,
  Text,
  UnstyledButton,
  Collapse,
  useMantineTheme,
  Group,
} from "@mantine/core";
import { useLocation, Link } from "@remix-run/react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import type { ModuleConfig } from "./navigation-data";
import type { Organization } from "./types";
import { SubItems } from "./SubItems";
import { DOTACustomContent } from "./DOTACustomContent";

interface ModuleProps {
  module: ModuleConfig;
  org: Organization;
  currentAppId?: string;
  userEmail: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function Module({
  module,
  org,
  currentAppId,
  userEmail,
  isExpanded,
  onToggleExpand,
}: ModuleProps) {
  const theme = useMantineTheme();
  const location = useLocation();
  const Icon = module.icon;

  // Check if module is active (any sub-item is active)
  const isModuleActive = (() => {
    for (const subItem of module.subItems) {
      // Special handling for Release Dashboard
      if (subItem.path === `/dashboard/${org.id}/releases`) {
        if (
          location.pathname === subItem.path ||
          location.pathname.includes("/release-management")
        ) {
          return true;
        }
      }
      // Special handling for Releases list
      else if (subItem.path === `/dashboard/${org.id}/releases/`) {
        if (
          location.pathname.includes("/releases") &&
          !location.pathname.includes("/releases/setup") &&
          !location.pathname.includes("/releases/settings") &&
          !location.pathname.includes("/releases/configure") &&
          location.pathname !== `/dashboard/${org.id}/releases`
        ) {
          return true;
        }
      }
      // For other routes, use startsWith
      else if (location.pathname.startsWith(subItem.path)) {
        return true;
      }
    }
    
    // For DOTA, check if on apps route or viewing a specific app
    if (module.id === "dota") {
      return location.pathname.includes("/apps") || !!currentAppId;
    }
    
    // Fallback: check if main route is active
    return location.pathname.startsWith(module.mainRoute);
  })();

  // Custom render for DOTA module
  if (module.isCustomRender) {
    return (
      <Box>
        <DOTACustomContent
          module={module}
          org={org}
          currentAppId={currentAppId}
          userEmail={userEmail}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          isActive={isModuleActive}
        />
      </Box>
    );
  }

  // Standard module with expandable sub-items
  return (
    <Box>
      <UnstyledButton
        component={Link}
        to={module.mainRoute}
        prefetch={module.prefetch}
        onClick={() => {
          onToggleExpand();
        }}
        styles={{
          root: {
            display: "block",
            width: "100%",
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.radius.md,
            transition: "all 0.15s ease",
            backgroundColor: isModuleActive ? theme.colors.brand[0] : "transparent",
            borderLeft: isModuleActive
              ? `3px solid ${theme.colors.brand[5]}`
              : "3px solid transparent",
            position: "relative",
            "&:hover": {
              backgroundColor: isModuleActive
                ? theme.colors.brand[0]
                : theme.colors.slate[1],
            },
          },
        }}
      >
        <Group gap="md">
          <Icon
            size={20}
            color={
              isModuleActive
                ? theme.colors.brand[5]
                : theme.colors.slate[5]
            }
            stroke={1.5}
          />
          <Box style={{ flex: 1 }}>
            <Text
              fw={isModuleActive ? 600 : 500}
              size="sm"
              c={isModuleActive ? theme.colors.brand[7] : theme.colors.slate[6]}
            >
              {module.label}
            </Text>
          </Box>
          {isExpanded ? (
            <IconChevronUp
              size={14}
              color={
                isModuleActive
                  ? theme.colors.brand[5]
                  : theme.colors.slate[5]
              }
            />
          ) : (
            <IconChevronDown
              size={14}
              color={
                isModuleActive
                  ? theme.colors.brand[5]
                  : theme.colors.slate[5]
              }
            />
          )}
        </Group>
      </UnstyledButton>

      {module.subItems.length > 0 && (
        <Collapse in={isExpanded}>
          <SubItems
            subItems={module.subItems}
            org={org}
            moduleMainRoute={module.mainRoute}
          />
        </Collapse>
      )}
    </Box>
  );
}

