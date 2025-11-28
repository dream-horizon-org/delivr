import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  Collapse,
  useMantineTheme,
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
            padding: `${theme.other.spacing.sm} ${theme.other.spacing.md}`,
            borderRadius: theme.other.borderRadius.md,
            transition: theme.other.transitions.fast,
            backgroundColor: isDOTAActive ? theme.other.brand.light : "transparent",
            borderLeft: isDOTAActive
              ? `3px solid ${theme.other.brand.primary}`
              : "3px solid transparent",
            position: "relative",
            "&:hover": {
              backgroundColor: isDOTAActive
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
            gap: theme.other.spacing.md,
          }}
        >
          <IconCloud
            size={theme.other.sizes.icon.lg}
            color={
              isDOTAActive
                ? theme.other.brand.primary
                : theme.other.text.secondary
            }
            stroke={1.5}
          />
          <Box style={{ flex: 1 }}>
            <Text
              fw={
                isDOTAActive
                  ? theme.other.typography.fontWeight.semibold
                  : theme.other.typography.fontWeight.medium
              }
              size="sm"
              c={
                isDOTAActive
                  ? theme.other.brand.primaryDark
                  : theme.other.text.secondary
              }
            >
              {module.label}
            </Text>
          </Box>
          {isExpanded ? (
            <IconChevronUp
              size={theme.other.sizes.icon.sm}
              color={
                isDOTAActive
                  ? theme.other.brand.primary
                  : theme.other.text.secondary
              }
            />
          ) : (
            <IconChevronDown
              size={theme.other.sizes.icon.sm}
              color={
                isDOTAActive
                  ? theme.other.brand.primary
                  : theme.other.text.secondary
              }
            />
          )}
        </Box>
      </UnstyledButton>

      <Collapse in={isExpanded}>
        <Box
          style={{
            paddingLeft: theme.other.spacing.xl,
            marginTop: theme.other.spacing.xs,
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
            <Stack gap="xxs">
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
                        padding: `${theme.other.spacing.xs} ${theme.other.spacing.sm}`,
                        borderRadius: theme.other.borderRadius.sm,
                        transition: theme.other.transitions.fast,
                        backgroundColor: isAppActive
                          ? theme.other.brand.light
                          : "transparent",
                        borderLeft: isAppActive
                          ? `3px solid ${theme.other.brand.primary}`
                          : "3px solid transparent",
                        marginLeft: theme.other.spacing.xs,
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
    </>
  );
}

