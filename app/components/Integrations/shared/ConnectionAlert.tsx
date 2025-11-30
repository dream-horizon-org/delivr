/**
 * Connection Alert Component
 * Reusable alert component for connection flows
 */

import { Alert } from '@mantine/core';
import type { MantineColor } from '@mantine/core';

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
  return (
    <Alert color={color} title={title} icon={icon}>
      {children}
    </Alert>
  );
}



