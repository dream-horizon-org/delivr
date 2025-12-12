import {
  Box,
  Text,
  UnstyledButton,
  Collapse,
  useMantineTheme,
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
          !location.pathname.includes("/releases/workflows") &&
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
        style={{
          width: "100%",
          padding: `${theme.other.spacing.sm} ${theme.other.spacing.md}`,
          borderRadius: theme.other.borderRadius.md,
          transition: theme.other.transitions.fast,
          background: isModuleActive ? theme.other.brand.gradient : "transparent",
          border: "1px solid transparent",
        }}
        styles={{
          root: {
            "&:hover": {
              background: isModuleActive
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
            color={
              isModuleActive
                ? theme.other.text.white
                : theme.other.text.secondary
            }
            stroke={1.5}
          />
          <Box style={{ flex: 1 }}>
            <Text
              fw={theme.other.typography.fontWeight.medium}
              size="sm"
              c={isModuleActive ? "white" : theme.other.text.secondary}
            >
              {module.label}
            </Text>
          </Box>
          {isExpanded ? (
            <IconChevronUp
              size={theme.other.sizes.icon.sm}
              color={
                isModuleActive
                  ? theme.other.text.white
                  : theme.other.text.secondary
              }
            />
          ) : (
            <IconChevronDown
              size={theme.other.sizes.icon.sm}
              color={
                isModuleActive
                  ? theme.other.text.white
                  : theme.other.text.secondary
              }
            />
          )}
        </Box>
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



