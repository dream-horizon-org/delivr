import {
  Paper,
  Text,
  ActionIcon,
  Badge,
  Menu,
  Box,
  Group,
  Divider,
  useMantineTheme,
} from "@mantine/core";
import {
  IconTrash,
  IconDots,
  IconExternalLink,
  IconChevronRight,
  IconAppWindow,
} from "@tabler/icons-react";
import { useState } from "react";
import { AppCardResponse } from "../../AppList/data/getAppListForOrg";

type AppListRowProps = {
  app: AppCardResponse;
  onNavigate: () => void;
  onDelete: () => void;
};

const getInitials = (name: string) => {
  const words = name.trim().split(/[\s-_]+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Function to get a consistent color based on app name
const getAppColor = (appName: string, theme: ReturnType<typeof useMantineTheme>) => {
  const colors = [
    theme.colors.brand[5], // Teal
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#06b6d4", // Cyan
    "#10b981", // Emerald
  ];
  let hash = 0;
  for (let i = 0; i < appName.length; i++) {
    hash = appName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export function AppListRow({ app, onNavigate, onDelete }: AppListRowProps) {
  const theme = useMantineTheme();
  const initials = getInitials(app.name);
  const appColor = getAppColor(app.name, theme);
  const [hovered, setHovered] = useState(false);

  return (
    <Paper
      withBorder
      radius="md"
      shadow="sm"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        backgroundColor: "#ffffff",
        borderColor: hovered ? appColor : theme.colors.slate[2],
        overflow: "hidden",
        position: "relative",
      }}
      styles={{
        root: {
          "&:hover": {
            transform: "translateY(-4px) scale(1.01)",
            boxShadow: theme.shadows.md,
          },
        },
      }}
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Colored Header Bar */}
      <Box
        style={{
          height: 4,
          background: appColor,
          opacity: hovered ? 1 : 0.6,
          transition: "opacity 0.2s ease",
        }}
      />

      <Box p="lg">
        <Group justify="space-between" align="flex-start" mb="md">
          {/* Avatar with gradient */}
          <Box
            style={{
              width: 52,
              height: 52,
              borderRadius: theme.radius.md,
              background: `linear-gradient(135deg, ${appColor} 0%, ${appColor}dd 100%)`,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              boxShadow: theme.shadows.xs,
            }}
          >
            {initials}
          </Box>

          {/* Context Menu */}
          {app.isAdmin && (
            <Menu shadow="md" width={160} position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconExternalLink size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate();
                  }}
                >
                  Open App
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  Delete App
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        <Text fw={600} size="md" c={theme.colors.slate[9]} mb={4} lineClamp={1}>
          {app.name}
        </Text>

        <Badge
          size="sm"
          variant="light"
          color={app.isAdmin ? "brand" : "gray"}
          radius="sm"
          style={{
            textTransform: "uppercase",
            background: app.isAdmin ? theme.colors.brand[0] : theme.colors.slate[1],
            color: app.isAdmin ? theme.colors.brand[7] : theme.colors.slate[6],
          }}
        >
          {app.role}
        </Badge>

        <Divider color={theme.colors.slate[2]} my="md" />

        <Group justify="space-between" align="center">
          <Group gap={4} c={theme.colors.slate[5]}>
            <IconAppWindow size={14} />
            <Text size="xs" fw={500}>
              Application
            </Text>
          </Group>

          <Group
            gap={4}
            c={appColor}
            style={{
              opacity: hovered ? 1 : 0,
              transform: hovered ? "translateX(0)" : "translateX(-10px)",
              transition: "all 0.2s ease",
            }}
          >
            <Text size="sm" fw={600}>
              Open
            </Text>
            <IconChevronRight size={16} />
          </Group>
        </Group>
      </Box>
    </Paper>
  );
}

