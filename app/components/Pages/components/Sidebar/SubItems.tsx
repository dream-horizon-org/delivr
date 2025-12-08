import { Box, Stack, useMantineTheme } from "@mantine/core";
import { useLocation } from "@remix-run/react";
import type { SubItem } from "./navigation-data";
import type { Organization } from "./types";
import { SubItem as SubItemComponent } from "./SubItem";

interface SubItemsProps {
  subItems: SubItem[];
  org: Organization;
  moduleMainRoute: string;
}

export function SubItems({ subItems, org, moduleMainRoute }: SubItemsProps) {
  const theme = useMantineTheme();
  const location = useLocation();

  return (
    <Box
      style={{
        marginLeft: 22,
        marginTop: 6,
        marginBottom: 4,
        paddingLeft: 14,
        borderLeft: `2px solid ${theme.colors.slate[2]}`,
      }}
    >
      <Stack gap={4}>
        {subItems.map((subItem) => {
          let isSubItemActive = false;

          // Special handling for Release Dashboard (exact match)
          if (subItem.path === `/dashboard/${org.id}/releases`) {
            isSubItemActive =
              location.pathname === subItem.path ||
              location.pathname.includes("/release-management");
          }
          // Special handling for Releases list (with trailing slash)
          else if (subItem.path === `/dashboard/${org.id}/releases/`) {
            isSubItemActive =
              location.pathname.includes("/releases") &&
              !location.pathname.includes("/releases/setup") &&
              !location.pathname.includes("/releases/settings") &&
              !location.pathname.includes("/releases/configure") &&
              location.pathname !== `/dashboard/${org.id}/releases`;
          }
          // For other routes (like settings, integrations), use startsWith
          else {
            isSubItemActive = location.pathname.startsWith(subItem.path);
          }

          return (
            <SubItemComponent
              key={subItem.path}
              subItem={subItem}
              org={org}
              isActive={isSubItemActive}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

