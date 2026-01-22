/**
 * Page Header Component
 * Reusable header component for all pages with consistent styling
 * Matches the Create Workflow page design
 */

import { memo, type ReactNode } from 'react';
import { Box, Group, Text, ThemeIcon, useMantineTheme } from '@mantine/core';

export interface PageHeaderProps {
  /** Page title */
  title: string;
  
  /** Page description */
  description?: string;
  
  /** Optional icon to display next to title */
  icon?: React.ComponentType<any>;
  
  /** Optional icon size (default: 20) */
  iconSize?: number;
  
  /** Optional icon color variant (default: 'brand') */
  iconColor?: string;
  
  /** Optional right section (e.g., action buttons) */
  rightSection?: ReactNode;
  
  /** Optional bottom margin (default: 32) */
  mb?: number | string;
  
  /** Optional max width for description */
  descriptionMaxWidth?: number | string;
}

export const PageHeader = memo(function PageHeader({
  title,
  description,
  icon: Icon,
  iconSize = 20,
  iconColor = 'brand',
  rightSection,
  mb = 24,
  descriptionMaxWidth,
}: PageHeaderProps) {
  const theme = useMantineTheme();

  return (
    <Group justify="space-between" align="flex-start" mb={mb}>
      <Group gap="sm" mb={description ? 8 : 0}>
        {Icon && (
            <ThemeIcon size={48} radius="md" variant="light" color={iconColor}>
              <Icon size={iconSize} />
            </ThemeIcon>
        )}
        <Box mb={description ? 8 : 0}>
          
          <Text size="xl" fw={700} c={theme.colors.slate[9]}>
            {title}
          </Text>
          {description && (
          <Text 
            size="sm" 
            c={theme.colors.slate[5]}
            style={descriptionMaxWidth ? { maxWidth: descriptionMaxWidth } : undefined}
          >
            {description}
          </Text>
        )}
        </Box>
        
      </Group>
      {rightSection && (
        <Box style={{ flexShrink: 0 }}>
          {rightSection}
        </Box>
      )}
    </Group>
  );
});

