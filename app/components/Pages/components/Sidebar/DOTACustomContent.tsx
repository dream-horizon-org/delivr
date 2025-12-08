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
import { route } from "routes-gen";
import type { ModuleConfig } from "./navigation-data";
import type { Organization } from "./types";
import { SubItems } from "./SubItems";

interface DOTACustomContentProps {
  module: ModuleConfig;
  org: Organization;
  currentAppId?: string;
  userEmail: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isActive: boolean;
}

export function DOTACustomContent({
  module,
  org,
  currentAppId,
  userEmail,
  isExpanded,
  onToggleExpand,
  isActive,
}: DOTACustomContentProps) {
  const theme = useMantineTheme();
  const location = useLocation();
  const Icon = module.icon;

  const appsRoute = route("/dashboard/:org/apps", { org: org.id });
  // DOTA is active if on apps route or viewing a specific app
  const isDOTAActive = location.pathname.includes("/apps") || !!currentAppId;

  return (
    <Box>
      <UnstyledButton
        component={Link}
        to={appsRoute}
        prefetch="render"
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
          backgroundColor: isDOTAActive ? theme.colors.brand[0] : "transparent",
        }}
        styles={{
          root: {
            "&:hover": {
              backgroundColor: isDOTAActive
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
              backgroundColor: isDOTAActive
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
              color={isDOTAActive ? theme.colors.brand[6] : theme.colors.slate[5]}
              stroke={1.5}
            />
          </Box>
          <Text
            fw={isDOTAActive ? 600 : 500}
            size="14px"
            c={isDOTAActive ? theme.colors.slate[9] : theme.colors.slate[7]}
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

