import {
  Text,
  ActionIcon,
  Badge,
  Menu,
  Box,
  Group,
  Paper,
  useMantineTheme,
} from "@mantine/core";
import { 
  IconTrash, 
  IconDots, 
  IconExternalLink, 
  IconChevronRight,
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
    { accent: '#0d9488', light: '#f0fdfa', gradient: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)' }, // Teal
    { accent: '#3b82f6', light: '#eff6ff', gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }, // Blue
    { accent: '#8b5cf6', light: '#f5f3ff', gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }, // Violet
    { accent: '#ec4899', light: '#fdf2f8', gradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)' }, // Pink
    { accent: '#f59e0b', light: '#fffbeb', gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }, // Amber
    { accent: '#06b6d4', light: '#ecfeff', gradient: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)' }, // Cyan
    { accent: '#10b981', light: '#ecfdf5', gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }, // Emerald
    { accent: '#6366f1', light: '#eef2ff', gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' }, // Indigo
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
            boxShadow: `0 12px 24px -8px rgba(0, 0, 0, 0.1), 0 0 0 1px ${orgTheme.accent}30`,
          },
          "&:hover .card-header": {
            opacity: 1,
          },
          "&:hover .chevron-icon": {
            opacity: 1,
            transform: 'translateX(0)',
          },
        },
      }}
      onClick={onNavigate}
    >
      {/* Colored Header Bar */}
      <Box
        className="card-header"
        style={{
          height: 4,
          background: orgTheme.accent,
          transition: 'opacity 0.2s ease',
          opacity: 0.6,
        }}
      />
      
      <Box p="md">
        {/* Main Content - Avatar + Info side by side */}
        <Group gap="md" align="flex-start" wrap="nowrap">
          {/* Avatar */}
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: orgTheme.gradient,
              border: `1px solid ${orgTheme.accent}25`,
              color: orgTheme.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: '16px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </Box>

          {/* Info */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
              <Text
                fw={600}
                size="md"
                c="dark.9"
                truncate
                style={{ 
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                  flex: 1,
                }}
              >
                {org.orgName}
              </Text>
              
              {/* Context Menu */}
              {org.isAdmin && (
                <Menu shadow="md" width={180} position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      radius="sm"
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
            
            {/* Role + Action hint */}
            <Group justify="space-between" align="center" mt={8}>
              <Badge
                size="xs"
                variant="light"
                radius="sm"
                style={{ 
                  fontWeight: 600,
                  background: org.isAdmin ? orgTheme.light : undefined,
                  color: org.isAdmin ? orgTheme.accent : undefined,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {org.isAdmin ? 'Owner' : 'Member'}
              </Badge>
              
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
                <IconChevronRight size={16} stroke={2.5} />
              </Box>
            </Group>
          </Box>
        </Group>
      </Box>
    </Paper>
  );
}
