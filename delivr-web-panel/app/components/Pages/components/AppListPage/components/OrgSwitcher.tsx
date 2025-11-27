import {
  Box,
  Text,
  UnstyledButton,
  Stack,
  ScrollArea,
  ActionIcon,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import { useState } from "react";

type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
};

type OrgSwitcherProps = {
  organizations: Organization[];
  currentOrgId?: string;
};

const getOrgColorFromTheme = (orgName: string, theme: any) => {
  const colors = [
    { bg: theme.other.brand.primary, light: theme.other.brand.light },
    { bg: theme.other.brand.secondary, light: theme.other.brand.light },
    { bg: theme.other.brand.primaryDark, light: theme.other.brand.light },
    { bg: theme.other.brand.tertiary, light: theme.other.brand.light },
    { bg: theme.other.brand.quaternary, light: theme.other.brand.light },
  ];
  
  const hash = orgName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (orgName: string) => {
  const words = orgName.trim().split(" ");
  if (words.length === 1) {
    return orgName.substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

export function OrgSwitcher({
  organizations,
  currentOrgId,
}: OrgSwitcherProps) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <Box
      style={{
        width: isCollapsed ? theme.other.sizes.sidebar.collapsed || "80px" : theme.other.sizes.sidebar.width,
        height: "calc(100vh - 120px)",
        borderRight: `1px solid ${theme.other.borders.secondary}`,
        paddingRight: isCollapsed ? "0" : theme.other.spacing.lg,
        transition: theme.other.transitions.normal,
        position: "relative",
      }}
    >
      <Stack gap="xs" style={{ paddingLeft: isCollapsed ? theme.other.spacing.sm : "0" }}>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            marginBottom: theme.other.spacing.sm,
          }}
        >
          {!isCollapsed && (
            <Text size="sm" c="dimmed" fw={theme.other.typography.fontWeight.semibold} tt="uppercase">
              Organizations
            </Text>
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setIsCollapsed(!isCollapsed)}
            size="sm"
          >
            {isCollapsed ? (
              <IconChevronRight size={theme.other.sizes.icon.md} />
            ) : (
              <IconChevronLeft size={theme.other.sizes.icon.md} />
            )}
          </ActionIcon>
        </Box>

        <ScrollArea style={{ height: "calc(100vh - 180px)" }}>
          <Stack gap="xs">
            {organizations.map((org) => {
              const isActive = org.id === currentOrgId;
              const colors = getOrgColorFromTheme(org.orgName, theme);
              const initials = getInitials(org.orgName);

              if (isCollapsed) {
                return (
                  <Tooltip
                    key={org.id}
                    label={org.orgName}
                    position="right"
                    withArrow
                  >
                    <UnstyledButton
                      onClick={() => {
                        navigate(route("/dashboard/:org/apps", { org: org.id }));
                      }}
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: theme.other.borderRadius.lg,
                        transition: theme.other.transitions.fast,
                        border: isActive
                          ? `2px solid ${theme.other.brand.primary}`
                          : "2px solid transparent",
                        padding: theme.other.spacing.xxs,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Box
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: theme.other.borderRadius.md,
                          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: isActive
                            ? theme.other.shadows.md
                            : theme.other.shadows.sm,
                        }}
                      >
                        <Text
                          size="sm"
                          fw={theme.other.typography.fontWeight.bold}
                          c="white"
                          style={{
                            fontSize: theme.other.typography.fontSize.base,
                            letterSpacing: theme.other.typography.letterSpacing.wide,
                          }}
                        >
                          {initials}
                        </Text>
                      </Box>
                    </UnstyledButton>
                  </Tooltip>
                );
              }

              return (
                <UnstyledButton
                  key={org.id}
                  onClick={() => {
                    navigate(route("/dashboard/:org/apps", { org: org.id }));
                  }}
                  style={{
                    width: "100%",
                    padding: `${theme.other.spacing.md} ${theme.other.spacing.lg}`,
                    borderRadius: theme.other.borderRadius.md,
                    transition: theme.other.transitions.fast,
                    backgroundColor: isActive
                      ? `rgba(${parseInt(theme.other.brand.primary.slice(1, 3), 16)}, ${parseInt(theme.other.brand.primary.slice(3, 5), 16)}, ${parseInt(theme.other.brand.primary.slice(5, 7), 16)}, 0.12)`
                      : "transparent",
                    border: isActive
                      ? `2px solid ${theme.other.brand.primary}`
                      : "2px solid transparent",
                  }}
                  styles={{
                    root: {
                      "&:hover": {
                        backgroundColor: isActive
                          ? `rgba(${parseInt(theme.other.brand.primary.slice(1, 3), 16)}, ${parseInt(theme.other.brand.primary.slice(3, 5), 16)}, ${parseInt(theme.other.brand.primary.slice(5, 7), 16)}, 0.12)`
                          : `rgba(${parseInt(theme.other.brand.primary.slice(1, 3), 16)}, ${parseInt(theme.other.brand.primary.slice(3, 5), 16)}, ${parseInt(theme.other.brand.primary.slice(5, 7), 16)}, ${theme.other.opacity.subtle})`,
                      },
                    },
                  }}
                >
                  <Box style={{ display: "flex", alignItems: "center", gap: theme.other.spacing.md }}>
                    <Box
                      style={{
                        width: theme.other.sizes.icon["4xl"],
                        height: theme.other.sizes.icon["4xl"],
                        borderRadius: theme.other.borderRadius.md,
                        background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: theme.other.shadows.sm,
                      }}
                    >
                      <Text
                        size="xs"
                        fw={700}
                        c="white"
                        style={{
                          fontSize: "14px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {initials}
                      </Text>
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        fw={isActive ? theme.other.typography.fontWeight.semibold : theme.other.typography.fontWeight.medium}
                        size="sm"
                        c={isActive ? theme.other.brand.primary : theme.other.text.primary}
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {org.orgName}
                      </Text>
                      {isActive && (
                        <Text size="xs" c="dimmed" mt={2}>
                          Current organization
                        </Text>
                      )}
                    </Box>
                  </Box>
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );
}

