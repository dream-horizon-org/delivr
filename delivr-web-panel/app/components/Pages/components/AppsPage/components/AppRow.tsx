import {
  Group,
  Text,
  ActionIcon,
  Tooltip,
  Box,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { IconTrash, IconBuilding } from "@tabler/icons-react";

/**
 * App entity (renamed from Organization)
 */
type App = {
  id: string;
  name: string;
  displayName: string;
  isAdmin: boolean;
};

/**
 * Organization type (legacy - kept for backward compatibility)
 * @deprecated Use App instead
 */
type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
};

type AppRowProps = {
  org: App | Organization; // Accept both for backward compatibility (org prop name kept for compatibility)
  onNavigate: () => void;
  onDelete: () => void;
};

export function AppRow({ org, onNavigate, onDelete }: AppRowProps) {
  const theme = useMantineTheme();
  
  return (
    <UnstyledButton
      onClick={onNavigate}
      style={{
        width: "100%",
        padding: `${theme.other.spacing.md} ${theme.other.spacing.lg}`,
        borderRadius: theme.other.borderRadius.md,
        transition: theme.other.transitions.fast,
      }}
      styles={{
        root: {
          "&:hover": {
            backgroundColor: `rgba(${parseInt(theme.other.brand.primary.slice(1, 3), 16)}, ${parseInt(theme.other.brand.primary.slice(3, 5), 16)}, ${parseInt(theme.other.brand.primary.slice(5, 7), 16)}, ${theme.other.opacity.subtle})`,
          },
        },
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" gap="sm">
          <Box
            style={{
              width: theme.other.spacing["3xl"],
              height: theme.other.spacing["3xl"],
              borderRadius: theme.other.borderRadius.md,
              backgroundColor: `rgba(${parseInt(theme.other.brand.primary.slice(1, 3), 16)}, ${parseInt(theme.other.brand.primary.slice(3, 5), 16)}, ${parseInt(theme.other.brand.primary.slice(5, 7), 16)}, 0.1)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconBuilding size={theme.other.sizes.icon.lg} style={{ color: theme.other.brand.primary }} />
          </Box>
          <Text fw={theme.other.typography.fontWeight.medium} size="sm" c={theme.other.text.primary}>
            {'displayName' in org ? org.displayName : ('orgName' in org ? org.orgName : org.id)}
          </Text>
        </Group>

        {org.isAdmin && (
          <Tooltip label="Delete App" position="left">
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </UnstyledButton>
  );
}

