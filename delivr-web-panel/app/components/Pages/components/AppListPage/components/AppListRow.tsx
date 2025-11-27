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
      radius="lg"
      style={{
        cursor: "pointer",
        transition: theme.other.transitions.normal,
        width: theme.other.sizes.card?.width || "300px",
        borderColor: theme.other.borders.primary,
        backgroundColor: theme.other.backgrounds.primary,
        overflow: "hidden",
      }}
      styles={{
        root: {
          "&:hover": {
            borderColor: theme.other.brand.primary,
            boxShadow: theme.other.shadows.lg,
            transform: "translateY(-4px)",
          },
        },
      }}
      onClick={onNavigate}
    >
      {/* Header with gradient */}
      <Box
        style={{
          background: theme.other.brand.gradient,
          padding: theme.other.spacing.lg,
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
            fontSize: theme.other.typography.fontSize.xs,
            fontWeight: theme.other.typography.fontWeight.semibold,
            letterSpacing: theme.other.typography.letterSpacing.wide,
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            color: theme.other.text.white,
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
                  color: theme.other.text.white,
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
            borderRadius: theme.other.borderRadius.xl,
            background: theme.other.backgrounds.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `4px solid ${theme.other.backgrounds.primary}`,
            boxShadow: theme.other.shadows.lg,
          }}
        >
          <Box
            style={{
              width: "64px",
              height: "64px",
              borderRadius: theme.other.borderRadius.lg,
              background: theme.other.brand.light,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              size="xl"
              fw={theme.other.typography.fontWeight.bold}
              style={{
                color: theme.other.brand.primaryDark,
                fontSize: theme.other.typography.fontSize["2xl"],
              }}
            >
              {initials}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Stack gap="xs" style={{ padding: theme.other.spacing.lg, paddingTop: theme.other.spacing.md }}>
        <Text
          ta="center"
          size="lg"
          fw={theme.other.typography.fontWeight.semibold}
          lineClamp={2}
          style={{
            color: theme.other.text.primary,
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
              borderRadius: theme.other.borderRadius.full,
              backgroundColor: theme.other.brand.primary,
            }}
          />
          <Text size="xs" c={theme.other.text.tertiary} fw={theme.other.typography.fontWeight.medium}>
            Active
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

