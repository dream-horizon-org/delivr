import { Box, Text, UnstyledButton, useMantineTheme, Group } from "@mantine/core";
import { Link, useRouteLoaderData } from "@remix-run/react";
import type { SubItem as SubItemType } from "./navigation-data";
import type { Organization } from "./types";
import { usePermissions } from "~/hooks/usePermissions";
import type { OrgLayoutLoaderData } from "~/routes/dashboard.$org";

interface SubItemProps {
  subItem: SubItemType;
  org: Organization;
  isActive: boolean;
}

export function SubItem({ subItem, org, isActive }: SubItemProps) {
  const theme = useMantineTheme();
  const Icon = subItem.icon;

  // Get user data and check permissions
  const orgLayoutData = useRouteLoaderData<OrgLayoutLoaderData>('routes/dashboard.$org');
  const userId = orgLayoutData?.user?.user?.id || '';
  const { isOwner } = usePermissions(org.id, userId);

  // Hide owner-only items if not owner
  // Use permission hook for consistency, fallback to org.isAdmin if hook data not available
  if (subItem.isOwnerOnly && !isOwner && !org.isAdmin) {
    return null;
  }

  return (
    <UnstyledButton
      component={Link}
      to={subItem.path}
      prefetch={subItem.prefetch}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "10px 12px",
        borderRadius: 6,
        transition: "all 0.15s ease",
        backgroundColor: isActive ? theme.colors.brand[0] : "transparent",
        borderLeft: isActive
          ? `2px solid ${theme.colors.brand[5]}`
          : "2px solid transparent",
        marginLeft: -2,
      }}
      styles={{
        root: {
          "&:hover": {
            backgroundColor: isActive
              ? theme.colors.brand[0]
              : theme.colors.slate[1],
          },
        },
      }}
    >
      <Group gap={12}>
        <Icon
          size={16}
          color={isActive ? theme.colors.brand[6] : theme.colors.slate[5]}
          stroke={1.5}
        />
        <Text
          fw={isActive ? 600 : 500}
          size="13px"
          c={isActive ? theme.colors.brand[7] : theme.colors.slate[6]}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            lineHeight: 1.4,
          }}
        >
          {subItem.label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

