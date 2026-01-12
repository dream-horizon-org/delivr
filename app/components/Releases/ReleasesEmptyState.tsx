/**
 * Releases Empty State Component
 * Displays a polished empty state when no releases exist in a tab
 */

import { Stack, Text, Box, Button } from '@mantine/core';
import { useMantineTheme } from '@mantine/core';
import { IconRocket } from '@tabler/icons-react';
import { Link } from '@remix-run/react';
import type { TablerIcon } from '@tabler/icons-react';
import { theme as customTheme, colors } from '~/theme/colors';

interface ReleasesEmptyStateProps {
  icon: TablerIcon;
  title: string;
  description: string;
  showCreateButton?: boolean;
  org?: string;
}

export function ReleasesEmptyState({
  icon: Icon,
  title,
  description,
  showCreateButton = false,
  org,
}: ReleasesEmptyStateProps) {
  const theme = useMantineTheme();

  return (
    <Box
      p="xl"
      style={{
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.slate[2]}`,
        backgroundColor: customTheme.backgrounds.paper,
      }}
    >
      <Stack align="center" gap="xl" py={40}>
        {/* Icon with gradient background */}
        <Box
          style={{
            width: 100,
            height: 100,
            borderRadius: theme.radius.xl,
            background: `linear-gradient(135deg, ${colors.brand[0]} 0%, ${colors.brand[1]} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Icon size={48} color={customTheme.brand.primary} stroke={1.5} />
          
          {/* Decorative element */}
          <Box
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 32,
              height: 32,
              borderRadius: theme.radius.md,
              background: customTheme.brand.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${customTheme.brand.primary}40`,
            }}
          >
            <IconRocket size={18} color="white" />
          </Box>
        </Box>

        {/* Text Content */}
        <Stack align="center" gap="xs" maw={400}>
          <Text fw={700} size="xl" c={customTheme.text.heading} ta="center">
            {title}
          </Text>
          <Text size="md" c={customTheme.text.secondary} ta="center" lh={1.6}>
            {description}
          </Text>
        </Stack>

        {/* CTA Button (if applicable) */}
        {showCreateButton && org && (
          <Link to={`/dashboard/${org}/releases/create`}>
            <Button
              leftSection={<IconRocket size={18} />}
              color="brand"
              size="md"
              style={{
                boxShadow: `0 4px 12px ${customTheme.brand.primary}25`,
              }}
            >
              Create Release
            </Button>
          </Link>
        )}
      </Stack>
    </Box>
  );
}
