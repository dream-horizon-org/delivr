/**
 * Scope Chip Component
 * Displays OAuth scope or permission chips
 */

import { Badge, useMantineTheme } from '@mantine/core';

interface ScopeChipProps {
  scope: string;
}

export function ScopeChip({ scope }: ScopeChipProps) {
  const theme = useMantineTheme();
  
  return (
    <Badge 
      size="xs" 
      variant="light" 
      color="brand"
      tt="lowercase"
      ff="monospace"
    >
      {scope}
    </Badge>
  );
}
