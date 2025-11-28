import { Box, Text, UnstyledButton, useMantineTheme } from "@mantine/core";
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
          padding: `${theme.other.spacing.xs} ${theme.other.spacing.sm}`,
          borderRadius: theme.other.borderRadius.sm,
          transition: theme.other.transitions.fast,
          backgroundColor: isActive ? theme.other.brand.light : "transparent",
          borderLeft: isActive
            ? `3px solid ${theme.other.brand.primary}`
            : "3px solid transparent",
          marginLeft: theme.other.spacing.xs,
          "&:hover": {
            backgroundColor: isActive
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
        <Icon
          size={theme.other.sizes.icon.md}
          color={
            isActive
              ? theme.other.brand.primary
              : theme.other.text.tertiary
          }
          stroke={1.5}
        />
        <Text
          fw={
            isActive
              ? theme.other.typography.fontWeight.semibold
              : theme.other.typography.fontWeight.regular
          }
          size="xs"
          c={
            isActive
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
          {subItem.label}
        </Text>
      </Box>
    </UnstyledButton>
  );
}

