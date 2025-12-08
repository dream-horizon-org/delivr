import {
  Text,
  ActionIcon,
  Badge,
  Menu,
  Box,
  Group,
  Paper,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { 
  IconTrash, 
  IconDots, 
  IconExternalLink, 
  IconChevronRight,
  IconApps,
} from "@tabler/icons-react";

type Organization = {
  id: string;
  orgName: string;
  isAdmin: boolean;
};

type OrgCardProps = {
  org: Organization;
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

// Color themes for org cards based on name hash
const getOrgTheme = (name: string) => {
  const themes = [
    { accent: '#0d9488', light: '#f0fdfa', bg: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' }, // Teal
    { accent: '#3b82f6', light: '#eff6ff', bg: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' }, // Blue
    { accent: '#8b5cf6', light: '#f5f3ff', bg: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)' }, // Violet
    { accent: '#ec4899', light: '#fdf2f8', bg: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)' }, // Pink
    { accent: '#f59e0b', light: '#fffbeb', bg: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' }, // Amber
    { accent: '#06b6d4', light: '#ecfeff', bg: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' }, // Cyan
    { accent: '#10b981', light: '#ecfdf5', bg: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }, // Emerald
    { accent: '#6366f1', light: '#eef2ff', bg: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }, // Indigo
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return themes[hash % themes.length];
};

export function OrgCard({ org, onNavigate, onDelete }: OrgCardProps) {
  const theme = useMantineTheme();
  const initials = getInitials(org.orgName);
  const orgTheme = getOrgTheme(org.orgName);
  
  const borderColor = theme.colors?.slate?.[2] || '#e2e8f0';
  
  return (
    <Paper
      radius="md"
      style={{
        cursor: "pointer",
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: '#fff',
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
      }}
      styles={{
        root: {
          "&:hover": {
            borderColor: orgTheme.accent,
            transform: 'translateY(-4px)',
            boxShadow: `0 16px 32px -8px rgba(0, 0, 0, 0.12)`,
          },
          "&:hover .chevron-icon": {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
      }}
      onClick={onNavigate}
    >
      {/* Gradient Header with Avatar */}
      <Box
        style={{
          background: orgTheme.bg,
          padding: '20px',
          position: 'relative',
        }}
      >
        <Group justify="space-between" align="flex-start">
          {/* Avatar */}
          <Box
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            {initials}
          </Box>

          {/* Context Menu */}
          {org.isAdmin && (
            <Menu shadow="md" width={180} position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  radius="sm"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  <IconDots size={18} />
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
                  Open Dashboard
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
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Box>
      
      {/* Content */}
      <Box p="lg">
        <Text
          fw={600}
          size="lg"
          c="dark.9"
          mb={6}
          lineClamp={1}
          style={{ letterSpacing: '-0.01em' }}
        >
          {org.orgName}
        </Text>
        
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Badge
              size="sm"
              variant="light"
              radius="sm"
              color={org.isAdmin ? "teal" : "gray"}
              style={{ fontWeight: 600 }}
            >
              {org.isAdmin ? 'Owner' : 'Member'}
            </Badge>
            <Group gap={4} c="dimmed">
              <IconApps size={14} />
              <Text size="xs" fw={500}>Workspace</Text>
            </Group>
          </Group>
          
          <Box 
            className="chevron-icon"
            style={{ 
              color: orgTheme.accent,
              opacity: 0, 
              transform: 'translateX(-6px)', 
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconChevronRight size={18} stroke={2.5} />
          </Box>
        </Group>
      </Box>
    </Paper>
  );
}
