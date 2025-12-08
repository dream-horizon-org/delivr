import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  Collapse,
  useMantineTheme,
  Group,
} from "@mantine/core";
import { useLocation, Link } from "@remix-run/react";
import {
  IconCloud,
  IconChevronDown,
  IconChevronUp,
  IconAppWindow,
} from "@tabler/icons-react";
import { route } from "routes-gen";
import { useGetAppListForOrg } from "../AppList/hooks/useGetAppListForOrg";
import type { ModuleConfig } from "./navigation-data";
import type { Organization } from "./types";

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
  const { data: apps = [], isLoading } = useGetAppListForOrg({
    orgId: org.id,
    userEmail: userEmail,
  });

  const appsRoute = route("/dashboard/:org/apps", { org: org.id });
  // DOTA is active if on apps route or viewing a specific app
  const isDOTAActive = location.pathname.includes("/apps") || !!currentAppId;

  return (
    <>
      <UnstyledButton
        component={Link}
        to={appsRoute}
        prefetch="render"
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
            backgroundColor: isDOTAActive ? theme.colors.brand[0] : "transparent",
            borderLeft: isDOTAActive
              ? `3px solid ${theme.colors.brand[5]}`
              : "3px solid transparent",
            position: "relative",
            "&:hover": {
              backgroundColor: isDOTAActive
                ? theme.colors.brand[0]
                : theme.colors.slate[1],
            },
          },
        }}
      >
        <Group gap="md">
          <IconCloud
            size={20}
            color={
              isDOTAActive
                ? theme.colors.brand[5]
                : theme.colors.slate[5]
            }
            stroke={1.5}
          />
          <Box style={{ flex: 1 }}>
            <Text
              fw={isDOTAActive ? 600 : 500}
              size="sm"
              c={isDOTAActive ? theme.colors.brand[7] : theme.colors.slate[6]}
            >
              {module.label}
            </Text>
          </Box>
          {isExpanded ? (
            <IconChevronUp
              size={14}
              color={
                isDOTAActive
                  ? theme.colors.brand[5]
                  : theme.colors.slate[5]
              }
            />
          ) : (
            <IconChevronDown
              size={14}
              color={
                isDOTAActive
                  ? theme.colors.brand[5]
                  : theme.colors.slate[5]
              }
            />
          )}
        </Group>
      </UnstyledButton>

      <Collapse in={isExpanded}>
        <Box
          style={{
            paddingLeft: theme.spacing.xl,
            marginTop: theme.spacing.xs,
          }}
        >
          {isLoading ? (
            <Text size="xs" c="dimmed" p="xs">
              Loading apps...
            </Text>
          ) : apps.length === 0 ? (
            <Text size="xs" c="dimmed" p="xs">
              No apps yet
            </Text>
          ) : (
            <Stack gap={4}>
              {apps.map((app) => {
                const isAppActive = app.id === currentAppId;
                const appRoute = route("/dashboard/:org/:app", {
                  org: org.id,
                  app: app.id,
                });

                return (
                  <UnstyledButton
                    key={app.id}
                    component={Link}
                    to={appRoute}
                    prefetch="intent"
                    styles={{
                      root: {
                        width: "100%",
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                        borderRadius: theme.radius.sm,
                        transition: "all 0.15s ease",
                        backgroundColor: isAppActive
                          ? theme.colors.brand[0]
                          : "transparent",
                        borderLeft: isAppActive
                          ? `3px solid ${theme.colors.brand[5]}`
                          : "3px solid transparent",
                        marginLeft: theme.spacing.xs,
                        "&:hover": {
                          backgroundColor: isAppActive
                            ? theme.colors.brand[0]
                            : theme.colors.slate[1],
                        },
                      },
                    }}
                  >
                    <Group gap="sm">
                      <IconAppWindow
                        size={16}
                        color={
                          isAppActive
                            ? theme.colors.brand[5]
                            : theme.colors.slate[5]
                        }
                        stroke={1.5}
                      />
                      <Text
                        fw={isAppActive ? 600 : 400}
                        size="xs"
                        c={isAppActive ? theme.colors.brand[7] : theme.colors.slate[5]}
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {app.name}
                      </Text>
                    </Group>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
        </Box>
      </Collapse>
    </>
  );
}

