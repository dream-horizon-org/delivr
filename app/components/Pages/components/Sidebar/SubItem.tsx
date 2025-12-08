import { Box, Text, UnstyledButton, useMantineTheme, Group } from "@mantine/core";
import { Link } from "@remix-run/react";
import type { SubItem as SubItemType } from "./navigation-data";
import type { Organization } from "./types";

interface SubItemProps {
  subItem: SubItemType;
  org: Organization;
  isActive: boolean;
}

export function SubItem({ subItem, org, isActive }: SubItemProps) {
  const theme = useMantineTheme();
  const Icon = subItem.icon;

  // Hide owner-only items if not owner
  if (subItem.isOwnerOnly && !org.isAdmin) {
    return null;
  }

  return (
    <UnstyledButton
      component={Link}
      to={subItem.path}
      prefetch={subItem.prefetch}
      styles={{
        root: {
          width: "100%",
          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
          borderRadius: theme.radius.sm,
          transition: "all 0.15s ease",
          backgroundColor: isActive ? theme.colors.brand[0] : "transparent",
          borderLeft: isActive
            ? `3px solid ${theme.colors.brand[5]}`
            : "3px solid transparent",
          marginLeft: theme.spacing.xs,
          "&:hover": {
            backgroundColor: isActive
              ? theme.colors.brand[0]
              : theme.colors.slate[1],
          },
        },
      }}
    >
      <Group gap="sm">
        <Icon
          size={16}
          color={
            isActive
              ? theme.colors.brand[5]
              : theme.colors.slate[5]
          }
          stroke={1.5}
        />
        <Text
          fw={isActive ? 600 : 400}
          size="sm"
          c={isActive ? theme.colors.brand[7] : theme.colors.slate[6]}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {subItem.label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

