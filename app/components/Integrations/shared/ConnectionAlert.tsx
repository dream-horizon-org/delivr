/**
 * Connection Alert Component
 * Reusable alert component for connection flows
 */

import { Alert, useMantineTheme } from '@mantine/core';
import type { MantineColor } from '@mantine/core';
import { IconCheck, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

interface ConnectionAlertProps {
  color: MantineColor;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function ConnectionAlert({ 
  color, 
  title, 
  icon, 
  children 
}: ConnectionAlertProps) {
  const theme = useMantineTheme();
  
  // Default icons based on color
  const getDefaultIcon = () => {
    switch (color) {
      case 'green':
        return <IconCheck size={18} />;
      case 'red':
      case 'yellow':
        return <IconAlertTriangle size={18} />;
      default:
        return <IconInfoCircle size={18} />;
    }
  };

  return (
    <Alert 
      color={color} 
      title={title} 
      icon={icon || getDefaultIcon()}
      variant="light"
      radius="md"
    >
      {children}
    </Alert>
  );
}
