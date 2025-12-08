import {
  Card,
  Text,
  ActionIcon,
  Badge,
  Menu,
  Box,
  Group,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { IconTrash, IconDots, IconExternalLink, IconAppWindow } from "@tabler/icons-react";
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

export function AppListRow({ app, onNavigate, onDelete }: AppListRowProps) {
  const theme = useMantineTheme();
  const initials = getInitials(app.name);
  
  return (
    <Card
      withBorder
      padding={0}
      radius="md"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        width: "300px",
        borderColor: theme.colors.slate[2],
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
      styles={{
        root: {
          "&:hover": {
            borderColor: theme.colors.brand[5],
            boxShadow: theme.shadows.lg,
            transform: "translateY(-4px)",
          },
        },
      }}
      onClick={onNavigate}
    >
      {/* Header with gradient */}
      <Box
        style={{
          background: `linear-gradient(135deg, ${theme.colors.brand[5]} 0%, ${theme.colors.brand[6]} 100%)`,
          padding: theme.spacing.lg,
          position: "relative",
          height: "120px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Badge
          variant="filled"
          size="sm"
          radius="sm"
          style={{
            textTransform: "uppercase",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.5px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            backdropFilter: "blur(10px)",
          }}
        >
          {app.role}
        </Badge>
        
        {app.isAdmin && (
          <Menu shadow="md" width={150} position="bottom-end">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  color: "#ffffff",
                }}
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
      </Box>

      {/* Icon/Avatar - overlapping the header */}
      <Box
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "-40px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box
          style={{
            width: "80px",
            height: "80px",
            borderRadius: theme.radius.xl,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid #ffffff",
            boxShadow: theme.shadows.lg,
          }}
        >
          <Box
            style={{
              width: "64px",
              height: "64px",
              borderRadius: theme.radius.lg,
              background: theme.colors.brand[0],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              size="xl"
              fw={700}
              style={{
                color: theme.colors.brand[7],
                fontSize: "24px",
              }}
            >
              {initials}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Stack gap="xs" style={{ padding: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        <Text
          ta="center"
          size="lg"
          fw={600}
          lineClamp={2}
          style={{
            color: theme.colors.slate[9],
            minHeight: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {app.name}
        </Text>

        <Group justify="center" gap="xs">
          <Box
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: theme.colors.brand[5],
            }}
          />
          <Text size="xs" c={theme.colors.slate[5]} fw={500}>
            Active
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

