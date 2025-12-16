import {
  Box,
  Text,
  UnstyledButton,
  Collapse,
  useMantineTheme,
  Group,
} from "@mantine/core";
import { useLocation, Link } from "@remix-run/react";
import { IconChevronRight } from "@tabler/icons-react";
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
      // Special handling for Releases list
      if (subItem.path === `/dashboard/${org.id}/releases/`) {
        if (
          location.pathname.includes("/releases") &&
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
      <Box mb={4}>
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
    <Box mb={4}>
      <UnstyledButton
        component={Link}
        to={module.mainRoute}
        prefetch={module.prefetch}
        onClick={(e) => {
          e.preventDefault();
          onToggleExpand();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          transition: "all 0.15s ease",
          backgroundColor: isModuleActive ? theme.colors.brand[0] : "transparent",
        }}
        styles={{
          root: {
            "&:hover": {
              backgroundColor: isModuleActive
                ? theme.colors.brand[0]
                : theme.colors.slate[1],
            },
          },
        }}
      >
        <Group gap={12} style={{ flex: 1 }}>
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: isModuleActive
                ? theme.colors.brand[1]
                : theme.colors.slate[1],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
          >
            <Icon
              size={18}
              color={isModuleActive ? theme.colors.brand[6] : theme.colors.slate[5]}
              stroke={1.5}
            />
          </Box>
          <Text
            fw={isModuleActive ? 600 : 500}
            size="14px"
            c={isModuleActive ? theme.colors.slate[9] : theme.colors.slate[7]}
            style={{ flex: 1, lineHeight: 1.3 }}
          >
            {module.label}
          </Text>
          <Box
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <IconChevronRight
              size={16}
              color={theme.colors.slate[4]}
              stroke={2}
            />
          </Box>
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

