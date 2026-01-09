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

          // Special handling for Releases list (with trailing slash)
          if (subItem.path === `/dashboard/${org.id}/releases/`) {
            isSubItemActive =
              location.pathname.includes("/releases") &&
              !location.pathname.includes("/releases/settings") &&
              !location.pathname.includes("/releases/configure") &&
              !location.pathname.includes("/releases/workflows") &&
              location.pathname !== `/dashboard/${org.id}/releases`;
          }
          // For Configurations: active on /releases/settings and /releases/configure
          else if (subItem.path === `/dashboard/${org.id}/releases/settings`) {
            isSubItemActive = 
              location.pathname.startsWith(`/dashboard/${org.id}/releases/settings`) ||
              location.pathname.startsWith(`/dashboard/${org.id}/releases/configure`);
          }
          // For Workflows: active on /releases/workflows and /releases/workflows/new
          else if (subItem.path === `/dashboard/${org.id}/releases/workflows`) {
            isSubItemActive = location.pathname.startsWith(subItem.path);
          }
          // For other routes (like distributions, integrations), use startsWith
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

